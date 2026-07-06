"""DeleteNpc use case — hard delete under RLS (False -> 404)."""

from app.modules.campaigns.application.errors import CampaignNotFoundError
from app.modules.campaigns.domain.ports import CampaignRepository


class DeleteNpc:
    """Deletes a caller-owned NPC; 404 when the row is not visible."""

    def __init__(self, repository: CampaignRepository) -> None:
        """Initialize with a CampaignRepository (Protocol, never concrete)."""
        self._repository = repository

    def execute(self, npc_id: str) -> None:
        """Delete by id; an RLS miss (no rows deleted) maps to 404."""
        if not self._repository.delete_npc(npc_id):
            raise CampaignNotFoundError()
