"""Unit tests for FallbackLlmProvider failover and health tracking."""

import time

import httpx
import pytest

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


def test_transient_connect_error() -> None:
    assert _is_transient(httpx.ConnectError("refused"))


def test_transient_timeout() -> None:
    assert _is_transient(httpx.TimeoutException("timed out"))


def test_transient_decoding_error() -> None:
    assert _is_transient(httpx.DecodingError("bad json"))


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
