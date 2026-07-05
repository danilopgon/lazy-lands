"""NPC read model returned by campaign queries."""

from pydantic import BaseModel

from app.modules.campaigns.domain import ContentSource


class NpcResponse(BaseModel):
    """NPC row returned with campaign detail."""

    id: str
    name: str
    description: str | None = None
    current_state: str | None = None
    motivation: str | None = None
    content_source: ContentSource | None = None
