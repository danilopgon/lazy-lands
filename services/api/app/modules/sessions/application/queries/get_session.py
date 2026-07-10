"""GetSessionUseCase — fetch one generated/editable session."""

from app.modules.sessions.application.errors import SessionNotFoundError
from app.modules.sessions.application.read_models.session_detail import (
    SessionDetailResponse,
)
from app.modules.sessions.domain.ports import SessionRepository


class GetSessionUseCase:
    """Return a caller-visible session detail or a uniform 404."""

    def __init__(self, repository: SessionRepository) -> None:
        """Initialize with the session repository port."""
        self._repository = repository

    def execute(self, session_id: str) -> SessionDetailResponse:
        """Fetch a session by id with generated content and trace metadata."""
        row = self._repository.get_session(session_id)
        if row is None:
            raise SessionNotFoundError()
        return SessionDetailResponse(**row)
