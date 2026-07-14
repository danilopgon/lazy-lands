"""In-process, per-user limits for cost-bearing AI generation requests."""

from collections import defaultdict, deque
from collections.abc import Callable
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
        self._requests: defaultdict[str, deque[float]] = defaultdict(deque)
        self._lock = Lock()

    def check(self, user_id: str) -> None:
        """Record a request or reject it when its window is full."""
        now = self._clock()
        with self._lock:
            requests = self._requests[user_id]
            while requests and now - requests[0] >= self._window_seconds:
                requests.popleft()
            if len(requests) >= self._limit:
                raise GenerationRateLimitError("generation rate limit exceeded")
            requests.append(now)


_generation_rate_limiter = GenerationRateLimiter(
    settings.ai_generation_rate_limit,
    settings.ai_generation_rate_window_seconds,
)


async def enforce_generation_rate_limit(
    user_id: str = Depends(get_current_user),
) -> None:
    """Apply the configured per-user budget to an AI generation endpoint."""
    _generation_rate_limiter.check(user_id)
