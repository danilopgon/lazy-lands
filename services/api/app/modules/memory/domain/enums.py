"""MemoryFact enum value objects matching the existing Postgres enums."""

from enum import StrEnum


class Importance(StrEnum):
    """Memory importance (mirrors the shared ``importance`` DB enum)."""

    high = "high"
    medium = "medium"
    low = "low"


class MemoryStatus(StrEnum):
    """Memory lifecycle status (mirrors ``memory_status``)."""

    active = "active"
    archived = "archived"


class MemoryType(StrEnum):
    """Finite vocabulary for Scribe memory suggestions.

    Mirrors ``app.modules.sessions.domain.enums.MemoryType``. The
    ``memory_facts.type`` column stays free-text so existing rows are never
    rejected at the DB boundary; this enum closes the vocabulary only for
    Scribe-emitted and DM-accepted writes.
    """

    consequence = "consequence"
    relationship = "relationship"
    secret = "secret"
    promise = "promise"
    tension = "tension"
    revelation = "revelation"
    item = "item"
    arc_progress = "arc_progress"
