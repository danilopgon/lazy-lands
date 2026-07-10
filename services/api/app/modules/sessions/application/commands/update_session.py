"""UpdateSessionUseCase — full-object generated-content PATCH."""

from dataclasses import dataclass
from typing import Any

from app.modules.sessions.application.errors import (
    SessionNotFoundError,
    SessionPersistenceError,
)
from app.modules.sessions.application.read_models.session_detail import (
    SessionDetailResponse,
)
from app.modules.sessions.domain.ports import SessionRepository
from app.modules.sessions.infrastructure.errors import RepositoryError


@dataclass(frozen=True)
class UpdateSessionCommand:
    """Supported mutable fields for session detail editing."""

    generated_content: dict[str, Any] | None = None
    summary: str | None = None
    consequences: str | None = None
    provided_fields: set[str] | None = None

    def changes(self) -> dict[str, Any]:
        """Return fields explicitly provided by the caller use-case boundary."""
        data: dict[str, Any] = {}
        provided = self.provided_fields or {
            key
            for key, value in {
                "generated_content": self.generated_content,
                "summary": self.summary,
                "consequences": self.consequences,
            }.items()
            if value is not None
        }
        if "generated_content" in provided:
            data["generated_content"] = self.generated_content
        if "summary" in provided:
            data["summary"] = self.summary
        if "consequences" in provided:
            data["consequences"] = self.consequences
        return data


class UpdateSessionUseCase:
    """Patch a caller-owned session through the RLS-scoped repository."""

    def __init__(self, repository: SessionRepository) -> None:
        """Initialize with the session repository port."""
        self._repository = repository

    def execute(
        self, session_id: str, command: UpdateSessionCommand
    ) -> SessionDetailResponse:
        """Persist partial session detail changes atomically."""
        if self._repository.get_session(session_id) is None:
            raise SessionNotFoundError()
        changes = command.changes()
        try:
            row = self._repository.update_session(session_id, changes)
        except RepositoryError as exc:
            raise SessionPersistenceError(retryable=True) from exc
        return SessionDetailResponse(**row)
