"""Session HTTP request DTOs."""

from typing import Any

from pydantic import BaseModel, Field, model_validator

from app.modules.sessions.domain.enums import SectionId


class RegenerateSectionRequest(BaseModel):
    """``POST /sessions/{id}/regenerate-section`` request body.

    Carries ONLY the target section id — no steering/direction field exists
    on this request by design (SR spec). Regeneration is a pure rewrite of
    the same section against the same context.
    """

    section_id: SectionId


class RegisterSessionRequest(BaseModel):
    """``POST /campaigns/{id}/sessions`` request body.

    Only two fields — ``summary`` (required) and ``consequences``
    (optional). No client-side ``session_number`` (server-assigned) and no
    concatenation of other handoff textareas (design Decision 1).
    """

    summary: str = Field(min_length=1, max_length=8000)
    consequences: str | None = Field(default=None, max_length=8000)


class UpdateSessionRequest(BaseModel):
    """``PATCH /sessions/{id}`` request body.

    The generated content object is replaced as-is; the server performs no
    section-level diffing because the frontend owns edit provenance.
    """

    generated_content: dict[str, Any] | None = None
    summary: str | None = Field(default=None, max_length=8000)
    consequences: str | None = Field(default=None, max_length=8000)

    @model_validator(mode="after")
    def _require_one_field(self) -> "UpdateSessionRequest":
        if not self.model_fields_set:
            raise ValueError("At least one supported field is required")
        return self
