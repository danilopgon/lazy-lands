"""SupabaseCampaignRepository — persists campaigns and children via the per-user client.

NEVER imports ``get_supabase_client()`` (the service-role singleton) — every
write here goes through the caller-scoped client injected at construction
time (PU-003, NFR-CP-1).
"""

from typing import Any

from supabase import Client

from app.modules.campaigns.domain.models import ArcStatus
from app.modules.campaigns.domain.ports import RepositoryError
from app.modules.campaigns.schemas import (
    CreateArcRequest,
    CreateCampaignRequest,
    CreateFactionRequest,
    CreateNpcRequest,
)


class SupabaseCampaignRepository:
    """``CampaignRepository`` implementation backed by a per-user Supabase client."""

    def __init__(self, client: Client) -> None:
        """Initialize with a per-user (never service-role) Supabase client."""
        self._client = client

    def insert_campaign(self, user_id: str, data: CreateCampaignRequest) -> str:
        """Insert the campaign row; return the new campaign id."""
        try:
            response = (
                self._client.table("campaigns")
                .insert(
                    {
                        "user_id": user_id,
                        "title": data.title,
                        "description": data.description,
                        "world_state": data.world_state,
                    }
                )
                .execute()
            )
        except Exception as exc:
            raise RepositoryError("Failed to insert campaign") from exc

        rows = response.data
        if not rows or not isinstance(rows[0], dict):
            raise RepositoryError("Campaign insert returned no rows")
        return str(rows[0]["id"])

    def insert_npcs(self, campaign_id: str, npcs: list[CreateNpcRequest]) -> None:
        """Bulk-insert NPC rows. No-op if empty."""
        if not npcs:
            return
        rows: list[dict[str, Any]] = [
            {
                "campaign_id": campaign_id,
                "name": npc.name,
                "description": npc.description,
                "current_state": npc.current_state,
                "motivation": npc.motivation,
                "content_source": npc.content_source.value,
            }
            for npc in npcs
        ]
        self._write("npcs", rows)

    def insert_factions(
        self, campaign_id: str, factions: list[CreateFactionRequest]
    ) -> None:
        """Bulk-insert faction rows. No-op if empty."""
        if not factions:
            return
        rows: list[dict[str, Any]] = [
            {
                "campaign_id": campaign_id,
                "name": faction.name,
                "description": faction.description,
                "current_stance": faction.current_stance,
                "goals": faction.goals,
                "content_source": faction.content_source.value,
            }
            for faction in factions
        ]
        self._write("factions", rows)

    def insert_arcs(self, campaign_id: str, arcs: list[CreateArcRequest]) -> None:
        """Bulk-insert arc rows with status="open". No-op if empty."""
        if not arcs:
            return
        rows: list[dict[str, Any]] = [
            {
                "campaign_id": campaign_id,
                "title": arc.title,
                "description": arc.description,
                "priority": arc.priority.value,
                "status": ArcStatus.open.value,
                "content_source": arc.content_source.value,
            }
            for arc in arcs
        ]
        self._write("arcs", rows)

    def delete_campaign(self, campaign_id: str) -> None:
        """Compensating delete; ON DELETE CASCADE removes any children too."""
        try:
            self._client.table("campaigns").delete().eq("id", campaign_id).execute()
        except Exception as exc:
            raise RepositoryError("Failed to delete campaign") from exc

    def _write(self, table: str, rows: list[dict[str, Any]]) -> None:
        try:
            self._client.table(table).insert(rows).execute()
        except Exception as exc:
            raise RepositoryError(f"Failed to insert into {table}") from exc
