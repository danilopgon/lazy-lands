"""GenerationRepository port for the generation bounded context."""

from typing import Protocol


class GenerationRepository(Protocol):
    """Persistence contract used by next-session generation use cases."""

    def get_generation_context(self, campaign_id: str) -> dict | None:
        """Return caller-visible campaign context, or None on RLS miss."""
        ...

    def create_generated_session(self, campaign_id: str, session_data: dict) -> dict:
        """Persist a generated session draft and return the inserted row."""
        ...

    def record_generation_trace(self, campaign_id: str, trace_json: dict) -> None:
        """Record trace metadata for failed generations without creating a session."""
        ...
