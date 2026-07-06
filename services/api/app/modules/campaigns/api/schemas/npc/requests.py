"""NPC HTTP request DTOs."""

from pydantic import BaseModel, Field

from app.modules.campaigns.domain import ContentSource


class CreateNpcRequest(BaseModel):
    """An NPC in a reviewed ``POST /campaigns`` payload."""

    name: str = Field(min_length=1, max_length=200)
    description: str = Field(min_length=1, max_length=4000)
    current_state: str = Field(min_length=1, max_length=1000)
    motivation: str = Field(min_length=1, max_length=1000)
    content_source: ContentSource


class CreateNpcInput(BaseModel):
    """``POST /npcs`` body — a DM-authored NPC.

    ``content_source`` is forced to ``manual`` server-side (never trusted from
    the client), and only ``name`` is required — the rest mirror the nullable
    columns.
    """

    campaign_id: str
    name: str = Field(min_length=1, max_length=200)
    description: str | None = Field(default=None, min_length=1, max_length=4000)
    current_state: str | None = Field(default=None, min_length=1, max_length=1000)
    motivation: str | None = Field(default=None, min_length=1, max_length=1000)


class UpdateNpcRequest(BaseModel):
    """``PATCH /npcs/{id}`` body — a partial NPC edit (empty patch -> 422)."""

    name: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = Field(default=None, min_length=1, max_length=4000)
    current_state: str | None = Field(default=None, min_length=1, max_length=1000)
    motivation: str | None = Field(default=None, min_length=1, max_length=1000)
