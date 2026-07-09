"""ListMemoryFacts use case — active memories for review/detail surfaces."""

from app.modules.memory.application.errors import MemoryFactNotFoundError
from app.modules.memory.application.read_models.memory_fact import MemoryFactResponse
from app.modules.memory.domain.ports import MemoryRepository


class ListMemoryFacts:
    """Return caller-owned memory facts for a campaign."""

    def __init__(self, repository: MemoryRepository) -> None:
        """Store the ownership-scoped repository dependency."""
        self._repository = repository

    def execute(
        self, campaign_id: str, status: str | None = None
    ) -> list[MemoryFactResponse]:
        """List MemoryFacts, 404ing forged/foreign campaign ids."""
        if self._repository.get_campaign(campaign_id) is None:
            raise MemoryFactNotFoundError()
        rows = self._repository.list_memory_facts(campaign_id, status=status)
        return [MemoryFactResponse(**row) for row in rows]
