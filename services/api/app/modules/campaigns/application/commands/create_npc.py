"""CreateNpc use case — DM-authored NPC with an ownership pre-check."""

from app.modules.campaigns.application.errors import CampaignNotFoundError
from app.modules.campaigns.application.read_models.npc import NpcResponse
from app.modules.campaigns.domain.ports import CampaignRepository


class CreateNpc:
    """Creates a manual NPC after confirming parent visibility (design 6.4)."""

    def __init__(self, repository: CampaignRepository) -> None:
        """Initialize with a CampaignRepository (Protocol, never concrete)."""
        self._repository = repository

    def execute(self, campaign_id: str, fields: dict) -> NpcResponse:
        """Pre-check parent ownership, then insert with content_source=manual.

        The pre-check (RLS SELECT) makes a forged/non-owned campaign_id a
        deterministic 404 instead of a 500 from the INSERT `with check` 42501
        (design 6.4).
        """
        if self._repository.get_campaign(campaign_id) is None:
            raise CampaignNotFoundError()
        row = self._repository.create_npc(
            {**fields, "campaign_id": campaign_id, "content_source": "manual"}
        )
        return NpcResponse(**row)
