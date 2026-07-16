"""SupabaseSessionRepository — persists sessions via the per-user client.

NEVER imports ``get_supabase_client()`` (the service-role singleton) — every
write here goes through the caller-scoped client injected at construction
time (PU-003, NFR-CP-1), matching the campaigns module's repository.
"""

from typing import Any, cast

from postgrest import APIError
from supabase import Client

from app.modules.sessions.infrastructure.errors import (
    RepositoryError,
    SessionNumberConflictError,
)

# Postgres SQLSTATE for a unique-constraint violation (23505). PostgREST
# surfaces the DB error code verbatim on ``APIError.code`` — matching on this
# exact code (never a loose string match on the message) is what lets the
# retry loop below distinguish a genuine session_number race from any other
# insert failure.
_UNIQUE_VIOLATION_CODE = "23505"

_DEFAULT_MAX_ATTEMPTS = 5


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

    def get_campaign_owner(self, campaign_id: str) -> str | None:
        """Fetch a caller-visible campaign owner id for ownership helpers."""
        try:
            response = (
                self._client.table("campaigns")
                .select("user_id")
                .eq("id", campaign_id)
                .execute()
            )
        except Exception as exc:
            raise RepositoryError("Failed to get campaign owner") from exc
        rows = cast(list[dict[str, Any]], response.data or [])
        if not rows:
            return None
        return cast(str | None, rows[0].get("user_id"))

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
        """Insert an ad-hoc, already-played session row; return the inserted row.

        Writes ``status='registered'`` explicitly rather than leaning on the
        column default: this path records a session the DM already played, and
        the marker that keeps it from being mistaken for a resumable draft is
        too load-bearing to leave implicit.

        Raises:
            SessionNumberConflictError: The ``(campaign_id, session_number)``
                unique constraint fired (a race with a concurrent/retried
                insert for the same campaign). A ``RepositoryError``
                subclass, so any caller only ever catching the base class
                still works unchanged.
            RepositoryError: Any other insert failure.
        """
        try:
            response = (
                self._client.table("sessions")
                .insert(
                    {
                        "campaign_id": campaign_id,
                        "session_number": session_number,
                        "summary": summary,
                        "consequences": consequences,
                        "status": "registered",
                    }
                )
                .execute()
            )
        except APIError as exc:
            if exc.code == _UNIQUE_VIOLATION_CODE:
                raise SessionNumberConflictError(
                    "Duplicate (campaign_id, session_number)"
                ) from exc
            raise RepositoryError("Failed to insert session") from exc
        except Exception as exc:
            raise RepositoryError("Failed to insert session") from exc
        rows = cast(list[dict[str, Any]], response.data or [])
        if not rows:
            raise RepositoryError("Session insert returned no rows")
        return rows[0]

    def insert_session_with_next_number(
        self,
        campaign_id: str,
        summary: str,
        consequences: str | None,
        max_attempts: int = _DEFAULT_MAX_ATTEMPTS,
    ) -> dict:
        """Insert a session, recomputing ``MAX(session_number) + 1`` on conflict.

        Hardens the read-then-insert race (design hardening item, Block 7a):
        two concurrent/retried registrations for the same campaign can read
        the same ``MAX(session_number)`` before either insert commits. On a
        genuine unique-constraint conflict this recomputes the next number
        and retries, up to ``max_attempts``, instead of trusting the first
        read alone.

        Raises:
            RepositoryError: Every attempt hit a session_number conflict (or
                any other insert failure occurred).
        """
        last_conflict: SessionNumberConflictError | None = None
        for _attempt in range(max_attempts):
            session_number = self.get_next_session_number(campaign_id)
            try:
                return self.insert_session(
                    campaign_id, session_number, summary, consequences
                )
            except SessionNumberConflictError as exc:
                last_conflict = exc
                continue
        raise RepositoryError(
            f"Failed to insert session after {max_attempts} attempts "
            "due to session_number conflicts"
        ) from last_conflict

    def list_sessions(self, campaign_id: str) -> list[dict]:
        """List a campaign's sessions, ascending by ``session_number``."""
        try:
            response = (
                self._client.table("sessions")
                .select(
                    "id,session_number,summary,consequences,generated_content,"
                    "status,created_at"
                )
                .eq("campaign_id", campaign_id)
                .order("session_number", desc=False)
                .execute()
            )
        except Exception as exc:
            raise RepositoryError("Failed to list sessions") from exc
        return [
            {
                **{
                    key: value
                    for key, value in row.items()
                    if key != "generated_content"
                },
                "has_generated_content": row.get("generated_content") is not None,
            }
            for row in cast(list[dict[str, Any]], response.data or [])
        ]

    def get_session(self, session_id: str) -> dict | None:
        """Fetch a single caller-visible session with generated draft JSON."""
        try:
            response = (
                self._client.table("sessions")
                .select(
                    "id,campaign_id,session_number,summary,consequences,"
                    "generated_content,status,trace_json,created_at,updated_at"
                )
                .eq("id", session_id)
                .execute()
            )
        except Exception as exc:
            raise RepositoryError("Failed to get session") from exc
        rows = cast(list[dict[str, Any]], response.data or [])
        return rows[0] if rows else None

    def update_session(self, session_id: str, data: dict) -> dict:
        """Patch summary/consequences/generated_content and return the updated row."""
        try:
            response = (
                self._client.table("sessions")
                .update(data)
                .eq("id", session_id)
                .execute()
            )
        except Exception as exc:
            raise RepositoryError("Failed to update session") from exc
        rows = cast(list[dict[str, Any]], response.data or [])
        if not rows:
            raise RepositoryError("Session update returned no rows")
        return rows[0]

    def complete_draft(
        self, session_id: str, summary: str, consequences: str | None
    ) -> dict | None:
        """Atomically transition a caller-visible draft to a registered session.

        The status predicate belongs in the database update rather than the
        use case's prior read. That conditional write permits exactly one
        concurrent completer to persist the DM's account.
        """
        try:
            response = (
                self._client.table("sessions")
                .update(
                    {
                        "summary": summary,
                        "consequences": consequences,
                        "status": "registered",
                    }
                )
                .eq("id", session_id)
                .eq("status", "draft")
                .execute()
            )
        except Exception as exc:
            raise RepositoryError("Failed to complete draft session") from exc
        rows = cast(list[dict[str, Any]], response.data or [])
        return rows[0] if rows else None

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
