"""Arc HTTP response DTO."""

from pydantic import BaseModel

from app.modules.campaigns.domain import ContentSource, Priority
from app.modules.campaigns.domain.enums import ArcStatus


class ArcResponse(BaseModel):
    """Arc row returned with campaign detail."""

    id: str
    title: str
    description: str | None = None
    priority: Priority | None = None
    status: ArcStatus | None = None
    content_source: ContentSource | None = None
