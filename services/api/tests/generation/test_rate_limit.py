"""Tests for per-user AI generation rate limiting."""

import pytest

from app.shared.generation_rate_limit import GenerationRateLimiter


def test_rate_limiter_blocks_the_next_request_in_its_window() -> None:
    limiter = GenerationRateLimiter(limit=2, window_seconds=60, clock=lambda: 100.0)

    limiter.check("user-1")
    limiter.check("user-1")

    with pytest.raises(Exception, match="rate limit"):
        limiter.check("user-1")


def test_rate_limiter_is_scoped_to_each_user_and_expires_old_requests() -> None:
    now = [100.0]
    limiter = GenerationRateLimiter(limit=1, window_seconds=60, clock=lambda: now[0])

    limiter.check("user-1")
    limiter.check("user-2")
    now[0] = 160.0
    limiter.check("user-1")
