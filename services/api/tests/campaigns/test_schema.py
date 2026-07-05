"""Schema tests for campaign read response models."""

from __future__ import annotations

from app.modules.campaigns.schemas import (
    ArcResponse,
    CampaignDetailResponse,
    CampaignSummary,
    FactionResponse,
    NpcResponse,
)


def test_campaign_summary_includes_nullable_system_tone_and_entity_counts() -> None:
    summary = CampaignSummary(
        id="campaign-1",
        title="Sombras",
        description=None,
        updated_at="2026-07-02T00:00:00Z",
        system=None,
        tone=None,
        npc_count=2,
        faction_count=1,
        arc_count=3,
    )

    assert summary.model_dump() == {
        "id": "campaign-1",
        "title": "Sombras",
        "description": None,
        "updated_at": "2026-07-02T00:00:00Z",
        "system": None,
        "tone": None,
        "npc_count": 2,
        "faction_count": 1,
        "arc_count": 3,
    }


def test_campaign_detail_response_allows_nullable_fields_and_children() -> None:
    detail = CampaignDetailResponse(
        id="campaign-1",
        title="Sombras",
        description=None,
        world_state=None,
        system=None,
        tone=None,
        updated_at="2026-07-02T00:00:00Z",
        npcs=[NpcResponse(id="npc-1", name="Toblen")],
        factions=[FactionResponse(id="faction-1", name="Guild")],
        arcs=[ArcResponse(id="arc-1", title="Missing caravan", status="open")],
    )

    assert detail.npcs[0].description is None
    assert detail.factions[0].current_stance is None
    assert detail.arcs[0].status == "open"
