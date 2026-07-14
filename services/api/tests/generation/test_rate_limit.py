"""Tests for per-user AI generation rate limiting."""

from collections import deque
from threading import Event, Lock, Thread, current_thread

import pytest

from app.shared.generation_rate_limit import GenerationRateLimiter


class FirstRequestYieldingLock:
    def __init__(self) -> None:
        self.first_request_waiting = Event()
        self.allow_first_request = Event()
        self._lock = Lock()

    def __enter__(self) -> None:
        if current_thread().name == "first-request":
            self.first_request_waiting.set()
            assert self.allow_first_request.wait(timeout=1)
        self._lock.acquire()

    def __exit__(self, *_: object) -> None:
        self._lock.release()


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


def test_rate_limiter_evicts_an_empty_expired_user_window() -> None:
    now = [100.0]
    limiter = GenerationRateLimiter(limit=1, window_seconds=60, clock=lambda: now[0])

    limiter.check("user-1")
    expired_requests = limiter._requests["user-1"]
    now[0] = 160.0

    limiter.check("user-1")

    assert limiter._requests["user-1"] is not expired_requests


def test_rate_limiter_evicts_inactive_users_during_another_users_request() -> None:
    now = [100.0]
    limiter = GenerationRateLimiter(limit=1, window_seconds=60, clock=lambda: now[0])

    limiter.check("inactive-user")
    now[0] = 160.0

    limiter.check("active-user")

    assert "inactive-user" not in limiter._requests
    assert list(limiter._requests["active-user"]) == [160.0]


def test_rate_limiter_keeps_a_user_with_a_stale_expiry_entry() -> None:
    now = [100.0]
    limiter = GenerationRateLimiter(limit=2, window_seconds=60, clock=lambda: now[0])

    limiter.check("renewed-user")
    now[0] = 150.0
    limiter.check("renewed-user")
    now[0] = 160.0

    limiter.check("another-user")

    assert "renewed-user" in limiter._requests
    limiter.check("renewed-user")


def test_rate_limiter_does_not_iterate_all_user_buckets_per_request() -> None:
    class NoMapScanDict(dict[str, deque[float]]):
        def items(self) -> object:
            raise AssertionError("rate-limit cleanup must not scan all users")

    now = [100.0]
    limiter = GenerationRateLimiter(limit=1, window_seconds=60, clock=lambda: now[0])
    limiter.check("inactive-user")
    limiter._requests = NoMapScanDict(limiter._requests)
    now[0] = 160.0

    limiter.check("active-user")

    assert "inactive-user" not in limiter._requests


def test_rate_limiter_reads_the_clock_after_acquiring_the_lock() -> None:
    now = [100.0]
    limiter = GenerationRateLimiter(limit=2, window_seconds=60, clock=lambda: now[0])
    interleaving_lock = FirstRequestYieldingLock()
    limiter._lock = interleaving_lock

    first_request = Thread(
        target=limiter.check,
        args=("user-1",),
        name="first-request",
    )
    first_request.start()
    assert interleaving_lock.first_request_waiting.wait(timeout=1)

    now[0] = 200.0
    later_request = Thread(target=limiter.check, args=("user-1",))
    later_request.start()
    later_request.join(timeout=1)
    assert not later_request.is_alive()

    interleaving_lock.allow_first_request.set()
    first_request.join(timeout=1)
    assert not first_request.is_alive()

    assert list(limiter._requests["user-1"]) == [200.0, 200.0]
