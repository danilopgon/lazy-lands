"""Route tests for campaign read endpoints."""

from __future__ import annotations

from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.shared.database import get_user_supabase_client
from app.shared.security import AuthContext, get_auth_context

CAMPAIGN_ID = "11111111-1111-4111-8111-111111111111"


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


@pytest.fixture(autouse=True)
def _clear_overrides():
    yield
    app.dependency_overrides.clear()


def _auth() -> AuthContext:
    return AuthContext(user_id="user-1", access_token="token-1")


def test_get_campaigns_returns_owned_campaigns_with_counts(client: TestClient) -> None:
    mock_client = MagicMock()
    result = MagicMock(
        data=[
            {
                "id": "campaign-1",
                "title": "Sombras",
                "description": None,
                "updated_at": "2026-07-02T00:00:00Z",
                "system": None,
                "tone": None,
                "npc_count": 2,
                "faction_count": 1,
                "arc_count": 3,
                "session_count": [{"count": 5}],
            }
        ]
    )
    select_rv = mock_client.table.return_value.select.return_value
    order_query = select_rv.order.return_value
    order_query.execute.return_value = result
    memory_query = select_rv.in_.return_value.eq.return_value.range.return_value
    memory_query.execute.return_value = MagicMock(
        data=[
            {"campaign_id": "campaign-1"},
            {"campaign_id": "campaign-1"},
            {"campaign_id": "campaign-1"},
        ]
    )
    app.dependency_overrides[get_auth_context] = _auth
    app.dependency_overrides[get_user_supabase_client] = lambda: mock_client

    response = client.get("/campaigns")

    assert response.status_code == 200
    assert response.json() == [
        {
            "id": "campaign-1",
            "title": "Sombras",
            "description": None,
            "updated_at": "2026-07-02T00:00:00Z",
            "system": None,
            "tone": None,
            "npc_count": 2,
            "faction_count": 1,
            "arc_count": 3,
            "session_count": 5,
            "memory_count": 3,
        }
    ]


def test_get_campaigns_returns_empty_list(client: TestClient) -> None:
    mock_client = MagicMock()
    result = MagicMock(data=[])
    order_query = mock_client.table.return_value.select.return_value.order.return_value
    order_query.execute.return_value = result
    app.dependency_overrides[get_auth_context] = _auth
    app.dependency_overrides[get_user_supabase_client] = lambda: mock_client

    response = client.get("/campaigns")

    assert response.status_code == 200
    assert response.json() == []


def test_get_campaigns_unauthenticated_returns_401() -> None:
    local_client = TestClient(app)

    response = local_client.get("/campaigns")

    assert response.status_code == 401


def test_get_campaign_detail_unauthenticated_returns_401() -> None:
    local_client = TestClient(app)

    response = local_client.get(f"/campaigns/{CAMPAIGN_ID}")

    assert response.status_code == 401


@pytest.mark.parametrize("campaign_id", ["unknown", "undefined"])
def test_get_campaign_detail_malformed_id_returns_404_without_querying(
    client: TestClient, campaign_id: str
) -> None:
    mock_client = MagicMock()
    mock_client.table.side_effect = AssertionError(
        "malformed ids must not query Supabase"
    )
    app.dependency_overrides[get_auth_context] = _auth
    app.dependency_overrides[get_user_supabase_client] = lambda: mock_client

    response = client.get(f"/campaigns/{campaign_id}")

    assert response.status_code == 404
    assert response.json() == {"error": "Not found."}
    mock_client.table.assert_not_called()


def test_get_campaign_detail_returns_children(client: TestClient) -> None:
    mock_client = MagicMock()
    campaign = MagicMock(
        data=[
            {
                "id": CAMPAIGN_ID,
                "title": "Sombras",
                "description": "D",
                "world_state": "W",
                "system": None,
                "tone": None,
                "updated_at": "2026-07-02T00:00:00Z",
            }
        ]
    )
    npcs = MagicMock(data=[{"id": "npc-1", "name": "Toblen"}])
    factions = MagicMock(data=[{"id": "faction-1", "name": "Guild"}])
    arcs = MagicMock(
        data=[{"id": "arc-1", "title": "Missing caravan", "status": "active"}]
    )
    eq_query = mock_client.table.return_value.select.return_value.eq.return_value
    eq_query.execute.side_effect = [
        campaign,
        npcs,
        factions,
        arcs,
    ]
    app.dependency_overrides[get_auth_context] = _auth
    app.dependency_overrides[get_user_supabase_client] = lambda: mock_client

    response = client.get(f"/campaigns/{CAMPAIGN_ID}")

    assert response.status_code == 200
    body = response.json()
    assert body["id"] == CAMPAIGN_ID
    assert body["npcs"] == [
        {
            "id": "npc-1",
            "name": "Toblen",
            "description": None,
            "current_state": None,
            "motivation": None,
            "content_source": None,
        }
    ]
    assert body["factions"][0]["id"] == "faction-1"
    assert body["arcs"][0]["id"] == "arc-1"


@pytest.mark.parametrize("campaign_rows", [[], None])
def test_get_campaign_detail_returns_404_when_not_visible_or_unknown(
    client: TestClient, campaign_rows
) -> None:
    mock_client = MagicMock()
    eq_query = mock_client.table.return_value.select.return_value.eq.return_value
    eq_query.execute.return_value = MagicMock(data=campaign_rows)
    app.dependency_overrides[get_auth_context] = _auth
    app.dependency_overrides[get_user_supabase_client] = lambda: mock_client

    response = client.get(f"/campaigns/{CAMPAIGN_ID}")

    assert response.status_code == 404
    assert response.json() == {"error": "Not found."}
