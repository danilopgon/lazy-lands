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
