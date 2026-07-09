"""UpdateMemoryFact use case — patch content or archive an owned memory."""

from dataclasses import dataclass

from app.modules.memory.application.errors import (
    MemoryFactNotFoundError,
    MemoryFactPersistenceError,
    MemoryFactValidationError,
)
from app.modules.memory.application.read_models.memory_fact import MemoryFactResponse
from app.modules.memory.domain.enums import MemoryStatus
from app.modules.memory.domain.ports import MemoryRepository


@dataclass(frozen=True)
class UpdateMemoryFactCommand:
    """Application command for patching one MemoryFact."""

    changes: dict[str, str | MemoryStatus]


class UpdateMemoryFact:
    """Patch a caller-visible MemoryFact, including retire via archived status."""

    def __init__(self, repository: MemoryRepository) -> None:
        """Store the ownership-scoped repository dependency."""
        self._repository = repository

    def execute(
        self, memory_fact_id: str, command: UpdateMemoryFactCommand
    ) -> MemoryFactResponse:
        """Patch content/status after a caller-scoped MemoryFact lookup."""
        if not command.changes:
            raise MemoryFactValidationError()
        if self._repository.get_memory_fact(memory_fact_id) is None:
            raise MemoryFactNotFoundError()
        try:
            row = self._repository.update_memory_fact(memory_fact_id, command.changes)
        except Exception as exc:
            raise MemoryFactPersistenceError() from exc
        return MemoryFactResponse(**row)
