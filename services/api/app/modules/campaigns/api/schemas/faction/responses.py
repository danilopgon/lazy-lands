"""Faction HTTP response DTO."""

from pydantic import BaseModel

from app.modules.campaigns.domain import ContentSource


class FactionResponse(BaseModel):
    """Faction row returned with campaign detail."""

    id: str
    name: str
    description: str | None = None
    current_stance: str | None = None
    goals: str | None = None
    content_source: ContentSource | None = None
