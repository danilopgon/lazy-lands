"""Domain entities for the campaigns module (ADR-05).

Enums here are the single source of truth for provenance/priority/status
values; ``schemas.py`` (the HTTP/LLM contract layer) imports them rather than
redefining them, keeping the dependency direction domain -> schemas.
"""

from enum import StrEnum

from pydantic import BaseModel, ConfigDict


class ContentSource(StrEnum):
    """Provenance of an extracted/persisted entity (matches the Postgres enum)."""

    llm = "llm"
    edited = "edited"
    manual = "manual"


class Priority(StrEnum):
    """Arc priority (matches the Postgres ``priority`` enum)."""

    high = "high"
    medium = "medium"
    low = "low"


class ArcStatus(StrEnum):
    """Arc lifecycle status (matches the Postgres ``arc_status`` enum).

    ``active`` is NOT a valid value here — it belongs to the unrelated
    ``memory_status`` enum and must never be used for arcs.
    """

    open = "open"
    resolved = "resolved"
    dropped = "dropped"


class NPC(BaseModel):
    """A campaign NPC."""

    model_config = ConfigDict(frozen=True)

    name: str
    description: str
    current_state: str
    motivation: str
    content_source: ContentSource


class Faction(BaseModel):
    """A campaign faction."""

    model_config = ConfigDict(frozen=True)

    name: str
    description: str
    current_stance: str
    goals: str
    content_source: ContentSource


class Arc(BaseModel):
    """A campaign story arc."""

    model_config = ConfigDict(frozen=True)

    title: str
    description: str
    priority: Priority
    status: ArcStatus
    content_source: ContentSource


class Campaign(BaseModel):
    """A DM's campaign, owned by exactly one Supabase auth user."""

    model_config = ConfigDict(frozen=True)

    id: str
    user_id: str
    title: str
    description: str
    world_state: str
