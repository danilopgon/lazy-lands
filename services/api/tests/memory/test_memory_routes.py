"""Route tests for the MemoryFact review API."""

from __future__ import annotations

from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.shared.database import get_user_supabase_client
from app.shared.security import AuthContext, get_auth_context


class _FakeSupabaseClient:
    """A per-table mock Supabase client with independent PostgREST chains."""

    def __init__(self) -> None:
        self._tables: dict[str, MagicMock] = {}

    def table(self, name: str) -> MagicMock:
        return self._tables.setdefault(name, MagicMock())


def _client_with_campaign(campaign_row: dict | None) -> _FakeSupabaseClient:
    client = _FakeSupabaseClient()
    campaigns_table = client.table("campaigns")
    campaigns_table.select.return_value.eq.return_value.execute.return_value = (
        MagicMock(data=[campaign_row] if campaign_row is not None else [])
    )
    return client


def _authenticate() -> None:
    app.dependency_overrides[get_auth_context] = lambda: AuthContext(
        user_id="user-1", access_token="token-1"
    )


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture(autouse=True)
def _clear_overrides():
    yield
    app.dependency_overrides.clear()


def _configure_memory_insert(client: _FakeSupabaseClient, row: dict) -> None:
    client.table("memory_facts").insert.return_value.execute.return_value = MagicMock(
        data=[row]
    )


def _configure_memory_list(client: _FakeSupabaseClient, rows: list[dict]) -> None:
    query = client.table("memory_facts").select.return_value.eq.return_value
    query.eq.return_value.order.return_value.execute.return_value = MagicMock(data=rows)


def _configure_memory_fetch(client: _FakeSupabaseClient, row: dict | None) -> None:
    query = client.table("memory_facts").select.return_value.eq.return_value
    query.execute.return_value = MagicMock(data=[row] if row is not None else [])


def _configure_memory_update(client: _FakeSupabaseClient, row: dict) -> None:
    update_query = client.table("memory_facts").update.return_value.eq.return_value
    update_query.execute.return_value = MagicMock(data=[row])


def test_create_memory_fact_persists_active_fact(client) -> None:
    fake_client = _client_with_campaign({"id": "campaign-1"})
    inserted = {
        "id": "memory-1",
        "campaign_id": "campaign-1",
        "source_session_id": "session-1",
        "content": "Captain Vess owes the party a favor.",
        "type": "relationship",
        "importance": "high",
        "status": "active",
        "created_at": "2026-07-09T00:00:00Z",
        "updated_at": "2026-07-09T00:00:00Z",
    }
    _configure_memory_insert(fake_client, inserted)
    app.dependency_overrides[get_user_supabase_client] = lambda: fake_client
    _authenticate()

    response = client.post(
        "/campaigns/campaign-1/memory-facts",
        json={
            "source_session_id": "session-1",
            "content": "Captain Vess owes the party a favor.",
            "type": "relationship",
            "importance": "high",
        },
    )

    assert response.status_code == 201
    body = response.json()
    assert body["id"] == "memory-1"
    assert body["status"] == "active"
    fake_client.table("memory_facts").insert.assert_called_once_with(
        {
            "campaign_id": "campaign-1",
            "source_session_id": "session-1",
            "content": "Captain Vess owes the party a favor.",
            "type": "relationship",
            "importance": "high",
            "status": "active",
        }
    )


def test_create_memory_fact_forged_campaign_id_returns_404(client) -> None:
    fake_client = _client_with_campaign(None)
    app.dependency_overrides[get_user_supabase_client] = lambda: fake_client
    _authenticate()

    response = client.post(
        "/campaigns/forged-campaign/memory-facts",
        json={"content": "Hidden truth.", "type": "secret", "importance": "low"},
    )

    assert response.status_code == 404
    fake_client.table("memory_facts").insert.assert_not_called()


def test_list_memory_facts_filters_active_and_excludes_archived(client) -> None:
    fake_client = _client_with_campaign({"id": "campaign-1"})
    _configure_memory_list(
        fake_client,
        [
            {
                "id": "memory-1",
                "campaign_id": "campaign-1",
                "source_session_id": None,
                "content": "The guild remembers the arson.",
                "type": "consequence",
                "importance": "medium",
                "status": "active",
                "created_at": "2026-07-09T00:00:00Z",
                "updated_at": "2026-07-09T00:00:00Z",
            }
        ],
    )
    app.dependency_overrides[get_user_supabase_client] = lambda: fake_client
    _authenticate()

    response = client.get("/campaigns/campaign-1/memory-facts?status=active")

    assert response.status_code == 200
    assert [row["id"] for row in response.json()] == ["memory-1"]
    query = fake_client.table("memory_facts").select.return_value.eq.return_value
    query.eq.assert_called_once_with("status", "active")


def test_patch_memory_fact_archives_owned_fact(client) -> None:
    fake_client = _client_with_campaign({"id": "campaign-1"})
    existing = {
        "id": "memory-1",
        "campaign_id": "campaign-1",
        "source_session_id": None,
        "content": "The guild remembers the arson.",
        "type": "consequence",
        "importance": "medium",
        "status": "active",
        "created_at": "2026-07-09T00:00:00Z",
        "updated_at": "2026-07-09T00:00:00Z",
    }
    archived = {**existing, "status": "archived"}
    _configure_memory_fetch(fake_client, existing)
    _configure_memory_update(fake_client, archived)
    app.dependency_overrides[get_user_supabase_client] = lambda: fake_client
    _authenticate()

    response = client.patch("/memory-facts/memory-1", json={"status": "archived"})

    assert response.status_code == 200
    assert response.json()["status"] == "archived"
    fake_client.table("memory_facts").update.assert_called_once_with(
        {"status": "archived"}
    )


def test_patch_memory_fact_forged_id_returns_404(client) -> None:
    fake_client = _client_with_campaign({"id": "campaign-1"})
    _configure_memory_fetch(fake_client, None)
    app.dependency_overrides[get_user_supabase_client] = lambda: fake_client
    _authenticate()

    response = client.patch("/memory-facts/forged-memory", json={"status": "archived"})

    assert response.status_code == 404
    fake_client.table("memory_facts").update.assert_not_called()


def test_patch_memory_fact_empty_body_returns_422(client) -> None:
    fake_client = _client_with_campaign({"id": "campaign-1"})
    app.dependency_overrides[get_user_supabase_client] = lambda: fake_client
    _authenticate()

    response = client.patch("/memory-facts/memory-1", json={})

    assert response.status_code == 422
    fake_client.table("memory_facts").update.assert_not_called()
