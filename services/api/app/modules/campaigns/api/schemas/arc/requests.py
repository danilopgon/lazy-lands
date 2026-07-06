"""Arc HTTP request DTOs."""

from pydantic import BaseModel, Field

from app.modules.campaigns.domain import ContentSource, Priority
from app.modules.campaigns.domain.enums import ArcStatus


class CreateArcRequest(BaseModel):
    """An arc in a reviewed ``POST /campaigns`` payload.

    No ``status`` field accepted from the client — status is always
    assigned by the persistence layer (``"active"``).
    """

    title: str = Field(min_length=1, max_length=200)
    description: str = Field(min_length=1, max_length=4000)
    priority: Priority = Priority.medium
    content_source: ContentSource


class CreateArcInput(BaseModel):
    """``POST /arcs`` body — a DM-authored arc.

    ``content_source`` is forced to ``manual`` server-side. Unlike extraction,
    a manual arc accepts ``priority`` and ``status`` (defaults active/medium).
    """

    campaign_id: str
    title: str = Field(min_length=1, max_length=200)
    description: str | None = Field(default=None, min_length=1, max_length=4000)
    priority: Priority = Priority.medium
    status: ArcStatus = ArcStatus.active


class UpdateArcRequest(BaseModel):
    """``PATCH /arcs/{id}`` body — a partial arc edit (empty patch -> 422)."""

    title: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = Field(default=None, min_length=1, max_length=4000)
    priority: Priority | None = None
    status: ArcStatus | None = None
