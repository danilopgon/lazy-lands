"""Sessions domain enum value objects.

Mirrors the existing Postgres ``importance`` enum (shared with the
``memory_facts`` table, see the initial schema migration).
"""

from enum import StrEnum


class Importance(StrEnum):
    """Suggested memory-fact importance (matches the Postgres ``importance`` enum)."""

    high = "high"
    medium = "medium"
    low = "low"


class MemoryType(StrEnum):
    """Finite vocabulary for Scribe memory suggestions.

    The ``memory_facts.type`` column stays free-text ``text`` so existing rows
    (and manual notes) are never rejected at the DB boundary; this enum closes
    the vocabulary for *Scribe-emitted* and DM-accepted writes only.
    """

    consequence = "consequence"
    relationship = "relationship"
    secret = "secret"
    promise = "promise"
    tension = "tension"
    revelation = "revelation"
    item = "item"
    arc_progress = "arc_progress"


class SectionId(StrEnum):
    """The 7 canonical generated-session section ids, fixed order.

    Mirrors ``CANONICAL_SECTION_IDS`` in
    ``generation/application/contracts.py``. Duplicated deliberately (not
    imported) so ``sessions`` never depends on ``generation`` at module
    level — FastAPI enum validation alone rejects any id outside these 7
    with a 422 before the handler runs, satisfying the "no LLM call for an
    unknown id" requirement at the HTTP boundary.
    """

    synopsis = "synopsis"
    goal = "goal"
    opening = "opening"
    beats = "beats"
    encounters = "encounters"
    factions = "factions"
    arcs = "arcs"
