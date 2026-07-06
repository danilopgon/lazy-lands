"""UpdateArc use case — partial arc edit (no content_source restamp)."""

from app.modules.campaigns.application.errors import (
    CampaignNotFoundError,
    CampaignPersistenceError,
    CampaignValidationError,
)
from app.modules.campaigns.application.read_models.arc import ArcResponse
from app.modules.campaigns.domain.ports import CampaignRepository
from app.modules.campaigns.infrastructure.errors import RepositoryError


class UpdateArc:
    """Patches a caller-owned arc; 422 on empty patch, 404 on RLS miss.

    Status changes (Resolve/Discard/Reopen in the UI) flow through here as a
    plain ``status`` field — there is no separate status-only write path.
    """

    def __init__(self, repository: CampaignRepository) -> None:
        """Initialize with a CampaignRepository (Protocol, never concrete)."""
        self._repository = repository

    def execute(self, arc_id: str, changes: dict) -> ArcResponse:
        """Apply changes; empty or null-title -> 422, missing row -> 404."""
        # `title` maps to a NOT NULL column: reject an explicit null (422).
        if not changes or changes.get("title", "") is None:
            raise CampaignValidationError()
        try:
            row = self._repository.update_arc(arc_id, changes)
        except RepositoryError as exc:
            raise CampaignPersistenceError(retryable=True) from exc
        if row is None:
            raise CampaignNotFoundError()
        return ArcResponse(**row)
