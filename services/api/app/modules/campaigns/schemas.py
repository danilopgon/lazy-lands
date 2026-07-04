"""HTTP/LLM contract schemas for the campaigns module.

``ExtractCampaignOutput`` serves both as the ``complete_json`` validation
target and the ``/campaigns/extract`` response model (design Decision 4).
"""

from pydantic import BaseModel, Field

from app.modules.campaigns.domain.models import ContentSource, Priority


class ExtractedNPC(BaseModel):
    """An NPC proposed by the Scribe during extraction."""

    name: str
    description: str
    current_state: str
    motivation: str
    content_source: ContentSource = ContentSource.llm


class ExtractedFaction(BaseModel):
    """A faction proposed by the Scribe during extraction."""

    name: str
    description: str
    current_stance: str
    goals: str
    content_source: ContentSource = ContentSource.llm


class ExtractedArc(BaseModel):
    """An arc proposed by the Scribe during extraction.

    No ``status`` field — arc status is assigned on persistence, never
    proposed by the LLM (see ``campaign-persistence`` spec, CP-003).
    """

    title: str
    description: str
    priority: Priority = Priority.medium
    content_source: ContentSource = ContentSource.llm


class ExtractCampaignOutput(BaseModel):
    """LLM extraction target AND ``POST /campaigns/extract`` response body."""

    title: str
    description: str
    world_state: str
    npcs: list[ExtractedNPC] = Field(default_factory=list)
    factions: list[ExtractedFaction] = Field(default_factory=list)
    arcs: list[ExtractedArc] = Field(default_factory=list)


class ExtractRequest(BaseModel):
    """``POST /campaigns/extract`` request body — the backend trust boundary."""

    raw_text: str = Field(min_length=100, max_length=8000)


class CreateNpcRequest(BaseModel):
    """An NPC in a reviewed ``POST /campaigns`` payload."""

    name: str
    description: str
    current_state: str
    motivation: str
    content_source: ContentSource


class CreateFactionRequest(BaseModel):
    """A faction in a reviewed ``POST /campaigns`` payload."""

    name: str
    description: str
    current_stance: str
    goals: str
    content_source: ContentSource


class CreateArcRequest(BaseModel):
    """An arc in a reviewed ``POST /campaigns`` payload.

    No ``status`` field accepted from the client — status is always
    assigned by the persistence layer (``"open"``).
    """

    title: str
    description: str
    priority: Priority = Priority.medium
    content_source: ContentSource


class CreateCampaignRequest(BaseModel):
    """``POST /campaigns`` request body — the DM-reviewed payload."""

    title: str = Field(min_length=1)
    description: str = Field(min_length=1)
    world_state: str = Field(min_length=1)
    npcs: list[CreateNpcRequest] = Field(default_factory=list)
    factions: list[CreateFactionRequest] = Field(default_factory=list)
    arcs: list[CreateArcRequest] = Field(default_factory=list)


class CreateCampaignResponse(BaseModel):
    """``POST /campaigns`` success response body."""

    id: str
