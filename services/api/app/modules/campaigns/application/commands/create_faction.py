"""CreateFaction use case — DM-authored faction with an ownership pre-check."""

from app.modules.campaigns.application.errors import (
    CampaignNotFoundError,
    CampaignPersistenceError,
)
from app.modules.campaigns.application.read_models.faction import FactionResponse
from app.modules.campaigns.domain.ports import CampaignRepository
from app.modules.campaigns.infrastructure.errors import RepositoryError


class CreateFaction:
    """Creates a manual faction after confirming parent visibility (design 6.4)."""

    def __init__(self, repository: CampaignRepository) -> None:
        """Initialize with a CampaignRepository (Protocol, never concrete)."""
        self._repository = repository

    def execute(self, campaign_id: str, fields: dict) -> FactionResponse:
        """Pre-check parent ownership, then insert with content_source=manual."""
        try:
            if self._repository.get_campaign(campaign_id) is None:
                raise CampaignNotFoundError()
            row = self._repository.create_faction(
                {**fields, "campaign_id": campaign_id, "content_source": "manual"}
            )
        except RepositoryError as exc:
            raise CampaignPersistenceError(retryable=True) from exc
        return FactionResponse(**row)
