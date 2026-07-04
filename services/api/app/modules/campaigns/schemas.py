"""HTTP/LLM contract schemas for the campaigns module.

``ExtractCampaignOutput`` serves both as the ``complete_json`` validation
target and the ``/campaigns/extract`` response model (design Decision 4).
"""

from typing import Any

from pydantic import BaseModel, Field, model_validator

from app.modules.campaigns.domain import ContentSource, Priority


class ScribeExtractedModel(BaseModel):
    """Base for LLM-extracted entities whose provenance is always the Scribe.

    Extraction output is not DM-authored yet. If an LLM hallucinates
    ``content_source: manual`` or ``edited``, normalize it before validation so
    the UI cannot mistake Scribe text for DM-authored text.
    """

    @model_validator(mode="before")
    @classmethod
    def force_scribe_provenance(cls, data: Any) -> Any:
        """Overwrite extracted entity provenance before field validation."""
        if isinstance(data, dict):
            return {**data, "content_source": ContentSource.llm}
        return data


class ExtractedNPC(ScribeExtractedModel):
    """An NPC proposed by the Scribe during extraction."""

    name: str = Field(min_length=1, max_length=200)
    description: str = Field(min_length=1, max_length=4000)
    current_state: str = Field(min_length=1, max_length=1000)
    motivation: str = Field(min_length=1, max_length=1000)
    content_source: ContentSource = ContentSource.llm


class ExtractedFaction(ScribeExtractedModel):
    """A faction proposed by the Scribe during extraction."""

    name: str = Field(min_length=1, max_length=200)
    description: str = Field(min_length=1, max_length=4000)
    current_stance: str = Field(min_length=1, max_length=1000)
    goals: str = Field(min_length=1, max_length=1000)
    content_source: ContentSource = ContentSource.llm


class ExtractedArc(ScribeExtractedModel):
    """An arc proposed by the Scribe during extraction.

    No ``status`` field — arc status is assigned on persistence, never
    proposed by the LLM (see ``campaign-persistence`` spec, CP-003).
    """

    title: str = Field(min_length=1, max_length=200)
    description: str = Field(min_length=1, max_length=4000)
    priority: Priority = Priority.medium
    content_source: ContentSource = ContentSource.llm


class ExtractCampaignOutput(BaseModel):
    """LLM extraction target AND ``POST /campaigns/extract`` response body."""

    title: str = Field(min_length=1, max_length=200)
    description: str = Field(min_length=1, max_length=4000)
    world_state: str = Field(min_length=1, max_length=4000)
    npcs: list[ExtractedNPC] = Field(default_factory=list)
    factions: list[ExtractedFaction] = Field(default_factory=list)
    arcs: list[ExtractedArc] = Field(default_factory=list)


class ExtractRequest(BaseModel):
    """``POST /campaigns/extract`` request body — the backend trust boundary."""

    raw_text: str = Field(min_length=100, max_length=8000)


class CreateNpcRequest(BaseModel):
    """An NPC in a reviewed ``POST /campaigns`` payload."""

    name: str = Field(min_length=1, max_length=200)
    description: str = Field(min_length=1, max_length=4000)
    current_state: str = Field(min_length=1, max_length=1000)
    motivation: str = Field(min_length=1, max_length=1000)
    content_source: ContentSource


class CreateFactionRequest(BaseModel):
    """A faction in a reviewed ``POST /campaigns`` payload."""

    name: str = Field(min_length=1, max_length=200)
    description: str = Field(min_length=1, max_length=4000)
    current_stance: str = Field(min_length=1, max_length=1000)
    goals: str = Field(min_length=1, max_length=1000)
    content_source: ContentSource


class CreateArcRequest(BaseModel):
    """An arc in a reviewed ``POST /campaigns`` payload.

    No ``status`` field accepted from the client — status is always
    assigned by the persistence layer (``"open"``).
    """

    title: str = Field(min_length=1, max_length=200)
    description: str = Field(min_length=1, max_length=4000)
    priority: Priority = Priority.medium
    content_source: ContentSource


class CreateCampaignRequest(BaseModel):
    """``POST /campaigns`` request body — the DM-reviewed payload."""

    title: str = Field(min_length=1, max_length=200)
    description: str = Field(min_length=1, max_length=4000)
    world_state: str = Field(min_length=1, max_length=4000)
    npcs: list[CreateNpcRequest] = Field(default_factory=list)
    factions: list[CreateFactionRequest] = Field(default_factory=list)
    arcs: list[CreateArcRequest] = Field(default_factory=list)


class CreateCampaignResponse(BaseModel):
    """``POST /campaigns`` success response body."""

    id: str
