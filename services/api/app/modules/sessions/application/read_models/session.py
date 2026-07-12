"""Session read model returned by ``GET /campaigns/{id}/sessions``."""

from typing import Any

from pydantic import BaseModel


class SessionResponse(BaseModel):
    """One session row in the chronological history read model."""

    id: str
    session_number: int
    summary: str | None = None
    consequences: str | None = None
    generated_content: dict[str, Any] | None = None
    created_at: str | None = None
