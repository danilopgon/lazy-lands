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

from starlette.concurrency import run_in_threadpool

from app.modules.sessions.application.commands.register_session import SuggestsMemories
from app.modules.sessions.application.contracts import MemorySuggestion
from app.modules.sessions.application.errors import SessionNotFoundError
from app.modules.sessions.domain.ports import SessionRepository


class RecoverMemorySuggestions:
    """Re-proposes memory facts for a persisted session without writing to it."""

    def __init__(
        self, repository: SessionRepository, suggest: SuggestsMemories
    ) -> None:
        """Initialize with the session repository and the suggest collaborator."""
        self._repository = repository
        self._suggest = suggest

    async def execute(self, session_id: str) -> list[MemorySuggestion]:
        """Return 0-5 freshly proposed, validated suggestions for the session.

        Args:
            session_id: The persisted session to re-propose memories for.

        Returns:
            0-5 transient ``MemorySuggestion`` proposals — never persisted. An
            empty list means the Scribe proposed nothing, not that it failed.

        Raises:
            SessionNotFoundError: Forged/foreign/unknown ``session_id``.
            LlmOutputValidationError: The proposal could not be validated.
            ProviderRateLimitError: The upstream provider refused the call.
        """
        row = await run_in_threadpool(self._repository.get_session, session_id)
        if row is None:
            raise SessionNotFoundError()

        return await self._suggest.execute(row["campaign_id"], row)
