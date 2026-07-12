"""Application contracts for next-session generation.

Sections-only contract: the Scribe always emits exactly the seven canonical
sections below, in order. There is no derived/flat shape any more — the old
``main_objective``/``twist``/``encounters``/``faction_reactions``/
``arc_progression`` fields and the ``generated_content``-or-derive branch
are retired. ``twist`` is folded into ``beats``/``opening`` by the prompt
(see ``generate_session_v2.jinja``); it is never a standalone field again.
"""

from dataclasses import dataclass, field
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

DEFAULT_TONE = "Keep current, low-magic intrigue"
DEFAULT_PACE = "Balanced"
DEFAULT_DIFFICULTY = "Standard"

# Order is part of the contract: sections render /01../07 in this exact sequence,
# shared with the frontend section-label allowlist.
CANONICAL_SECTION_IDS: tuple[str, ...] = (
    "synopsis",
    "goal",
    "opening",
    "beats",
    "encounters",
    "factions",
    "arcs",
)

CANONICAL_SECTION_LABELS: dict[str, str] = {
    "synopsis": "Synopsis",
    "goal": "Session goal",
    "opening": "Opening scene",
    "beats": "Main beats",
    "encounters": "Encounters",
    "factions": "Faction reactions",
    "arcs": "Arc progression",
}


def _blank_to_none(value: str | None) -> str | None:
    if value is None:
        return None
    stripped = value.strip()
    return stripped or None


class GeneratedSection(BaseModel):
    """One editable generated-content section with provenance."""

    id: str = Field(min_length=1)
    label: str = Field(min_length=1)
    body: str = Field(min_length=1)
    origin: Literal["scribe", "edited"] = "scribe"


class GeneratedDraftSection(BaseModel):
    """One brand-new LLM-generated section before any DM edits."""

    id: str = Field(min_length=1)
    label: str = Field(min_length=1)
    body: str = Field(min_length=1)
    origin: Literal["scribe"] = "scribe"


class ContinuityLink(BaseModel):
    """Accepted memory fact woven into the proposal."""

    memory_fact_id: str = Field(min_length=1)
    relevance: str = Field(min_length=1, max_length=1000)


class GeneratedContent(BaseModel):
    """Full generated-content object persisted on ``sessions.generated_content``."""

    title: str = Field(min_length=1, max_length=200)
    sections: list[GeneratedSection] = Field(min_length=1)
    continuity_links: list[ContinuityLink] = Field(default_factory=list)


class GeneratedSessionOutput(BaseModel):
    """Pydantic-validated LLM output for a generated session draft.

    ``extra="forbid"`` guards against prompt/model drift reintroducing the
    retired flat fields (``main_objective``, ``twist``, ``encounters``,
    ``faction_reactions``, ``arc_progression``) — any of those on the raw
    LLM payload fails validation instead of being silently ignored.
    """

    model_config = ConfigDict(extra="forbid")

    title: str = Field(min_length=1, max_length=200)
    sections: list[GeneratedDraftSection] = Field(min_length=7, max_length=7)
    continuity_links: list[ContinuityLink] = Field(default_factory=list)

    @field_validator("sections")
    @classmethod
    def _validate_canonical_sections(
        cls, value: list[GeneratedDraftSection]
    ) -> list[GeneratedDraftSection]:
        ids = tuple(section.id for section in value)
        if ids != CANONICAL_SECTION_IDS:
            raise ValueError(
                "sections must be exactly the 7 canonical ids in order: "
                f"{CANONICAL_SECTION_IDS}, got {ids}"
            )
        return value

    def content_for_persistence(self) -> GeneratedContent:
        """Return the persisted generated-content object.

        ``title`` always reflects the LLM-emitted ``title`` so the persisted
        draft and the ``GET /sessions/{id}`` read model expose the generated
        proposal title rather than leaking the synopsis into the DM's H1.
        """
        return GeneratedContent(
            title=self.title,
            sections=[
                GeneratedSection(**section.model_dump()) for section in self.sections
            ],
            continuity_links=self.continuity_links,
        )


class RegeneratedSectionOutput(BaseModel):
    """Pydantic-validated LLM output for a single regenerated section body."""

    model_config = ConfigDict(extra="forbid")

    body: str = Field(min_length=1, max_length=4000)


@dataclass(frozen=True)
class GenerationDirection:
    """Optional DM direction for the Scribe, with server-side defaults."""

    goal: str | None = None
    tone: str | None = DEFAULT_TONE
    pace: str | None = DEFAULT_PACE
    difficulty: str | None = DEFAULT_DIFFICULTY
    additional_instructions: str | None = None

    def __post_init__(self) -> None:
        """Normalize optional blanks and required defaults after dataclass init."""
        object.__setattr__(self, "goal", _blank_to_none(self.goal))
        object.__setattr__(
            self, "tone", (self.tone or DEFAULT_TONE).strip() or DEFAULT_TONE
        )
        object.__setattr__(
            self, "pace", (self.pace or DEFAULT_PACE).strip() or DEFAULT_PACE
        )
        object.__setattr__(
            self,
            "difficulty",
            (self.difficulty or DEFAULT_DIFFICULTY).strip() or DEFAULT_DIFFICULTY,
        )
        object.__setattr__(
            self,
            "additional_instructions",
            _blank_to_none(self.additional_instructions),
        )


@dataclass(frozen=True)
class GenerationContext:
    """Direct relational context used to render the generation prompt."""

    campaign: dict[str, Any]
    npcs: list[dict[str, Any]] = field(default_factory=list)
    factions: list[dict[str, Any]] = field(default_factory=list)
    arcs: list[dict[str, Any]] = field(default_factory=list)
    memory_facts: list[dict[str, Any]] = field(default_factory=list)


class GenerateSessionResponse(BaseModel):
    """Application response returned by the generation use case."""

    id: str
    session_number: int
    title: str
    sections: list[GeneratedSection]
    continuity_links: list[ContinuityLink]
    trace_id: str


class DirectionInput(BaseModel):
    """Reusable validator for direction DTOs."""

    goal: str | None = None
    tone: str | None = DEFAULT_TONE
    pace: str | None = DEFAULT_PACE
    difficulty: str | None = DEFAULT_DIFFICULTY
    additional_instructions: str | None = None

    @field_validator("goal", "additional_instructions", mode="before")
    @classmethod
    def _optional_blank_to_none(cls, value: object) -> object:
        if isinstance(value, str):
            return value.strip() or None
        return value

    @field_validator("tone", "pace", "difficulty", mode="before")
    @classmethod
    def _trim_required_defaults(cls, value: object) -> object:
        if isinstance(value, str):
            return value.strip() or None
        return value

    def to_direction(self) -> GenerationDirection:
        """Map validated input into the application command object."""
        return GenerationDirection(
            goal=self.goal,
            tone=self.tone or DEFAULT_TONE,
            pace=self.pace or DEFAULT_PACE,
            difficulty=self.difficulty or DEFAULT_DIFFICULTY,
            additional_instructions=self.additional_instructions,
        )
