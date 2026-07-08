"""Session HTTP request DTOs."""

from pydantic import BaseModel, Field


class RegisterSessionRequest(BaseModel):
    """``POST /campaigns/{id}/sessions`` request body.

    Only two fields — ``summary`` (required) and ``consequences``
    (optional). No client-side ``session_number`` (server-assigned) and no
    concatenation of other handoff textareas (design Decision 1).
    """

    summary: str = Field(min_length=1, max_length=8000)
    consequences: str | None = Field(default=None, max_length=8000)
