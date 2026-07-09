"""SupabaseMemoryRepository — persists MemoryFacts via the per-user client."""

from typing import Any, cast

from supabase import Client

from app.modules.memory.infrastructure.errors import RepositoryError

_MEMORY_SELECT = (
    "id,campaign_id,source_session_id,content,type,importance,"
    "status,created_at,updated_at"
)


class SupabaseMemoryRepository:
    """``MemoryRepository`` implementation backed by caller-scoped Supabase."""

    def __init__(self, client: Client) -> None:
        """Store the caller-scoped Supabase client."""
        self._client = client

    def get_campaign(self, campaign_id: str) -> dict | None:
        """Fetch a single caller-visible campaign, returning None on RLS miss."""
        try:
            response = (
                self._client.table("campaigns")
                .select("id")
                .eq("id", campaign_id)
                .execute()
            )
        except Exception as exc:
            raise RepositoryError("Failed to get campaign") from exc
        rows = cast(list[dict[str, Any]], response.data or [])
        return rows[0] if rows else None

    def insert_memory_fact(self, _campaign_id: str, fields: dict) -> dict:
        """Insert one memory fact and return the inserted row."""
        try:
            response = self._client.table("memory_facts").insert(fields).execute()
        except Exception as exc:
            raise RepositoryError("Failed to insert memory fact") from exc
        rows = cast(list[dict[str, Any]], response.data or [])
        if not rows:
            raise RepositoryError("Memory fact insert returned no rows")
        return rows[0]

    def list_memory_facts(
        self, campaign_id: str, status: str | None = None
    ) -> list[dict]:
        """List campaign memory facts, newest first."""
        try:
            query = (
                self._client.table("memory_facts")
                .select(_MEMORY_SELECT)
                .eq("campaign_id", campaign_id)
            )
            if status is not None:
                query = query.eq("status", status)
            response = query.order("created_at", desc=True).execute()
        except Exception as exc:
            raise RepositoryError("Failed to list memory facts") from exc
        return cast(list[dict[str, Any]], response.data or [])

    def get_memory_fact(self, memory_fact_id: str) -> dict | None:
        """Fetch one caller-visible memory fact, returning None on RLS miss."""
        try:
            response = (
                self._client.table("memory_facts")
                .select(_MEMORY_SELECT)
                .eq("id", memory_fact_id)
                .execute()
            )
        except Exception as exc:
            raise RepositoryError("Failed to get memory fact") from exc
        rows = cast(list[dict[str, Any]], response.data or [])
        return rows[0] if rows else None

    def update_memory_fact(self, memory_fact_id: str, changes: dict) -> dict:
        """Patch one caller-visible memory fact and return the updated row."""
        try:
            response = (
                self._client.table("memory_facts")
                .update(changes)
                .eq("id", memory_fact_id)
                .execute()
            )
        except Exception as exc:
            raise RepositoryError("Failed to update memory fact") from exc
        rows = cast(list[dict[str, Any]], response.data or [])
        if not rows:
            raise RepositoryError("Memory fact update returned no rows")
        return rows[0]
