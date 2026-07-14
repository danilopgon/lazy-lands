"""In-process, per-user limits for cost-bearing AI generation requests."""

from collections import deque
from collections.abc import Callable
from heapq import heappop, heappush
from threading import Lock
from time import monotonic

from fastapi import Depends

from app.shared.config import settings
from app.shared.security import get_current_user


class GenerationRateLimitError(Exception):
    """Raised when a user exceeds the configured generation request budget."""


class GenerationRateLimiter:
    """Thread-safe sliding-window limiter with a separate budget per user."""

    def __init__(
        self,
        limit: int,
        window_seconds: int,
        clock: Callable[[], float] = monotonic,
    ) -> None:
        """Initialize a limiter with a request count and rolling window."""
        self._limit = limit
        self._window_seconds = window_seconds
        self._clock = clock
        self._requests: dict[str, deque[float]] = {}
        self._expiry_entries: list[tuple[float, int, str]] = []
        self._generations: dict[str, int] = {}
        self._next_generation = 0
        self._lock = Lock()

    def check(self, user_id: str) -> None:
        """Record a request or reject it when its window is full."""
        with self._lock:
            now = self._clock()
            self._evict_expired_users(now)

            requests = self._requests.get(user_id, deque())
            while requests and now - requests[0] >= self._window_seconds:
                requests.popleft()
            if len(requests) >= self._limit:
                raise GenerationRateLimitError("generation rate limit exceeded")
            requests.append(now)
            self._requests[user_id] = requests
            self._next_generation += 1
            generation = self._next_generation
            self._generations[user_id] = generation
            heappush(
                self._expiry_entries,
                (now + self._window_seconds, generation, user_id),
            )

    def _evict_expired_users(self, now: float) -> None:
        while self._expiry_entries and self._expiry_entries[0][0] <= now:
            _, generation, user_id = heappop(self._expiry_entries)
            if self._generations.get(user_id) == generation:
                self._requests.pop(user_id)
                self._generations.pop(user_id)


_generation_rate_limiter = GenerationRateLimiter(
    settings.ai_generation_rate_limit,
    settings.ai_generation_rate_window_seconds,
)


async def enforce_generation_rate_limit(
    user_id: str = Depends(get_current_user),
) -> None:
    """Apply the configured per-user budget to an AI generation endpoint."""
    _generation_rate_limiter.check(user_id)
