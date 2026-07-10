"""Session detail read model for generated-session editing."""

from typing import Any

from pydantic import BaseModel


class SessionDetailResponse(BaseModel):
    """Full session row returned by flat ``GET /sessions/{session_id}``."""

    id: str
    campaign_id: str
    session_number: int
    summary: str | None = None
    consequences: str | None = None
    generated_content: dict[str, Any] | None = None
    trace_json: dict[str, Any] | None = None
    created_at: str | None = None
    updated_at: str | None = None
