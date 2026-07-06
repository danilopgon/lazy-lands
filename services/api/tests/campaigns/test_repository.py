"""Tests for SupabaseCampaignRepository (CP-003, CP-005, NFR-CP-3).

Uses a mocked Supabase ``Client`` (faked PostgREST chain) rather than a live
local stack, so these run deterministically without Docker. The ordering and
compensating-delete behavior is what's under test, not PostgREST wire
behavior itself (covered separately by test_schema.py's live-DB assertions).
"""

from __future__ import annotations

from unittest.mock import MagicMock

import pytest

from app.modules.campaigns.domain.arc import NewArc
from app.modules.campaigns.domain.faction import Faction
from app.modules.campaigns.domain.npc import NPC
from app.modules.campaigns.infrastructure.errors import RepositoryError
from app.modules.campaigns.infrastructure.repository import SupabaseCampaignRepository


def _mock_client_with_campaign_id(campaign_id: str = "campaign-1") -> MagicMock:
    """A mock Client whose campaigns insert().execute() returns one row."""
    client = MagicMock()
    execute_result = MagicMock()
    execute_result.data = [{"id": campaign_id}]
    client.table.return_value.insert.return_value.execute.return_value = execute_result
    return client


def test_insert_campaign_returns_new_id() -> None:
    client = _mock_client_with_campaign_id("campaign-abc")
    repo = SupabaseCampaignRepository(client)

    campaign_id = repo.insert_campaign("user-1", "T", "D", "W", "S", None)

    assert campaign_id == "campaign-abc"
    client.table.assert_any_call("campaigns")


def test_insert_campaign_writes_system_and_tone() -> None:
    client = _mock_client_with_campaign_id("campaign-1")
    repo = SupabaseCampaignRepository(client)

    repo.insert_campaign("user-1", "T", "D", "W", "D&D 5e", "Grim")

    insert_arg = client.table.return_value.insert.call_args[0][0]
    assert insert_arg["system"] == "D&D 5e"
    assert insert_arg["tone"] == "Grim"


def test_insert_campaign_writes_null_tone_when_absent() -> None:
    client = _mock_client_with_campaign_id("campaign-1")
    repo = SupabaseCampaignRepository(client)

    repo.insert_campaign("user-1", "T", "D", "W", "D&D 5e", None)

    insert_arg = client.table.return_value.insert.call_args[0][0]
    assert insert_arg["system"] == "D&D 5e"
    assert insert_arg["tone"] is None


def test_insert_campaign_raises_repository_error_when_no_rows_returned() -> None:
    client = MagicMock()
    execute_result = MagicMock()
    execute_result.data = []
    client.table.return_value.insert.return_value.execute.return_value = execute_result
    repo = SupabaseCampaignRepository(client)

    with pytest.raises(RepositoryError):
        repo.insert_campaign("user-1", "T", "D", "W", "S", None)


def test_insert_npcs_no_op_when_empty() -> None:
    client = MagicMock()
    repo = SupabaseCampaignRepository(client)

    repo.insert_npcs("campaign-1", [])

    client.table.assert_not_called()


def test_insert_npcs_writes_content_source_and_campaign_id() -> None:
    client = MagicMock()
    repo = SupabaseCampaignRepository(client)
    npc = NPC(
        name="N",
        description="d",
        current_state="s",
        motivation="m",
        content_source="llm",
    )

    repo.insert_npcs("campaign-1", [npc])

    client.table.assert_any_call("npcs")
    insert_call = client.table.return_value.insert
    inserted_rows = insert_call.call_args[0][0]
    assert inserted_rows[0]["campaign_id"] == "campaign-1"
    assert inserted_rows[0]["content_source"] == "llm"


def test_insert_arcs_sets_status_open_and_persists_content_source() -> None:
    client = MagicMock()
    repo = SupabaseCampaignRepository(client)
    arc = NewArc(title="A", description="d", priority="high", content_source="edited")

    repo.insert_arcs("campaign-1", [arc])

    insert_call = client.table.return_value.insert
    inserted_rows = insert_call.call_args[0][0]
    assert inserted_rows[0]["status"] == "open"
    assert inserted_rows[0]["priority"] == "high"
    assert inserted_rows[0]["content_source"] == "edited"


def test_insert_factions_writes_expected_shape() -> None:
    client = MagicMock()
    repo = SupabaseCampaignRepository(client)
    faction = Faction(
        name="F",
        description="d",
        current_stance="s",
        goals="g",
        content_source="manual",
    )

    repo.insert_factions("campaign-1", [faction])

    insert_call = client.table.return_value.insert
    inserted_rows = insert_call.call_args[0][0]
    assert inserted_rows[0]["campaign_id"] == "campaign-1"
    assert inserted_rows[0]["content_source"] == "manual"


def test_write_wraps_postgrest_exception_as_repository_error() -> None:
    client = MagicMock()
    client.table.return_value.insert.return_value.execute.side_effect = Exception(
        "PostgREST failure"
    )
    repo = SupabaseCampaignRepository(client)
    npc = NPC(
        name="N",
        description="d",
        current_state="s",
        motivation="m",
        content_source="llm",
    )

    with pytest.raises(RepositoryError):
        repo.insert_npcs("campaign-1", [npc])


def test_delete_campaign_wraps_postgrest_exception() -> None:
    client = MagicMock()
    delete_chain = client.table.return_value.delete.return_value.eq.return_value
    delete_chain.execute.side_effect = Exception("delete failed")
    repo = SupabaseCampaignRepository(client)

    with pytest.raises(RepositoryError):
        repo.delete_campaign("campaign-1")


def test_delete_campaign_calls_eq_id(client=None) -> None:
    client = MagicMock()
    repo = SupabaseCampaignRepository(client)

    repo.delete_campaign("campaign-1")

    client.table.assert_any_call("campaigns")
    client.table.return_value.delete.return_value.eq.assert_called_once_with(
        "id", "campaign-1"
    )


def test_list_campaigns_selects_summary_fields_ordered_by_updated_at_desc() -> None:
    client = MagicMock()
    execute_result = MagicMock()
    execute_result.data = [
        {"id": "new", "title": "New", "updated_at": "2026-07-02T00:00:00Z"},
        {"id": "old", "title": "Old", "updated_at": "2026-07-01T00:00:00Z"},
    ]
    order_query = client.table.return_value.select.return_value.order.return_value
    order_query.execute.return_value = execute_result
    repo = SupabaseCampaignRepository(client)

    rows = repo.list_campaigns()

    assert [row["id"] for row in rows] == ["new", "old"]
    client.table.assert_any_call("campaigns")
    client.table.return_value.select.assert_called_once()
    select_arg = client.table.return_value.select.call_args[0][0]
    # system/tone columns exist after Migration A (WU3) and are selected.
    assert "system" in select_arg
    assert "tone" in select_arg
    client.table.return_value.select.return_value.order.assert_called_once_with(
        "updated_at", desc=True
    )


def test_list_campaigns_normalizes_empty_count_lists_to_zero() -> None:
    client = MagicMock()
    execute_result = MagicMock()
    execute_result.data = [
        {
            "id": "campaign-1",
            "title": "Sombras",
            "npc_count": [],
            "faction_count": [],
            "arc_count": [],
        }
    ]
    order_query = client.table.return_value.select.return_value.order.return_value
    order_query.execute.return_value = execute_result
    repo = SupabaseCampaignRepository(client)

    rows = repo.list_campaigns()

    assert rows[0]["npc_count"] == 0
    assert rows[0]["faction_count"] == 0
    assert rows[0]["arc_count"] == 0


def test_get_campaign_returns_first_row_or_none_on_rls_miss() -> None:
    client = MagicMock()
    execute_result = MagicMock()
    execute_result.data = [{"id": "campaign-1", "title": "Visible"}]
    query = client.table.return_value.select.return_value.eq.return_value
    query.execute.return_value = execute_result
    repo = SupabaseCampaignRepository(client)

    row = repo.get_campaign("campaign-1")

    assert row == {"id": "campaign-1", "title": "Visible"}
    client.table.assert_any_call("campaigns")
    select_arg = client.table.return_value.select.call_args[0][0]
    # system/tone columns exist after Migration A (WU3) and are selected.
    assert "system" in select_arg
    assert "tone" in select_arg
    client.table.return_value.select.return_value.eq.assert_called_once_with(
        "id", "campaign-1"
    )

    execute_result.data = []
    assert repo.get_campaign("missing") is None


def test_get_campaign_children_returns_all_child_collections() -> None:
    client = MagicMock()
    npc_result = MagicMock(data=[{"id": "npc-1", "name": "Toblen"}])
    faction_result = MagicMock(data=[])
    arc_result = MagicMock(data=[{"id": "arc-1", "title": "Missing caravan"}])
    eq_query = client.table.return_value.select.return_value.eq.return_value
    eq_query.execute.side_effect = [
        npc_result,
        faction_result,
        arc_result,
    ]
    repo = SupabaseCampaignRepository(client)

    npcs, factions, arcs = repo.get_campaign_children("campaign-1")

    assert npcs == [{"id": "npc-1", "name": "Toblen"}]
    assert factions == []
    assert arcs == [{"id": "arc-1", "title": "Missing caravan"}]
    assert [call.args[0] for call in client.table.call_args_list[-3:]] == [
        "npcs",
        "factions",
        "arcs",
    ]
