"""Fallback provider with automatic health-based failover.

Wraps multiple LlmProvider instances and tries them in priority order.
When a provider fails with a transient error (rate limit, connection loss,
timeout), it is marked unhealthy for a configurable cooldown period and
the next provider is tried. Non-transient errors propagate immediately.
"""

from __future__ import annotations

import json
import logging
import time
from collections.abc import Callable
from typing import Any, TypeVar

import httpx
from pydantic import BaseModel

from app.shared.llm.port import LlmProvider

logger = logging.getLogger(__name__)

_R = TypeVar("_R")

# HTTP status codes that signal a transient provider issue.
_TRANSIENT_STATUSES: frozenset[int] = frozenset({429, 500, 502, 503, 504})

# httpx exceptions that indicate a transient network or infrastructure problem.
_TRANSIENT_EXCEPTIONS: tuple[type[Exception], ...] = (
    httpx.TimeoutException,
    httpx.ConnectError,
    httpx.RemoteProtocolError,
    httpx.ReadError,
    httpx.WriteError,
    httpx.PoolTimeout,
)


class AllProvidersExhaustedError(Exception):
    """Raised when every provider in the chain has failed.

    Attributes:
        errors: The exceptions collected from each provider attempt, in order.
    """

    def __init__(self, errors: list[Exception]) -> None:
        """Store the collected errors and build a diagnostic message."""
        self.errors = errors
        detail = "; ".join(str(e) for e in errors[-3:])
        super().__init__(
            f"All {len(errors)} provider(s) exhausted. Last errors: {detail}"
        )


def _is_transient(exc: Exception) -> bool:
    """Return True when *exc* is safe to retry with a different provider.

    Covers:
    * HTTP 429 / 5xx from the upstream API.
    * Network-level failures (timeout, connection refused, read/write errors).
    * httpx.DecodingError — the server responded but the body was unparseable
      (treated as a transient infrastructure hiccup, not a permanent auth/config
      problem).
    * json.JSONDecodeError — HTTP 200 with a malformed or truncated JSON body
      (the upstream responded successfully but the payload was unparseable;
      another provider may return valid JSON).
    """
    if isinstance(exc, httpx.HTTPStatusError):
        return exc.response.status_code in _TRANSIENT_STATUSES
    if isinstance(exc, _TRANSIENT_EXCEPTIONS):
        return True
    if isinstance(exc, httpx.DecodingError):
        return True
    if isinstance(exc, json.JSONDecodeError):
        return True
    return False


class FallbackLlmProvider:
    """LlmProvider that delegates to a chain of providers with health-aware failover.

    On every ``complete_text`` / ``complete_json`` call the providers are tried
    left-to-right.  Providers that are currently in their cooldown window are
    skipped.  The first successful result is returned; if all fail, an
    ``AllProvidersExhaustedError`` is raised.

    Non-transient errors (e.g. HTTP 401, 403, 400) are NOT caught by the
    fallback — they propagate immediately so misconfigured credentials or bad
    requests are surfaced without wasting other providers.

    Usage::

        fallback = FallbackLlmProvider([gemini, groq, mistral])
        text = await fallback.complete_text("Hello")
    """

    def __init__(
        self,
        providers: list[LlmProvider],
        cooldown_seconds: float = 30.0,
    ) -> None:
        """Initialise with an ordered provider list and optional cooldown.

        Args:
            providers: Non-empty list of LlmProvider instances.  Providers are
                tried in the given order.
            cooldown_seconds: How long (in seconds) a provider that fails with
                a transient error is excluded from future attempts.
        """
        if not providers:
            raise ValueError("FallbackLlmProvider requires at least one provider")
        self._providers = providers
        self._cooldown = cooldown_seconds
        # Monotonic timestamps when each provider's cooldown expires.
        self._unhealthy_until: list[float] = [0.0] * len(providers)
        # Human-readable name for each slot (set by the registry).
        self._names: list[str] = [
            getattr(p, "provider_name", f"provider-{i}")
            for i, p in enumerate(providers)
        ]

    # ------------------------------------------------------------------
    # LlmProvider protocol
    # ------------------------------------------------------------------

    async def complete_text(self, prompt: str) -> str:
        """Return a text completion, trying each healthy provider in order."""
        return await self._try_all(
            lambda p: p.complete_text(prompt),
            "complete_text",
        )

    async def complete_json[T: BaseModel](self, prompt: str, schema: type[T]) -> T:
        """Return a typed completion, trying each healthy provider in order."""
        return await self._try_all(
            lambda p: p.complete_json(prompt, schema),
            "complete_json",
        )

    # ------------------------------------------------------------------
    # Internal
    # ------------------------------------------------------------------

    async def _try_all(
        self,
        operation: Callable[[LlmProvider], Any],
        op_name: str,
    ) -> _R:
        """Execute *operation* on each healthy provider until one succeeds.

        Args:
            operation: An async callable that accepts an LlmProvider.
            op_name: Label for log messages (e.g. "complete_text").

        Returns:
            The first successful result.

        Raises:
            AllProvidersExhaustedError: When every provider fails with a
                transient error.
            Exception: Any non-transient exception is re-raised immediately.
        """
        now = time.monotonic()
        errors: list[Exception] = []

        for i, provider in enumerate(self._providers):
            if now < self._unhealthy_until[i]:
                logger.debug(
                    "Skipping unhealthy provider %r (cooldown %ds remaining)",
                    self._names[i],
                    int(self._unhealthy_until[i] - now),
                )
                continue

            try:
                result = await operation(provider)
            except Exception as exc:
                if _is_transient(exc):
                    self._unhealthy_until[i] = now + self._cooldown
                    remaining = len(self._providers) - (i + 1)
                    logger.warning(
                        "Provider %r failed (%s) — %s. "
                        "Cooldown %ds, %d provider(s) remaining.",
                        self._names[i],
                        type(exc).__name__,
                        str(exc)[:200],
                        int(self._cooldown),
                        max(0, remaining),
                    )
                    errors.append(exc)
                    continue
                # Non-transient — surface immediately.
                raise

            # Success.
            self._unhealthy_until[i] = 0.0
            if errors:
                logger.info(
                    "%r succeeded via provider %r after %d failure(s).",
                    op_name,
                    self._names[i],
                    len(errors),
                )
            return result

        raise AllProvidersExhaustedError(errors)
