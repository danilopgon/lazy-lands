"""UpdateFaction use case — partial faction edit (no content_source restamp)."""

from app.modules.campaigns.application.errors import (
    CampaignNotFoundError,
    CampaignValidationError,
)
from app.modules.campaigns.application.read_models.faction import FactionResponse
from app.modules.campaigns.domain.ports import CampaignRepository


class UpdateFaction:
    """Patches a caller-owned faction; 422 on empty patch, 404 on RLS miss."""

    def __init__(self, repository: CampaignRepository) -> None:
        """Initialize with a CampaignRepository (Protocol, never concrete)."""
        self._repository = repository

    def execute(self, faction_id: str, changes: dict) -> FactionResponse:
        """Apply the pre-filtered changes; empty -> 422, missing row -> 404."""
        if not changes:
            raise CampaignValidationError()
        row = self._repository.update_faction(faction_id, changes)
        if row is None:
            raise CampaignNotFoundError()
        return FactionResponse(**row)
