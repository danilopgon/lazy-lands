"""Read models returned by the MemoryFact API."""

from pydantic import BaseModel

from app.modules.memory.domain.enums import Importance, MemoryStatus


class MemoryFactResponse(BaseModel):
    """One persisted memory fact returned to the frontend."""

    id: str
    campaign_id: str
    source_session_id: str | None = None
    content: str
    type: str | None = None
    importance: Importance | None = None
    status: MemoryStatus
    created_at: str | None = None
    updated_at: str | None = None
