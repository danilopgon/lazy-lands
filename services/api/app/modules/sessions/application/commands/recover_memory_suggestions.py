"""RecoverMemorySuggestions use case — DM-triggered, read-only re-proposal.

Regenerates memory proposals for an ALREADY-PERSISTED session, for when the
original suggestion stage degraded to an empty list after the session was
written. Strictly read-only: it never touches the session row.

Error semantics deliberately diverge from ``RegisterSession`` /
``CompleteSession``. Those swallow a generation failure because a completed
write must not be reported as a failure, which makes an intentionally empty
proposal set indistinguishable from a failed one. Recovery has no write to
protect, so failures propagate to the existing global handlers
(``LlmOutputValidationError`` -> 422, ``ProviderRateLimitError`` -> 429) and an
empty list means the Scribe genuinely proposed nothing.
"""

from typing import Protocol

from starlette.concurrency import run_in_threadpool

from app.modules.sessions.application.commands.register_session import SuggestsMemories
from app.modules.sessions.application.contracts import MemorySuggestion
from app.modules.sessions.application.errors import (
    SessionNotFoundError,
    SessionNotPlayedError,
)
from app.modules.sessions.domain.ports import SessionRepository


class ChargesGenerationBudget(Protocol):
    """Structural contract for the caller's metered generation budget."""

    def charge(self) -> None:
        """Consume one generation, raising when the caller's budget is spent."""
        ...


class RecoverMemorySuggestions:
    """Re-proposes memory facts for a persisted session without writing to it."""

    def __init__(
        self,
        repository: SessionRepository,
        suggest: SuggestsMemories,
        budget: ChargesGenerationBudget,
    ) -> None:
        """Initialize with the repository, the suggest collaborator, and budget."""
        self._repository = repository
        self._suggest = suggest
        self._budget = budget

    async def execute(self, session_id: str) -> list[MemorySuggestion]:
        """Return 0-5 freshly proposed, validated suggestions for the session.

        Args:
            session_id: The persisted session to re-propose memories for.

        Returns:
            0-5 transient ``MemorySuggestion`` proposals — never persisted. An
            empty list means the Scribe proposed nothing, not that it failed.

        Raises:
            SessionNotFoundError: Forged/foreign/unknown ``session_id``.
            SessionNotPlayedError: The session was never played, so it carries
                a planned synopsis rather than an account of what happened.
            GenerationRateLimitError: The caller's generation budget is spent.
            LlmOutputValidationError: The proposal could not be validated.
            ProviderRateLimitError: The upstream provider refused the call.
        """
        row = await run_in_threadpool(self._repository.get_session, session_id)
        if row is None:
            raise SessionNotFoundError()

        if row.get("status") != "registered":
            raise SessionNotPlayedError()

        # Charged here, not as a route dependency: an ineligible request never
        # reaches the Scribe, so billing it would spend the DM's budget on a
        # 404/409 and then answer the retry with a misleading 429.
        self._budget.charge()

        return await self._suggest.execute(row["campaign_id"], row)
