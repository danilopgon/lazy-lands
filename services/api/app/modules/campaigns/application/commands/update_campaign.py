"""UpdateCampaign use case — partial edit of world_state/system/tone."""

from app.modules.campaigns.application.errors import (
    CampaignNotFoundError,
    CampaignPersistenceError,
    CampaignValidationError,
)
from app.modules.campaigns.application.read_models.campaign import (
    CampaignMutationResponse,
)
from app.modules.campaigns.domain.ports import CampaignRepository
from app.modules.campaigns.infrastructure.errors import RepositoryError


class UpdateCampaign:
    """Patches a caller-owned campaign; 422 on empty patch, 404 on RLS miss."""

    def __init__(self, repository: CampaignRepository) -> None:
        """Initialize with a CampaignRepository (Protocol, never concrete)."""
        self._repository = repository

    def execute(self, campaign_id: str, changes: dict) -> CampaignMutationResponse:
        """Apply the pre-filtered changes; empty -> 422, missing row -> 404."""
        if not changes:
            raise CampaignValidationError()
        try:
            row = self._repository.update_campaign(campaign_id, changes)
        except RepositoryError as exc:
            raise CampaignPersistenceError(retryable=True) from exc
        if row is None:
            raise CampaignNotFoundError()
        return CampaignMutationResponse(**row)
