"""GetSessions use case — chronological session history for a campaign."""

from app.modules.sessions.application.errors import SessionNotFoundError
from app.modules.sessions.application.read_models.session import SessionResponse
from app.modules.sessions.domain.ports import SessionRepository


class GetSessions:
    """Returns a caller-owned campaign's sessions, ascending by session number."""

    def __init__(self, repository: SessionRepository) -> None:
        """Initialize with a SessionRepository (Protocol, never concrete)."""
        self._repository = repository

    def execute(self, campaign_id: str) -> list[SessionResponse]:
        """Fetch a campaign's session history (empty list if none exist).

        Raises:
            SessionNotFoundError: Forged/foreign/unknown ``campaign_id``.
        """
        campaign = self._repository.get_campaign(campaign_id)
        if campaign is None:
            raise SessionNotFoundError()
        rows = self._repository.list_sessions(campaign_id)
        return [SessionResponse(**row) for row in rows]
