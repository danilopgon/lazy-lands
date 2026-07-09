"""CreateMemoryFact use case — persist a DM-accepted memory suggestion."""

from dataclasses import dataclass

from app.modules.memory.application.errors import (
    CampaignNotFoundError,
    MemoryFactPersistenceError,
)
from app.modules.memory.application.read_models.memory_fact import MemoryFactResponse
from app.modules.memory.domain.ports import MemoryRepository


@dataclass(frozen=True)
class CreateMemoryFactCommand:
    """Application command for creating one active MemoryFact."""

    content: str
    type: str | None = None
    importance: str | None = None
    source_session_id: str | None = None


class CreateMemoryFact:
    """Persist accepted or edited suggestion content as active memory."""

    def __init__(self, repository: MemoryRepository) -> None:
        """Store the ownership-scoped repository dependency."""
        self._repository = repository

    def execute(
        self, campaign_id: str, command: CreateMemoryFactCommand
    ) -> MemoryFactResponse:
        """Create a memory fact after an app-layer campaign ownership pre-check."""
        if self._repository.get_campaign(campaign_id) is None:
            raise CampaignNotFoundError()

        fields = {
            "campaign_id": campaign_id,
            "source_session_id": command.source_session_id,
            "content": command.content,
            "type": command.type,
            "importance": command.importance,
            "status": "active",
        }
        try:
            row = self._repository.insert_memory_fact(campaign_id, fields)
        except Exception as exc:
            raise MemoryFactPersistenceError() from exc
        return MemoryFactResponse(**row)
