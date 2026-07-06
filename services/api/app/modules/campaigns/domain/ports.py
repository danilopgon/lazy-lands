"""CampaignRepository port (ADR-05 — application depends on this, not Supabase)."""

from typing import Protocol

from app.modules.campaigns.domain.arc import NewArc
from app.modules.campaigns.domain.faction import Faction
from app.modules.campaigns.domain.npc import NPC


class CampaignRepository(Protocol):
    """Ordered-insert persistence contract for campaigns and their children.

    Split into granular methods (rather than one atomic ``create_campaign``)
    so the application layer (``CreateCampaign`` use case) can orchestrate
    the parent-first insert order and issue a compensating delete on child
    failure (design Decision 5).

    Parameter types are domain entities (or plain scalars), never HTTP DTOs —
    the domain layer must not depend on the outer ``api`` layer (ADR-05).
    """

    def list_campaigns(self) -> list[dict]:
        """List campaigns visible to the caller, ordered newest first."""
        ...

    def get_campaign(self, campaign_id: str) -> dict | None:
        """Return one caller-visible campaign row, or None on RLS miss."""
        ...

    def get_campaign_children(
        self, campaign_id: str
    ) -> tuple[list[dict], list[dict], list[dict]]:
        """Return NPC, faction, and arc rows for a caller-visible campaign."""
        ...

    def insert_campaign(
        self,
        user_id: str,
        title: str,
        description: str,
        world_state: str,
        system: str,
        tone: str | None,
    ) -> str:
        """Insert the campaign row; return the new campaign id."""
        ...

    def insert_npcs(self, campaign_id: str, npcs: list[NPC]) -> None:
        """Bulk-insert NPC rows for the given campaign. No-op if empty."""
        ...

    def insert_factions(self, campaign_id: str, factions: list[Faction]) -> None:
        """Bulk-insert faction rows for the given campaign. No-op if empty."""
        ...

    def insert_arcs(self, campaign_id: str, arcs: list[NewArc]) -> None:
        """Bulk-insert arc rows for the given campaign. No-op if empty."""
        ...

    def delete_campaign(self, campaign_id: str) -> None:
        """Compensating delete; cascades to any already-inserted children."""
        ...
