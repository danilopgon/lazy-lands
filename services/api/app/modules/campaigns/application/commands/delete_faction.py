"""DeleteFaction use case — hard delete under RLS (False -> 404)."""

from app.modules.campaigns.application.errors import CampaignNotFoundError
from app.modules.campaigns.domain.ports import CampaignRepository


class DeleteFaction:
    """Deletes a caller-owned faction; 404 when the row is not visible."""

    def __init__(self, repository: CampaignRepository) -> None:
        """Initialize with a CampaignRepository (Protocol, never concrete)."""
        self._repository = repository

    def execute(self, faction_id: str) -> None:
        """Delete by id; an RLS miss (no rows deleted) maps to 404."""
        if not self._repository.delete_faction(faction_id):
            raise CampaignNotFoundError()
