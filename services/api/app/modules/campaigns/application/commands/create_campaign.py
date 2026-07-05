"""CreateCampaign use case — ordered inserts with compensating delete.

Repository-only; no LLM access. Follows design Decision 5: campaign -> npcs
-> factions -> arcs, all through the per-user client; on any child failure,
delete the just-created campaign (cascade removes any inserted children).
"""

import logging

from app.modules.campaigns.api.schemas.campaign.requests import CreateCampaignRequest
from app.modules.campaigns.domain.ports import CampaignRepository
from app.modules.campaigns.errors import CampaignPersistenceError
from app.modules.campaigns.infrastructure.errors import RepositoryError

logger = logging.getLogger(__name__)


class CreateCampaign:
    """Persists a DM-reviewed campaign and its NPCs, factions, and arcs."""

    def __init__(self, repository: CampaignRepository) -> None:
        """Initialize with a CampaignRepository (Protocol, never concrete)."""
        self._repository = repository

    def execute(self, user_id: str, data: CreateCampaignRequest) -> str:
        """Insert campaign -> npcs -> factions -> arcs; compensate on failure.

        Args:
            user_id: The authenticated caller's id (never client-supplied —
                CP-004).
            data: The DM-reviewed payload.

        Returns:
            The new campaign id.

        Raises:
            CampaignPersistenceError: If any child insert fails. If the
                compensating delete also fails, ``orphaned_campaign_id`` is
                set on the error and the failure is logged.
        """
        try:
            campaign_id = self._repository.insert_campaign(user_id, data)
        except RepositoryError as exc:
            raise CampaignPersistenceError(retryable=True) from exc

        try:
            self._repository.insert_npcs(campaign_id, data.npcs)
            self._repository.insert_factions(campaign_id, data.factions)
            self._repository.insert_arcs(campaign_id, data.arcs)
        except RepositoryError:
            try:
                self._repository.delete_campaign(campaign_id)
            except RepositoryError:
                logger.error(
                    "Compensating delete failed for campaign_id=%s", campaign_id
                )
                raise CampaignPersistenceError(
                    retryable=True, orphaned_campaign_id=campaign_id
                ) from None
            raise CampaignPersistenceError(retryable=True) from None
        return campaign_id
