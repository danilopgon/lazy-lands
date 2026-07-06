"""UpdateFaction use case — partial faction edit (no content_source restamp)."""

from app.modules.campaigns.application.errors import (
    CampaignNotFoundError,
    CampaignPersistenceError,
    CampaignValidationError,
)
from app.modules.campaigns.application.read_models.faction import FactionResponse
from app.modules.campaigns.domain.ports import CampaignRepository
from app.modules.campaigns.infrastructure.errors import RepositoryError


class UpdateFaction:
    """Patches a caller-owned faction; 422 on empty patch, 404 on RLS miss."""

    def __init__(self, repository: CampaignRepository) -> None:
        """Initialize with a CampaignRepository (Protocol, never concrete)."""
        self._repository = repository

    def execute(self, faction_id: str, changes: dict) -> FactionResponse:
        """Apply changes; empty or null-name -> 422, missing row -> 404."""
        # `name` maps to a NOT NULL column: reject an explicit null (422).
        if not changes or changes.get("name", "") is None:
            raise CampaignValidationError()
        # A DM edit flips provenance to "edited" (PRODUCT P1 — ✦ -> ✎).
        changes["content_source"] = "edited"
        try:
            row = self._repository.update_faction(faction_id, changes)
        except RepositoryError as exc:
            raise CampaignPersistenceError(retryable=True) from exc
        if row is None:
            raise CampaignNotFoundError()
        return FactionResponse(**row)
