"""GetCampaignDetail use case — compose campaign and child rows."""

from uuid import UUID

from app.modules.campaigns.api.schemas.arc.responses import ArcResponse
from app.modules.campaigns.api.schemas.campaign.responses import CampaignDetailResponse
from app.modules.campaigns.api.schemas.faction.responses import FactionResponse
from app.modules.campaigns.api.schemas.npc.responses import NpcResponse
from app.modules.campaigns.domain.ports import CampaignRepository
from app.modules.campaigns.errors import CampaignNotFoundError


class GetCampaignDetail:
    """Returns one campaign detail or raises the uniform not-found error."""

    def __init__(self, repository: CampaignRepository) -> None:
        """Initialize with a CampaignRepository (Protocol, never concrete)."""
        self._repository = repository

    def execute(self, campaign_id: str) -> CampaignDetailResponse:
        """Fetch a campaign and its NPCs, factions, and arcs."""
        try:
            UUID(campaign_id)
        except ValueError as exc:
            raise CampaignNotFoundError() from exc

        campaign = self._repository.get_campaign(campaign_id)
        if campaign is None:
            raise CampaignNotFoundError()
        npcs, factions, arcs = self._repository.get_campaign_children(campaign_id)
        return CampaignDetailResponse(
            **campaign,
            npcs=[NpcResponse(**npc) for npc in npcs],
            factions=[FactionResponse(**faction) for faction in factions],
            arcs=[ArcResponse(**arc) for arc in arcs],
        )
