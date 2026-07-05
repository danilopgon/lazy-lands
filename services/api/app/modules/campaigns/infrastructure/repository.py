"""SupabaseCampaignRepository — persists campaigns and children via the per-user client.

NEVER imports ``get_supabase_client()`` (the service-role singleton) — every
write here goes through the caller-scoped client injected at construction
time (PU-003, NFR-CP-1).
"""

from typing import Any, cast

from supabase import Client

from app.modules.campaigns.domain.models import ArcStatus
from app.modules.campaigns.infrastructure.errors import RepositoryError
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

    def list_campaigns(self) -> list[dict]:
        """List caller-visible campaigns ordered by most recent update."""
        try:
            response = (
                self._client.table("campaigns")
                # system/tone are re-added in WU3 alongside the migration that
                # creates those columns; selecting them before they exist makes
                # PostgREST 400 ("column does not exist"), not return null.
                .select(
                    "id,title,description,updated_at,"
                    "npc_count:npcs(count),"
                    "faction_count:factions(count),"
                    "arc_count:arcs(count)"
                )
                .order("updated_at", desc=True)
                .execute()
            )
        except Exception as exc:
            raise RepositoryError("Failed to list campaigns") from exc
        rows = cast(list[dict[str, Any]], response.data or [])
        return [self._normalize_campaign_summary(row) for row in rows]

    def get_campaign(self, campaign_id: str) -> dict | None:
        """Fetch a single caller-visible campaign, returning None on RLS miss."""
        try:
            response = (
                self._client.table("campaigns")
                # system/tone are re-added in WU3 with the migration that creates them.
                .select("id,title,description,world_state,updated_at")
                .eq("id", campaign_id)
                .execute()
            )
        except Exception as exc:
            raise RepositoryError("Failed to get campaign") from exc
        rows = cast(list[dict[str, Any]], response.data or [])
        return rows[0] if rows else None

    def get_campaign_children(
        self, campaign_id: str
    ) -> tuple[list[dict], list[dict], list[dict]]:
        """Fetch NPCs, factions, and arcs for a campaign through caller-scoped RLS."""
        try:
            npcs = (
                self._client.table("npcs")
                .select("id,name,description,current_state,motivation,content_source")
                .eq("campaign_id", campaign_id)
                .execute()
            )
            factions = (
                self._client.table("factions")
                .select("id,name,description,current_stance,goals,content_source")
                .eq("campaign_id", campaign_id)
                .execute()
            )
            arcs = (
                self._client.table("arcs")
                .select("id,title,description,priority,status,content_source")
                .eq("campaign_id", campaign_id)
                .execute()
            )
        except Exception as exc:
            raise RepositoryError("Failed to get campaign children") from exc
        return (
            cast(list[dict[str, Any]], npcs.data or []),
            cast(list[dict[str, Any]], factions.data or []),
            cast(list[dict[str, Any]], arcs.data or []),
        )

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

    @staticmethod
    def _normalize_campaign_summary(row: dict[str, Any]) -> dict[str, Any]:
        normalized = dict(row)
        for output_key in ("npc_count", "faction_count", "arc_count"):
            value = normalized.get(output_key)
            if isinstance(value, list) and value and isinstance(value[0], dict):
                normalized[output_key] = value[0].get("count", 0)
            elif value is None or value == []:
                normalized[output_key] = 0
        return normalized
