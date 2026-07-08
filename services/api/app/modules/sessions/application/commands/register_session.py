"""RegisterSession use case — persistence-first session registration.

Ordering (design Decision 4): ownership pre-check -> server-assigned
``session_number`` -> insert session -> summarize -> suggest -> return. A
summarize/suggest failure after a successful insert degrades to an unchanged
summary / empty suggestions; only an insert failure surfaces an error (the
session is never rolled back once persisted).
"""

import logging
from dataclasses import dataclass
from typing import Protocol

from starlette.concurrency import run_in_threadpool

from app.modules.sessions.application.contracts import (
    MemorySuggestion,
    RegisterSessionResponse,
)
from app.modules.sessions.application.errors import (
    SessionNotFoundError,
    SessionPersistenceError,
)
from app.modules.sessions.domain.ports import SessionRepository
from app.modules.sessions.infrastructure.errors import RepositoryError

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class RegisterSessionCommand:
    """Input for the RegisterSession command — decoupled from any HTTP DTO."""

    summary: str
    consequences: str | None = None


class SummarizesCampaign(Protocol):
    """Structural contract for the summarize collaborator (avoids a cycle)."""

    async def execute(self, campaign: dict, session: dict) -> None:
        """Update the campaign's rolling summary given the new session."""
        ...


class SuggestsMemories(Protocol):
    """Structural contract for the suggest collaborator (avoids a cycle)."""

    async def execute(self, campaign_id: str, session: dict) -> list[MemorySuggestion]:
        """Return 0-5 transient memory suggestions for the new session."""
        ...


class RegisterSession:
    """Persists a session, folds it into the summary, then suggests memories."""

    def __init__(
        self,
        repository: SessionRepository,
        summarize: SummarizesCampaign,
        suggest: SuggestsMemories,
    ) -> None:
        """Initialize with a SessionRepository and the two LLM collaborators."""
        self._repository = repository
        self._summarize = summarize
        self._suggest = suggest

    async def execute(
        self, campaign_id: str, command: RegisterSessionCommand
    ) -> RegisterSessionResponse:
        """Register a session and return it with its (possibly empty) suggestions.

        Args:
            campaign_id: The caller-supplied campaign id (validated by RLS +
                this pre-check; never trusted for numbering).
            command: The DM-authored session payload.

        Returns:
            The persisted session id/number plus 0-5 memory suggestions.

        Raises:
            SessionNotFoundError: Forged/foreign/unknown ``campaign_id``.
            SessionPersistenceError: The session insert itself failed.
        """
        campaign = await run_in_threadpool(self._repository.get_campaign, campaign_id)
        if campaign is None:
            raise SessionNotFoundError()

        # session_number is recomputed and retried internally on a
        # (campaign_id, session_number) conflict (hardening item — concurrent
        # or retried registrations for the same campaign can otherwise race
        # the read-then-insert numbering).
        try:
            session = await run_in_threadpool(
                self._repository.insert_session_with_next_number,
                campaign_id,
                command.summary,
                command.consequences,
            )
        except RepositoryError as exc:
            raise SessionPersistenceError(retryable=True) from exc

        try:
            await self._summarize.execute(campaign, session)
        except Exception:  # noqa: BLE001 - any summarize failure degrades, never re-raises
            logger.exception(
                "Summarize failed after session insert campaign_id=%s session_id=%s",
                campaign_id,
                session["id"],
            )

        suggestions: list[MemorySuggestion] = []
        try:
            suggestions = await self._suggest.execute(campaign_id, session)
        except Exception:  # noqa: BLE001 - any suggest failure degrades to empty
            logger.exception(
                "Suggest failed after session insert campaign_id=%s session_id=%s",
                campaign_id,
                session["id"],
            )

        return RegisterSessionResponse(
            session_id=session["id"],
            session_number=session["session_number"],
            memory_suggestions=suggestions,
        )
