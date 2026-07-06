"""Faction HTTP request DTOs."""

from pydantic import BaseModel, Field

from app.modules.campaigns.domain import ContentSource


class CreateFactionRequest(BaseModel):
    """A faction in a reviewed ``POST /campaigns`` payload."""

    name: str = Field(min_length=1, max_length=200)
    description: str = Field(min_length=1, max_length=4000)
    current_stance: str = Field(min_length=1, max_length=1000)
    goals: str = Field(min_length=1, max_length=1000)
    content_source: ContentSource


class CreateFactionInput(BaseModel):
    """``POST /factions`` body — a DM-authored faction.

    ``content_source`` is forced to ``manual`` server-side; only ``name`` is
    required.
    """

    campaign_id: str
    name: str = Field(min_length=1, max_length=200)
    description: str | None = Field(default=None, min_length=1, max_length=4000)
    current_stance: str | None = Field(default=None, min_length=1, max_length=1000)
    goals: str | None = Field(default=None, min_length=1, max_length=1000)


class UpdateFactionRequest(BaseModel):
    """``PATCH /factions/{id}`` body — a partial faction edit (empty patch -> 422)."""

    name: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = Field(default=None, min_length=1, max_length=4000)
    current_stance: str | None = Field(default=None, min_length=1, max_length=1000)
    goals: str | None = Field(default=None, min_length=1, max_length=1000)
