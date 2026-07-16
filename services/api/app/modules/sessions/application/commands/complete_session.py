"""CompleteSession use case — records the played outcome onto an existing session.

The sibling of ``RegisterSession`` for sessions the Scribe already generated:
that row already exists (holding ``generated_content`` and the proposed
synopsis), so completing it UPDATES it rather than inserting a second one.
``session_number`` is therefore never reassigned, and ``generated_content``
is never touched — ``get_session``, ``regenerate-section`` and ``export.pdf``
keep reading it.

Ordering mirrors RegisterSession's persistence-first contract: existence
pre-check -> update session -> summarize -> suggest -> return. Only the update
may surface an error; everything after it (including the campaign fetch that
``SummarizeCampaign`` needs) degrades to an unchanged summary / empty
suggestions, because the outcome is already durably recorded by then.
"""

import logging
from dataclasses import dataclass

from starlette.concurrency import run_in_threadpool

from app.modules.sessions.application.commands.register_session import (
    SuggestsMemories,
    SummarizesCampaign,
)
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
class CompleteSessionCommand:
    """Input for the CompleteSession command — decoupled from any HTTP DTO."""

    summary: str
    consequences: str | None = None


class CompleteSession:
    """Records what actually happened onto an already-persisted session row."""

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
        self, session_id: str, command: CompleteSessionCommand
    ) -> RegisterSessionResponse:
        """Complete a session and return it with its (possibly empty) suggestions.

        Args:
            session_id: The session to complete (validated by RLS + this
                pre-check; its ``session_number`` is preserved as-is).
            command: The DM-authored account of the played session.

        Returns:
            The completed session's id/number plus 0-5 memory suggestions.

        Raises:
            SessionNotFoundError: Forged/foreign/unknown ``session_id``.
            SessionPersistenceError: The session update itself failed.
        """
        existing = await run_in_threadpool(self._repository.get_session, session_id)
        if existing is None:
            raise SessionNotFoundError()

        try:
            session = await run_in_threadpool(
                self._repository.update_session,
                session_id,
                {"summary": command.summary, "consequences": command.consequences},
            )
        except RepositoryError as exc:
            raise SessionPersistenceError(retryable=True) from exc

        campaign_id = existing["campaign_id"]

        try:
            campaign = await run_in_threadpool(
                self._repository.get_campaign, campaign_id
            )
            if campaign is not None:
                await self._summarize.execute(campaign, session)
        except Exception as exc:
            logger.error(
                "Summarize failed after session update "
                "campaign_id=%s session_id=%s error_type=%s",
                campaign_id,
                session_id,
                type(exc).__name__,
            )

        suggestions: list[MemorySuggestion] = []
        try:
            suggestions = await self._suggest.execute(campaign_id, session)
        except Exception as exc:
            logger.error(
                "Suggest failed after session update "
                "campaign_id=%s session_id=%s error_type=%s",
                campaign_id,
                session_id,
                type(exc).__name__,
            )

        return RegisterSessionResponse(
            session_id=session["id"],
            session_number=session["session_number"],
            memory_suggestions=suggestions,
        )
