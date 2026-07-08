"""SupabaseSessionRepository — persists sessions via the per-user client.

NEVER imports ``get_supabase_client()`` (the service-role singleton) — every
write here goes through the caller-scoped client injected at construction
time (PU-003, NFR-CP-1), matching the campaigns module's repository.
"""

from typing import Any, cast

from supabase import Client

from app.modules.sessions.infrastructure.errors import RepositoryError


class SupabaseSessionRepository:
    """``SessionRepository`` implementation backed by a per-user Supabase client."""

    def __init__(self, client: Client) -> None:
        """Initialize with a per-user (never service-role) Supabase client."""
        self._client = client

    def get_campaign(self, campaign_id: str) -> dict | None:
        """Fetch a single caller-visible campaign, returning None on RLS miss."""
        try:
            response = (
                self._client.table("campaigns")
                .select(
                    "id,title,description,world_state,"
                    "accumulated_summary,summarized_up_to_session"
                )
                .eq("id", campaign_id)
                .execute()
            )
        except Exception as exc:
            raise RepositoryError("Failed to get campaign") from exc
        rows = cast(list[dict[str, Any]], response.data or [])
        return rows[0] if rows else None

    def get_next_session_number(self, campaign_id: str) -> int:
        """Return ``MAX(session_number) + 1`` for the campaign (1 if none exist)."""
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
        if not rows:
            return 1
        return int(rows[0]["session_number"]) + 1

    def insert_session(
        self,
        campaign_id: str,
        session_number: int,
        summary: str,
        consequences: str | None,
    ) -> dict:
        """Insert the session row; return the inserted row."""
        try:
            response = (
                self._client.table("sessions")
                .insert(
                    {
                        "campaign_id": campaign_id,
                        "session_number": session_number,
                        "summary": summary,
                        "consequences": consequences,
                    }
                )
                .execute()
            )
        except Exception as exc:
            raise RepositoryError("Failed to insert session") from exc
        rows = cast(list[dict[str, Any]], response.data or [])
        if not rows:
            raise RepositoryError("Session insert returned no rows")
        return rows[0]

    def list_sessions(self, campaign_id: str) -> list[dict]:
        """List a campaign's sessions, ascending by ``session_number``."""
        try:
            response = (
                self._client.table("sessions")
                .select("id,session_number,summary,consequences,created_at")
                .eq("campaign_id", campaign_id)
                .order("session_number", desc=False)
                .execute()
            )
        except Exception as exc:
            raise RepositoryError("Failed to list sessions") from exc
        return cast(list[dict[str, Any]], response.data or [])

    def get_sessions_since(
        self, campaign_id: str, since_session_number: int
    ) -> list[dict]:
        """List sessions with ``session_number`` greater than the given value."""
        try:
            response = (
                self._client.table("sessions")
                .select("id,session_number,summary,consequences,created_at")
                .eq("campaign_id", campaign_id)
                .gt("session_number", since_session_number)
                .order("session_number", desc=False)
                .execute()
            )
        except Exception as exc:
            raise RepositoryError("Failed to list delta sessions") from exc
        return cast(list[dict[str, Any]], response.data or [])

    def update_campaign_summary(
        self,
        campaign_id: str,
        accumulated_summary: str,
        summarized_up_to_session: int,
    ) -> None:
        """Patch the campaign's summary state at the repository boundary."""
        try:
            self._client.table("campaigns").update(
                {
                    "accumulated_summary": accumulated_summary,
                    "summarized_up_to_session": summarized_up_to_session,
                }
            ).eq("id", campaign_id).execute()
        except Exception as exc:
            raise RepositoryError("Failed to update campaign summary") from exc

    def get_suggestion_context(self, campaign_id: str) -> dict:
        """Return the direct relational fetch used to build suggest input.

        No RAG/embeddings/vector search — a plain relational read (explicit
        non-goal, session-registration spec).
        """
        try:
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
            raise RepositoryError("Failed to fetch suggestion context") from exc
        return {
            "npcs": cast(list[dict[str, Any]], npcs.data or []),
            "factions": cast(list[dict[str, Any]], factions.data or []),
            "arcs": cast(list[dict[str, Any]], arcs.data or []),
            "memory_facts": cast(list[dict[str, Any]], memory_facts.data or []),
        }
