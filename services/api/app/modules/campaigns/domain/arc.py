"""Arc aggregate/entity and related value objects for campaigns."""

from pydantic import BaseModel, ConfigDict

from app.modules.campaigns.domain.enums import ArcStatus, ContentSource, Priority


class Arc(BaseModel):
    """A campaign story arc."""

    model_config = ConfigDict(frozen=True)

    title: str
    description: str
    priority: Priority
    status: ArcStatus
    content_source: ContentSource
