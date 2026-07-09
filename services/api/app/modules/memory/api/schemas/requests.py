"""MemoryFact HTTP request DTOs."""

from pydantic import BaseModel, Field, model_validator

from app.modules.memory.domain.enums import Importance, MemoryStatus, MemoryType


class CreateMemoryFactRequest(BaseModel):
    """``POST /campaigns/{id}/memory-facts`` body."""

    source_session_id: str | None = None
    content: str = Field(min_length=1, max_length=2000)
    type: MemoryType | None = None
    importance: Importance | None = None


class UpdateMemoryFactRequest(BaseModel):
    """``PATCH /memory-facts/{id}`` body."""

    content: str | None = Field(default=None, min_length=1, max_length=2000)
    status: MemoryStatus | None = None

    @model_validator(mode="after")
    def require_one_change(self) -> "UpdateMemoryFactRequest":
        """Reject empty PATCH bodies before application/infrastructure work."""
        if self.content is None and self.status is None:
            raise ValueError("At least one field must be provided")
        return self
