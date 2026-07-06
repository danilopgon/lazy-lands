"""UpdateArc use case — partial arc edit (no content_source restamp)."""

from app.modules.campaigns.application.errors import (
    CampaignNotFoundError,
    CampaignValidationError,
)
from app.modules.campaigns.application.read_models.arc import ArcResponse
from app.modules.campaigns.domain.ports import CampaignRepository


class UpdateArc:
    """Patches a caller-owned arc; 422 on empty patch, 404 on RLS miss.

    Status changes (Resolve/Discard/Reopen in the UI) flow through here as a
    plain ``status`` field — there is no separate status-only write path.
    """

    def __init__(self, repository: CampaignRepository) -> None:
        """Initialize with a CampaignRepository (Protocol, never concrete)."""
        self._repository = repository

    def execute(self, arc_id: str, changes: dict) -> ArcResponse:
        """Apply the pre-filtered changes; empty -> 422, missing row -> 404."""
        if not changes:
            raise CampaignValidationError()
        row = self._repository.update_arc(arc_id, changes)
        if row is None:
            raise CampaignNotFoundError()
        return ArcResponse(**row)
