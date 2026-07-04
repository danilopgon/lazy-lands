"""NPC aggregate/entity for campaigns."""

from pydantic import BaseModel, ConfigDict

from app.modules.campaigns.domain.enums import ContentSource


class NPC(BaseModel):
    """A campaign NPC."""

    model_config = ConfigDict(frozen=True)

    name: str
    description: str
    current_state: str
    motivation: str
    content_source: ContentSource
