"""GetCampaigns use case — read caller-visible campaign summaries."""

from app.modules.campaigns.api.schemas.campaign.responses import CampaignSummary
from app.modules.campaigns.domain.ports import CampaignRepository


class GetCampaigns:
    """Returns campaign summaries exactly in repository order."""

    def __init__(self, repository: CampaignRepository) -> None:
        """Initialize with a CampaignRepository (Protocol, never concrete)."""
        self._repository = repository

    def execute(self) -> list[CampaignSummary]:
        """List campaigns visible through the injected caller-scoped repository."""
        return [CampaignSummary(**row) for row in self._repository.list_campaigns()]
