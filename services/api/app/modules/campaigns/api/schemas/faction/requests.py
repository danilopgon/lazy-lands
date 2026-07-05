"""Faction HTTP request DTO."""

from pydantic import BaseModel, Field

from app.modules.campaigns.domain import ContentSource


class CreateFactionRequest(BaseModel):
    """A faction in a reviewed ``POST /campaigns`` payload."""

    name: str = Field(min_length=1, max_length=200)
    description: str = Field(min_length=1, max_length=4000)
    current_stance: str = Field(min_length=1, max_length=1000)
    goals: str = Field(min_length=1, max_length=1000)
    content_source: ContentSource
