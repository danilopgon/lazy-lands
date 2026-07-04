"""Tests for SupabaseCampaignRepository (CP-003, CP-005, NFR-CP-3).

Uses a mocked Supabase ``Client`` (faked PostgREST chain) rather than a live
local stack, so these run deterministically without Docker. The ordering and
compensating-delete behavior is what's under test, not PostgREST wire
behavior itself (covered separately by test_schema.py's live-DB assertions).
"""

from __future__ import annotations

from unittest.mock import MagicMock

import pytest

from app.modules.campaigns.infrastructure.errors import RepositoryError
from app.modules.campaigns.infrastructure.repository import SupabaseCampaignRepository
from app.modules.campaigns.schemas import (
    CreateArcRequest,
    CreateCampaignRequest,
    CreateFactionRequest,
    CreateNpcRequest,
)


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
    data = CreateCampaignRequest(title="T", description="D", world_state="W")

    campaign_id = repo.insert_campaign("user-1", data)

    assert campaign_id == "campaign-abc"
    client.table.assert_any_call("campaigns")


def test_insert_campaign_raises_repository_error_when_no_rows_returned() -> None:
    client = MagicMock()
    execute_result = MagicMock()
    execute_result.data = []
    client.table.return_value.insert.return_value.execute.return_value = execute_result
    repo = SupabaseCampaignRepository(client)
    data = CreateCampaignRequest(title="T", description="D", world_state="W")

    with pytest.raises(RepositoryError):
        repo.insert_campaign("user-1", data)


def test_insert_npcs_no_op_when_empty() -> None:
    client = MagicMock()
    repo = SupabaseCampaignRepository(client)

    repo.insert_npcs("campaign-1", [])

    client.table.assert_not_called()


def test_insert_npcs_writes_content_source_and_campaign_id() -> None:
    client = MagicMock()
    repo = SupabaseCampaignRepository(client)
    npc = CreateNpcRequest(
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
    arc = CreateArcRequest(
        title="A", description="d", priority="high", content_source="edited"
    )

    repo.insert_arcs("campaign-1", [arc])

    insert_call = client.table.return_value.insert
    inserted_rows = insert_call.call_args[0][0]
    assert inserted_rows[0]["status"] == "open"
    assert inserted_rows[0]["priority"] == "high"
    assert inserted_rows[0]["content_source"] == "edited"


def test_insert_factions_writes_expected_shape() -> None:
    client = MagicMock()
    repo = SupabaseCampaignRepository(client)
    faction = CreateFactionRequest(
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
    npc = CreateNpcRequest(
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
