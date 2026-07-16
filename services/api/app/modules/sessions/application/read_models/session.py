"""Session read model returned by ``GET /campaigns/{id}/sessions``."""

from typing import Literal

from pydantic import BaseModel


class SessionResponse(BaseModel):
    """One session row in the chronological history read model."""

    id: str
    session_number: int
    summary: str | None = None
    consequences: str | None = None
    has_generated_content: bool = False
    # The stored lifecycle marker the UI uses to offer (or refuse) a resumable
    # draft. Never inferred from consequences/generated_content: `consequences`
    # is optional, so a summary-only completion is indistinguishable from an
    # untouched draft. Defaults to the fail-safe 'registered'.
    status: Literal["draft", "registered"] = "registered"
    created_at: str | None = None
