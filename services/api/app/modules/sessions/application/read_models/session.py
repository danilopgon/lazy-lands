"""Session read model returned by ``GET /campaigns/{id}/sessions``."""

from pydantic import BaseModel


class SessionResponse(BaseModel):
    """One session row in the chronological history read model."""

    id: str
    session_number: int
    summary: str | None = None
    consequences: str | None = None
    has_generated_content: bool = False
    created_at: str | None = None
