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


class NewArc(BaseModel):
    """An arc pending its initial persistence-assigned status.

    Status is never accepted from the client or the LLM (``campaign-persistence``
    spec, CP-003) — the repository always assigns ``ArcStatus.active`` on insert,
    so this creation-time shape has no ``status`` field at all.
    """

    model_config = ConfigDict(frozen=True)

    title: str
    description: str
    priority: Priority
    content_source: ContentSource
