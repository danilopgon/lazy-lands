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
