"""UpdateNpc use case — partial NPC edit (no content_source restamp)."""

from app.modules.campaigns.application.errors import (
    CampaignNotFoundError,
    CampaignPersistenceError,
    CampaignValidationError,
)
from app.modules.campaigns.application.read_models.npc import NpcResponse
from app.modules.campaigns.domain.ports import CampaignRepository
from app.modules.campaigns.infrastructure.errors import RepositoryError


class UpdateNpc:
    """Patches a caller-owned NPC; 422 on empty patch, 404 on RLS miss."""

    def __init__(self, repository: CampaignRepository) -> None:
        """Initialize with a CampaignRepository (Protocol, never concrete)."""
        self._repository = repository

    def execute(self, npc_id: str, changes: dict) -> NpcResponse:
        """Apply changes; empty or null-name -> 422, missing row -> 404."""
        # `name` maps to a NOT NULL column: reject an explicit null (422) rather
        # than letting it reach the DB and surface as an unhandled 500.
        if not changes or changes.get("name", "") is None:
            raise CampaignValidationError()
        try:
            row = self._repository.update_npc(npc_id, changes)
        except RepositoryError as exc:
            raise CampaignPersistenceError(retryable=True) from exc
        if row is None:
            raise CampaignNotFoundError()
        return NpcResponse(**row)
