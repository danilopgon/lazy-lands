"""Campaign domain enum value objects.

These values mirror the existing Postgres enum values and are exported from
``domain.__init__`` and ``domain.models`` for compatibility.
"""

from enum import StrEnum


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
    """Arc lifecycle status (matches the Postgres ``arc_status`` enum)."""

    open = "open"
    resolved = "resolved"
    dropped = "dropped"
