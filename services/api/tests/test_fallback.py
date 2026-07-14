"""Unit tests for FallbackLlmProvider failover and health tracking."""

import json
import logging
import time

import httpx
import pytest

from app.shared.llm.errors import ProviderRateLimitError
from app.shared.llm.providers.fallback import (
    AllProvidersExhaustedError,
    FallbackLlmProvider,
    _is_transient,
)

# ---------------------------------------------------------------------------
# Stub provider for controlled failover scenarios
# ---------------------------------------------------------------------------


class _StubProvider:
    """Minimal LlmProvider stub for testing FallbackLlmProvider."""

    def __init__(self, name: str = "") -> None:
        self.provider_name = name
        self._text_calls: list[str] = []
        self._next_text: str | Exception = "ok"
        self._next_json: object | Exception = {"ok": True}

    async def complete_text(self, prompt: str) -> str:
        self._text_calls.append(prompt)
        if isinstance(self._next_text, Exception):
            raise self._next_text
        return self._next_text

    async def complete_json(self, prompt: str, schema: type) -> object:
        _ = prompt, schema
        if isinstance(self._next_json, Exception):
            raise self._next_json
        return self._next_json  # type: ignore[no-any-return]


# ---------------------------------------------------------------------------
# _is_transient
# ---------------------------------------------------------------------------


def test_transient_429() -> None:
    resp = httpx.Response(429, request=httpx.Request("POST", "https://x"))
    assert _is_transient(httpx.HTTPStatusError("", request=resp.request, response=resp))


def test_transient_503() -> None:
    resp = httpx.Response(503, request=httpx.Request("POST", "https://x"))
    assert _is_transient(httpx.HTTPStatusError("", request=resp.request, response=resp))


def test_transient_provider_rate_limit_error() -> None:
    assert _is_transient(ProviderRateLimitError("provider rate limit exceeded"))


def test_transient_connect_error() -> None:
    assert _is_transient(httpx.ConnectError("refused"))


def test_transient_timeout() -> None:
    assert _is_transient(httpx.TimeoutException("timed out"))


def test_transient_decoding_error() -> None:
    assert _is_transient(httpx.DecodingError("bad json"))


def test_transient_json_decode_error() -> None:
    """HTTP 200 with malformed JSON — should be treated as transient
    so the fallback chain can try the next provider (Codex P2)."""
    with pytest.raises(json.JSONDecodeError) as exc_info:
        json.loads("{invalid")
    assert _is_transient(exc_info.value)


def test_transient_retryable_output_validation_error() -> None:
    """complete_json wraps malformed JSON in LlmOutputValidationError; a
    retryable one must allow the fallback chain to try the next provider."""
    from app.shared.llm.errors import LlmOutputValidationError

    assert _is_transient(LlmOutputValidationError("Schema", "{bad", retryable=True))
    assert not _is_transient(
        LlmOutputValidationError("Schema", "{bad", retryable=False)
    )


def test_not_transient_401() -> None:
    resp = httpx.Response(401, request=httpx.Request("POST", "https://x"))
    assert not _is_transient(
        httpx.HTTPStatusError("", request=resp.request, response=resp)
    )


def test_not_transient_403() -> None:
    resp = httpx.Response(403, request=httpx.Request("POST", "https://x"))
    assert not _is_transient(
        httpx.HTTPStatusError("", request=resp.request, response=resp)
    )


def test_not_transient_value_error() -> None:
    assert not _is_transient(ValueError("not HTTP-related"))


# ---------------------------------------------------------------------------
# FallbackLlmProvider behaviour
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_single_success_fast_path() -> None:
    p = _StubProvider("a")
    fb = FallbackLlmProvider([p])
    result = await fb.complete_text("hi")
    assert result == "ok"
    assert len(p._text_calls) == 1


@pytest.mark.asyncio
async def test_first_succeeds_second_never_tried() -> None:
    a = _StubProvider("a")
    b = _StubProvider("b")
    fb = FallbackLlmProvider([a, b])
    result = await fb.complete_text("hi")
    assert result == "ok"
    assert len(a._text_calls) == 1
    assert len(b._text_calls) == 0


@pytest.mark.asyncio
async def test_first_fails_transient_second_succeeds() -> None:
    a = _StubProvider("a")
    a._next_text = httpx.HTTPStatusError(
        "rate limited",
        request=httpx.Request("POST", "https://x"),
        response=httpx.Response(429, request=httpx.Request("POST", "https://x")),
    )
    b = _StubProvider("b")
    fb = FallbackLlmProvider([a, b])
    result = await fb.complete_text("hi")
    assert result == "ok"
    assert len(b._text_calls) == 1


@pytest.mark.asyncio
async def test_primary_provider_rate_limit_attempts_fallback() -> None:
    primary = _StubProvider("primary")
    primary._next_text = ProviderRateLimitError("provider rate limit exceeded")
    fallback = _StubProvider("fallback")

    result = await FallbackLlmProvider([primary, fallback]).complete_text("hi")

    assert result == "ok"
    assert primary._text_calls == ["hi"]
    assert fallback._text_calls == ["hi"]


@pytest.mark.asyncio
async def test_all_fail_raises_all_providers_exhausted() -> None:
    a = _StubProvider("a")
    a._next_text = httpx.ConnectError("boom")
    b = _StubProvider("b")
    b._next_text = httpx.TimeoutException("boom")
    fb = FallbackLlmProvider([a, b])
    with pytest.raises(AllProvidersExhaustedError) as exc_info:
        await fb.complete_text("hi")
    assert len(exc_info.value.errors) == 2


@pytest.mark.asyncio
async def test_non_transient_propagates_immediately() -> None:
    a = _StubProvider("a")
    a._next_text = httpx.HTTPStatusError(
        "unauthorized",
        request=httpx.Request("POST", "https://x"),
        response=httpx.Response(401, request=httpx.Request("POST", "https://x")),
    )
    b = _StubProvider("b")
    fb = FallbackLlmProvider([a, b])
    with pytest.raises(httpx.HTTPStatusError):
        await fb.complete_text("hi")
    # Second provider was never touched.
    assert len(b._text_calls) == 0


@pytest.mark.asyncio
async def test_unhealthy_provider_skipped_within_cooldown() -> None:
    """After a transient failure, the provider is skipped on the next call."""
    a = _StubProvider("a")
    a._next_text = httpx.ConnectError("boom")
    b = _StubProvider("b")
    fb = FallbackLlmProvider([a, b], cooldown_seconds=60.0)
    # First call — a fails, b succeeds
    r1 = await fb.complete_text("hi")
    assert r1 == "ok"
    assert len(b._text_calls) == 1

    # Second call — a should be skipped (still in cooldown), b used again
    r2 = await fb.complete_text("hi")
    assert r2 == "ok"
    assert len(b._text_calls) == 2
    assert len(a._text_calls) == 1  # a was only tried once


@pytest.mark.asyncio
async def test_provider_failure_log_omits_upstream_error_content(
    caplog: pytest.LogCaptureFixture,
) -> None:
    caplog.set_level(logging.WARNING)
    a = _StubProvider("a")
    a._next_text = httpx.ConnectError("upstream-token campaign-content")
    b = _StubProvider("b")

    assert await FallbackLlmProvider([a, b]).complete_text("private prompt") == "ok"
    assert "upstream-token" not in caplog.text
    assert "campaign-content" not in caplog.text


@pytest.mark.asyncio
async def test_provider_recovers_after_cooldown_expires(monkeypatch) -> None:
    """Once the cooldown passes, the provider is tried again."""
    start = 1000.0
    monkeypatch.setattr(time, "monotonic", lambda: start)

    a = _StubProvider("a")
    a._next_text = httpx.ConnectError("boom")
    b = _StubProvider("b")
    fb = FallbackLlmProvider([a, b], cooldown_seconds=5.0)

    # First call — a fails (cooldown until 1005), b succeeds
    await fb.complete_text("hi")
    assert len(b._text_calls) == 1

    # Advance time past cooldown
    monkeypatch.setattr(time, "monotonic", lambda: start + 10.0)

    # Second call — a should be healthy again
    a._next_text = "recovered"
    r2 = await fb.complete_text("hi")
    assert r2 == "recovered"
    assert len(a._text_calls) == 2  # first (failed) + second (succeeded)


@pytest.mark.asyncio
async def test_fallback_with_empty_list_raises() -> None:
    with pytest.raises(ValueError, match="at least one provider"):
        FallbackLlmProvider([])


@pytest.mark.asyncio
async def test_json_decode_error_triggers_fallback() -> None:
    """Codex P2: malformed JSON on HTTP 200 should trigger failover,
    not abort the chain."""
    a = _StubProvider("a")
    a._next_text = json.JSONDecodeError("bad json", "{", 1)
    b = _StubProvider("b")
    fb = FallbackLlmProvider([a, b])
    result = await fb.complete_text("hi")
    assert result == "ok"
    assert len(b._text_calls) == 1


@pytest.mark.asyncio
async def test_all_in_cooldown_raises_clear_error() -> None:
    """When every provider is still in cooldown, no attempt is made and the
    error must explain the cooldown instead of "All 0 provider(s) exhausted"."""
    a = _StubProvider("a")
    a._next_text = httpx.ConnectError("boom")
    b = _StubProvider("b")
    b._next_text = httpx.TimeoutException("boom")
    fb = FallbackLlmProvider([a, b], cooldown_seconds=60.0)

    # First call trips both providers into cooldown.
    with pytest.raises(AllProvidersExhaustedError):
        await fb.complete_text("hi")
    calls_before = len(a._text_calls) + len(b._text_calls)

    # Second call — both still in cooldown, so nothing is attempted.
    with pytest.raises(AllProvidersExhaustedError) as exc_info:
        await fb.complete_text("hi")

    assert exc_info.value.errors  # not empty — clear diagnostics
    assert "cooldown" in str(exc_info.value).lower()
    assert len(a._text_calls) + len(b._text_calls) == calls_before
