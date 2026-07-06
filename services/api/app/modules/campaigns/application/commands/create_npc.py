"""CreateNpc use case — DM-authored NPC with an ownership pre-check."""

from app.modules.campaigns.application.errors import (
    CampaignNotFoundError,
    CampaignPersistenceError,
)
from app.modules.campaigns.application.read_models.npc import NpcResponse
from app.modules.campaigns.domain.ports import CampaignRepository
from app.modules.campaigns.infrastructure.errors import RepositoryError


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
        try:
            if self._repository.get_campaign(campaign_id) is None:
                raise CampaignNotFoundError()
            row = self._repository.create_npc(
                {**fields, "campaign_id": campaign_id, "content_source": "manual"}
            )
        except RepositoryError as exc:
            raise CampaignPersistenceError(retryable=True) from exc
        return NpcResponse(**row)
