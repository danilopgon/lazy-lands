"""Tests for SupabaseSessionRepository numbering, insert, list, and summary update.

Uses a mocked Supabase ``Client`` (faked PostgREST chain), matching the
campaigns module's repository test convention (test_repository.py).
"""

from __future__ import annotations

from unittest.mock import MagicMock

import pytest

from app.modules.sessions.infrastructure.errors import RepositoryError
from app.modules.sessions.infrastructure.repository import SupabaseSessionRepository


def test_get_next_session_number_returns_one_when_no_sessions_exist() -> None:
    client = MagicMock()
    execute_result = MagicMock(data=[])
    order_query = (
        client.table.return_value.select.return_value.eq.return_value.order.return_value
    )
    order_query.limit.return_value.execute.return_value = execute_result
    repo = SupabaseSessionRepository(client)

    number = repo.get_next_session_number("campaign-1")

    assert number == 1


def test_get_next_session_number_returns_max_plus_one() -> None:
    client = MagicMock()
    execute_result = MagicMock(data=[{"session_number": 4}])
    order_query = (
        client.table.return_value.select.return_value.eq.return_value.order.return_value
    )
    order_query.limit.return_value.execute.return_value = execute_result
    repo = SupabaseSessionRepository(client)

    number = repo.get_next_session_number("campaign-1")

    assert number == 5


def test_insert_session_returns_inserted_row() -> None:
    client = MagicMock()
    execute_result = MagicMock(
        data=[
            {
                "id": "session-1",
                "campaign_id": "campaign-1",
                "session_number": 1,
                "summary": "The party arrived.",
                "consequences": None,
                "created_at": "2026-07-08T00:00:00Z",
            }
        ]
    )
    client.table.return_value.insert.return_value.execute.return_value = execute_result
    repo = SupabaseSessionRepository(client)

    row = repo.insert_session("campaign-1", 1, "The party arrived.", None)

    assert row["id"] == "session-1"
    assert row["session_number"] == 1
    insert_arg = client.table.return_value.insert.call_args[0][0]
    assert insert_arg["campaign_id"] == "campaign-1"
    assert insert_arg["session_number"] == 1
    assert insert_arg["summary"] == "The party arrived."
    assert insert_arg["consequences"] is None


def test_insert_session_raises_repository_error_when_no_rows_returned() -> None:
    client = MagicMock()
    execute_result = MagicMock(data=[])
    client.table.return_value.insert.return_value.execute.return_value = execute_result
    repo = SupabaseSessionRepository(client)

    with pytest.raises(RepositoryError):
        repo.insert_session("campaign-1", 1, "summary", None)


def test_insert_session_wraps_postgrest_exception() -> None:
    client = MagicMock()
    client.table.return_value.insert.return_value.execute.side_effect = Exception(
        "PostgREST failure"
    )
    repo = SupabaseSessionRepository(client)

    with pytest.raises(RepositoryError):
        repo.insert_session("campaign-1", 1, "summary", None)


def test_list_sessions_orders_ascending_by_session_number() -> None:
    client = MagicMock()
    execute_result = MagicMock(
        data=[
            {"id": "s1", "session_number": 1},
            {"id": "s2", "session_number": 2},
        ]
    )
    order_query = client.table.return_value.select.return_value.eq.return_value.order
    order_query.return_value.execute.return_value = execute_result
    repo = SupabaseSessionRepository(client)

    rows = repo.list_sessions("campaign-1")

    assert [row["id"] for row in rows] == ["s1", "s2"]
    order_query.assert_called_once_with("session_number", desc=False)


def test_get_campaign_returns_first_row_or_none_on_rls_miss() -> None:
    client = MagicMock()
    execute_result = MagicMock(
        data=[
            {
                "id": "campaign-1",
                "accumulated_summary": None,
                "summarized_up_to_session": None,
            }
        ]
    )
    query = client.table.return_value.select.return_value.eq.return_value
    query.execute.return_value = execute_result
    repo = SupabaseSessionRepository(client)

    row = repo.get_campaign("campaign-1")

    assert row is not None
    assert row["id"] == "campaign-1"

    execute_result.data = []
    assert repo.get_campaign("missing") is None


def test_update_campaign_summary_patches_expected_columns() -> None:
    client = MagicMock()
    repo = SupabaseSessionRepository(client)

    repo.update_campaign_summary("campaign-1", "Updated summary.", 3)

    client.table.assert_any_call("campaigns")
    update_call = client.table.return_value.update
    update_arg = update_call.call_args[0][0]
    assert update_arg["accumulated_summary"] == "Updated summary."
    assert update_arg["summarized_up_to_session"] == 3
    client.table.return_value.update.return_value.eq.assert_called_once_with(
        "id", "campaign-1"
    )
