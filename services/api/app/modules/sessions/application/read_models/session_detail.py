"""Session detail read model for generated-session editing."""

from typing import Any, Literal

from pydantic import BaseModel


class SessionDetailResponse(BaseModel):
    """Full session row returned by flat ``GET /sessions/{session_id}``."""

    id: str
    campaign_id: str
    session_number: int
    summary: str | None = None
    consequences: str | None = None
    generated_content: dict[str, Any] | None = None
    # Mirrors `SessionResponse.status`: the stored lifecycle marker the detail
    # screen uses to decide whether it is looking at an unplayed proposal or a
    # session the DM already played. Defaults to the fail-safe 'registered' —
    # the same default as the column — so a row written before the status
    # column existed is never presented as a discardable draft.
    status: Literal["draft", "registered"] = "registered"
    trace_json: dict[str, Any] | None = None
    created_at: str | None = None
    updated_at: str | None = None
