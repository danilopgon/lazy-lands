"""Application contracts for next-session generation."""

from dataclasses import dataclass, field
from typing import Any, Literal

from pydantic import BaseModel, Field, field_validator

DEFAULT_TONE = "Keep current, low-magic intrigue"
DEFAULT_PACE = "Balanced"
DEFAULT_DIFFICULTY = "Standard"


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


class Encounter(BaseModel):
    """Encounter proposed by the Scribe."""

    name: str = Field(min_length=1, max_length=200)
    description: str = Field(min_length=1, max_length=1000)
    type: str = Field(min_length=1, max_length=100)


class FactionReaction(BaseModel):
    """Faction consequence proposed for the next session."""

    faction_name: str = Field(min_length=1, max_length=200)
    reaction: str = Field(min_length=1, max_length=1000)


class ArcProgression(BaseModel):
    """Open arc movement proposed for the next session."""

    arc_title: str = Field(min_length=1, max_length=200)
    progression: str = Field(min_length=1, max_length=1000)


class ContinuityLink(BaseModel):
    """Accepted memory fact woven into the proposal."""

    memory_fact_id: str = Field(min_length=1)
    relevance: str = Field(min_length=1, max_length=1000)


class GeneratedContent(BaseModel):
    """Full generated-content object persisted on ``sessions.generated_content``."""

    sections: list[GeneratedSection] = Field(min_length=1)
    continuity_links: list[ContinuityLink] = Field(default_factory=list)


class GeneratedSessionOutput(BaseModel):
    """Pydantic-validated LLM output for a generated session draft."""

    title: str = Field(min_length=1, max_length=200)
    synopsis: str = Field(min_length=1, max_length=2000)
    main_objective: str = Field(min_length=1, max_length=500)
    twist: str = Field(min_length=1, max_length=500)
    encounters: list[Encounter] = Field(default_factory=list)
    faction_reactions: list[FactionReaction] = Field(default_factory=list)
    arc_progression: list[ArcProgression] = Field(default_factory=list)
    continuity_links: list[ContinuityLink] = Field(default_factory=list)
    generated_content: GeneratedContent | None = None

    def content_for_persistence(self) -> GeneratedContent:
        """Return explicit sections or derive the default editable draft sections."""
        if self.generated_content is not None:
            return self.generated_content.model_copy(
                update={"continuity_links": self.continuity_links}
            )
        return GeneratedContent(
            sections=[
                GeneratedSection(id="synopsis", label="Synopsis", body=self.synopsis),
                GeneratedSection(
                    id="main_objective",
                    label="Main objective",
                    body=self.main_objective,
                ),
                GeneratedSection(id="twist", label="Twist", body=self.twist),
            ],
            continuity_links=self.continuity_links,
        )


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
    synopsis: str
    main_objective: str
    twist: str
    encounters: list[Encounter]
    faction_reactions: list[FactionReaction]
    arc_progression: list[ArcProgression]
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
