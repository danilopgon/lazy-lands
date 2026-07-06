"""CreateArc use case — DM-authored arc with an ownership pre-check."""

from app.modules.campaigns.application.errors import CampaignNotFoundError
from app.modules.campaigns.application.read_models.arc import ArcResponse
from app.modules.campaigns.domain.ports import CampaignRepository


class CreateArc:
    """Creates a manual arc after confirming parent visibility (design 6.4)."""

    def __init__(self, repository: CampaignRepository) -> None:
        """Initialize with a CampaignRepository (Protocol, never concrete)."""
        self._repository = repository

    def execute(self, campaign_id: str, fields: dict) -> ArcResponse:
        """Pre-check parent ownership, then insert with content_source=manual.

        Unlike extraction, a manual arc carries priority/status (defaulted by
        the request schema to medium/active) straight through.
        """
        if self._repository.get_campaign(campaign_id) is None:
            raise CampaignNotFoundError()
        row = self._repository.create_arc(
            {**fields, "campaign_id": campaign_id, "content_source": "manual"}
        )
        return ArcResponse(**row)
