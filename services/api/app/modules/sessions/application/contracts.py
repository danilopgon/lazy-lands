"""LLM-output and response contract models for the sessions module.

``CampaignSummaryOutput`` and ``MemorySuggestionsOutput`` serve as
``complete_json`` validation targets (ADR-09); every LLM output is
Pydantic-validated before it is stored or returned.
"""

from typing import Literal

from pydantic import BaseModel, Field

from app.modules.sessions.domain.enums import Importance, MemoryType


class CampaignSummaryOutput(BaseModel):
    """Rolling campaign summary produced by ``SummarizeCampaign``."""

    accumulated_summary: str = Field(min_length=1, max_length=6000)


class MemorySuggestion(BaseModel):
    """A transient memory-fact proposal from the Scribe — never persisted here."""

    content: str = Field(min_length=1, max_length=2000)
    type: MemoryType
    importance: Importance
    reason: str = Field(min_length=1, max_length=1000)
    related: list[str] = Field(default_factory=list, max_length=20)


class MemorySuggestionsOutput(BaseModel):
    """LLM target for ``SuggestMemories`` — 0-5 suggestions per session."""

    suggestions: list[MemorySuggestion] = Field(default_factory=list, max_length=5)


class RegisterSessionResponse(BaseModel):
    """``POST /campaigns/{id}/sessions`` response body."""

    session_id: str
    session_number: int
    memory_suggestions: list[MemorySuggestion] = Field(default_factory=list)


class MemorySuggestionsResponse(BaseModel):
    """``POST /sessions/{id}/memory-suggestions`` response body.

    Keyed like ``RegisterSessionResponse`` so the review UI reads recovered
    proposals exactly as it reads the ones returned at registration time.
    """

    memory_suggestions: list[MemorySuggestion] = Field(default_factory=list)


class PersistedExportSection(BaseModel):
    """The allowlisted persisted fields that may enter an export document."""

    id: str = Field(min_length=1, max_length=200)
    label: str = Field(min_length=1, max_length=200)
    body: str = Field(min_length=1, max_length=20000)
    origin: Literal["scribe", "edited"]


class PersistedExportDraft(BaseModel):
    """The persisted generated-content snapshot used for PDF export only."""

    title: str = Field(min_length=1, max_length=200)
    sections: list[PersistedExportSection] = Field(min_length=1)
