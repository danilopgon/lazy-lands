"""MemoryRepository port (application depends on this, not Supabase)."""

from typing import Protocol


class MemoryRepository(Protocol):
    """Ownership-scoped persistence contract for MemoryFacts."""

    def get_campaign(self, campaign_id: str) -> dict | None:
        """Return one caller-visible campaign row, or None on RLS miss."""
        ...

    def insert_memory_fact(self, campaign_id: str, fields: dict) -> dict:
        """Insert one active memory fact for a caller-owned campaign."""
        ...

    def list_memory_facts(
        self, campaign_id: str, status: str | None = None
    ) -> list[dict]:
        """List memory facts for a campaign, optionally filtered by status."""
        ...

    def get_memory_fact(self, memory_fact_id: str) -> dict | None:
        """Return one caller-visible memory fact, or None on RLS miss."""
        ...

    def update_memory_fact(self, memory_fact_id: str, changes: dict) -> dict:
        """Patch one caller-visible memory fact and return the updated row."""
        ...
