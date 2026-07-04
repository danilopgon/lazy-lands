"""Faction aggregate/entity for campaigns."""

from pydantic import BaseModel, ConfigDict

from app.modules.campaigns.domain.enums import ContentSource


class Faction(BaseModel):
    """A campaign faction."""

    model_config = ConfigDict(frozen=True)

    name: str
    description: str
    current_stance: str
    goals: str
    content_source: ContentSource
