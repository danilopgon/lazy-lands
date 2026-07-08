"""SessionRepository port (ADR-05 — application depends on this, not Supabase)."""

from typing import Protocol


class SessionRepository(Protocol):
    """Ownership-scoped persistence contract for sessions and campaign summaries.

    Parameter/return types are plain dicts (never HTTP DTOs) so the
    application layer never depends on the outer ``api`` layer (ADR-05). No
    frozen ``Session`` domain entity is introduced (design Decision 3
    precedent: dict-at-repository-boundary).
    """

    def get_campaign(self, campaign_id: str) -> dict | None:
        """Return one caller-visible campaign row, or None on RLS miss.

        Includes ``accumulated_summary`` and ``summarized_up_to_session`` so
        callers can orchestrate summarization without a second round trip.
        """
        ...

    def get_next_session_number(self, campaign_id: str) -> int:
        """Return ``MAX(session_number) + 1`` for the campaign (1 if none exist)."""
        ...

    def insert_session(
        self,
        campaign_id: str,
        session_number: int,
        summary: str,
        consequences: str | None,
    ) -> dict:
        """Insert the session row; return the inserted row."""
        ...

    def list_sessions(self, campaign_id: str) -> list[dict]:
        """List a campaign's sessions, ascending by ``session_number``."""
        ...

    def get_sessions_since(
        self, campaign_id: str, since_session_number: int
    ) -> list[dict]:
        """List sessions with ``session_number`` greater than the given value.

        Ascending by ``session_number``. Used as the summarization delta —
        includes any previously skipped/failed sessions, not just the newest
        one (self-healing, design Decision 4).
        """
        ...

    def update_campaign_summary(
        self,
        campaign_id: str,
        accumulated_summary: str,
        summarized_up_to_session: int,
    ) -> None:
        """Patch the campaign's summary state at the repository boundary.

        The frozen ``Campaign`` entity is never extended (design Decision 3).
        """
        ...

    def get_suggestion_context(self, campaign_id: str) -> dict:
        """Return the direct relational fetch used to build suggest input.

        Includes campaign state, NPCs, factions, open arcs, and active
        memory facts — no RAG/embeddings/vector search (explicit non-goal).
        """
        ...
