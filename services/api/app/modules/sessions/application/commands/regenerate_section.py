"""RegenerateSectionUseCase — pure, no-steering single-section rewrite."""

from dataclasses import dataclass
from typing import Any

from starlette.concurrency import run_in_threadpool

from app.modules.sessions.application.errors import (
    SessionNotFoundError,
    SessionPersistenceError,
    SessionValidationError,
)
from app.modules.sessions.application.read_models.session_detail import (
    SessionDetailResponse,
)
from app.modules.sessions.domain.ports import SectionRegenerator, SessionRepository
from app.modules.sessions.infrastructure.errors import RepositoryError


@dataclass(frozen=True)
class RegenerateSectionCommand:
    """The only input accepted by regeneration — a target section id.

    No steering/direction field exists anywhere on this command by design
    (SR spec): regeneration is a pure rewrite against the same context.
    """

    section_id: str


class RegenerateSectionUseCase:
    """Rewrite one generated-session section via a fresh LLM call.

    Reuses the PATCH ``get_session`` -> ``update_session`` pattern
    (``UpdateSessionUseCase``): ``session_id`` -> ``campaign_id`` already
    comes back from ``SessionRepository.get_session`` (design Decision 1),
    so no new lookup infrastructure is introduced.
    """

    def __init__(
        self, repository: SessionRepository, regenerator: SectionRegenerator
    ) -> None:
        """Initialize with the session repository and the regeneration port."""
        self._repository = repository
        self._regenerator = regenerator

    async def execute(
        self, session_id: str, command: RegenerateSectionCommand
    ) -> SessionDetailResponse:
        """Regenerate one section in place and persist the full draft."""
        row = await run_in_threadpool(self._repository.get_session, session_id)
        if row is None:
            raise SessionNotFoundError()

        generated_content: dict[str, Any] = row.get("generated_content") or {}
        sections: list[dict[str, Any]] = list(generated_content.get("sections") or [])
        if not any(section.get("id") == command.section_id for section in sections):
            raise SessionValidationError(f"Unknown section id: {command.section_id}")

        updated_section = await self._regenerator.regenerate_section(
            row["campaign_id"], command.section_id, sections
        )

        next_sections = [
            updated_section if section.get("id") == command.section_id else section
            for section in sections
        ]
        next_content = {**generated_content, "sections": next_sections}

        try:
            updated_row = await run_in_threadpool(
                self._repository.update_session,
                session_id,
                {
                    "generated_content": next_content,
                    "trace_json": updated_section.get("trace_json"),
                },
            )
        except RepositoryError as exc:
            raise SessionPersistenceError(retryable=True) from exc

        return SessionDetailResponse(**updated_row)
