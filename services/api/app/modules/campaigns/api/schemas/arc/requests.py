"""Arc HTTP request DTO."""

from pydantic import BaseModel, Field

from app.modules.campaigns.domain import ContentSource, Priority


class CreateArcRequest(BaseModel):
    """An arc in a reviewed ``POST /campaigns`` payload.

    No ``status`` field accepted from the client — status is always
    assigned by the persistence layer (``"open"``).
    """

    title: str = Field(min_length=1, max_length=200)
    description: str = Field(min_length=1, max_length=4000)
    priority: Priority = Priority.medium
    content_source: ContentSource
