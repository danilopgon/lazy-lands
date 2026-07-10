"""Supabase-backed repository for session generation."""

import logging
from typing import Any, cast

from postgrest import APIError
from supabase import Client

from app.modules.sessions.infrastructure.errors import (
    RepositoryError,
    SessionNumberConflictError,
)

_UNIQUE_VIOLATION_CODE = "23505"
_DEFAULT_MAX_ATTEMPTS = 5
logger = logging.getLogger(__name__)


class SupabaseGenerationRepository:
    """Generation repository using the caller-scoped Supabase client."""

    def __init__(self, client: Client) -> None:
        """Initialize with a per-user Supabase client."""
        self._client = client

    def get_generation_context(self, campaign_id: str) -> dict | None:
        """Fetch campaign, NPCs, factions, active arcs, and active memories directly."""
        try:
            campaign_response = (
                self._client.table("campaigns")
                .select(
                    "id,title,description,world_state,"
                    "accumulated_summary,summarized_up_to_session"
                )
                .eq("id", campaign_id)
                .execute()
            )
            campaign_rows = cast(list[dict[str, Any]], campaign_response.data or [])
            if not campaign_rows:
                return None
            npcs = (
                self._client.table("npcs")
                .select("id,name,description,current_state,motivation")
                .eq("campaign_id", campaign_id)
                .execute()
            )
            factions = (
                self._client.table("factions")
                .select("id,name,description,current_stance,goals")
                .eq("campaign_id", campaign_id)
                .execute()
            )
            arcs = (
                self._client.table("arcs")
                .select("id,title,description,priority,status")
                .eq("campaign_id", campaign_id)
                .eq("status", "active")
                .execute()
            )
            memory_facts = (
                self._client.table("memory_facts")
                .select("id,content,type,importance")
                .eq("campaign_id", campaign_id)
                .eq("status", "active")
                .execute()
            )
        except Exception as exc:
            raise RepositoryError("Failed to fetch generation context") from exc

        return {
            "campaign": campaign_rows[0],
            "npcs": cast(list[dict[str, Any]], npcs.data or []),
            "factions": cast(list[dict[str, Any]], factions.data or []),
            "arcs": cast(list[dict[str, Any]], arcs.data or []),
            "memory_facts": cast(list[dict[str, Any]], memory_facts.data or []),
        }

    def get_next_session_number(self, campaign_id: str) -> int:
        """Return ``MAX(session_number)+1`` for generated draft insertion."""
        try:
            response = (
                self._client.table("sessions")
                .select("session_number")
                .eq("campaign_id", campaign_id)
                .order("session_number", desc=True)
                .limit(1)
                .execute()
            )
        except Exception as exc:
            raise RepositoryError("Failed to read next session number") from exc
        rows = cast(list[dict[str, Any]], response.data or [])
        return int(rows[0]["session_number"]) + 1 if rows else 1

    def insert_generated_session(
        self, campaign_id: str, session_number: int, session_data: dict
    ) -> dict:
        """Insert a generated session row with JSON draft and trace metadata."""
        try:
            response = (
                self._client.table("sessions")
                .insert(
                    {
                        "campaign_id": campaign_id,
                        "session_number": session_number,
                        "summary": session_data["summary"],
                        "consequences": session_data.get("consequences"),
                        "generated_content": session_data["generated_content"],
                        "trace_json": session_data["trace_json"],
                    }
                )
                .execute()
            )
        except APIError as exc:
            if exc.code == _UNIQUE_VIOLATION_CODE:
                raise SessionNumberConflictError(
                    "Duplicate (campaign_id, session_number)"
                ) from exc
            raise RepositoryError("Failed to insert generated session") from exc
        except Exception as exc:
            raise RepositoryError("Failed to insert generated session") from exc
        rows = cast(list[dict[str, Any]], response.data or [])
        if not rows:
            raise RepositoryError("Generated session insert returned no rows")
        return rows[0]

    def create_generated_session(self, campaign_id: str, session_data: dict) -> dict:
        """Insert a generated draft, retrying session-number conflicts."""
        last_conflict: SessionNumberConflictError | None = None
        for _attempt in range(_DEFAULT_MAX_ATTEMPTS):
            session_number = self.get_next_session_number(campaign_id)
            try:
                return self.insert_generated_session(
                    campaign_id, session_number, session_data
                )
            except SessionNumberConflictError as exc:
                last_conflict = exc
                continue
        raise RepositoryError(
            "Failed to insert generated session after conflicts"
        ) from last_conflict

    def record_generation_trace(self, campaign_id: str, trace_json: dict) -> None:
        """Log failed generation trace metadata without creating an orphan session."""
        logger.warning(
            "Generation trace recorded campaign_id=%s trace_json=%s",
            campaign_id,
            trace_json,
        )
