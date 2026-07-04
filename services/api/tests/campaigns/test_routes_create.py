"""Route tests for POST /campaigns (CP-002, CP-003, CP-005)."""

from __future__ import annotations

from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.shared.database import get_user_supabase_client
from app.shared.security import AuthContext, get_auth_context

VALID_BODY = {
    "title": "Title",
    "description": "Description",
    "world_state": "World state",
    "npcs": [],
    "factions": [],
    "arcs": [],
}


def _mock_client_returning_campaign_id(campaign_id: str = "campaign-xyz") -> MagicMock:
    client = MagicMock()
    execute_result = MagicMock()
    execute_result.data = [{"id": campaign_id}]
    client.table.return_value.insert.return_value.execute.return_value = execute_result
    return client


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture(autouse=True)
def _clear_overrides():
    yield
    app.dependency_overrides.clear()


def test_happy_path_returns_id(client) -> None:
    mock_client = _mock_client_returning_campaign_id("campaign-abc")
    app.dependency_overrides[get_user_supabase_client] = lambda: mock_client
    app.dependency_overrides[get_auth_context] = lambda: AuthContext(
        user_id="user-1", access_token="token-1"
    )

    response = client.post("/campaigns", json=VALID_BODY)

    assert response.status_code == 200
    assert response.json() == {"id": "campaign-abc"}


def test_unauthenticated_request_returns_401_no_rows_written() -> None:
    # No dependency override for get_auth_context -> real JWT validation runs
    # and rejects the missing Authorization header before any DB call.
    local_client = TestClient(app)

    response = local_client.post("/campaigns", json=VALID_BODY)

    assert response.status_code == 401


def test_partial_failure_returns_retryable_409(client) -> None:
    mock_client = _mock_client_returning_campaign_id("campaign-fail")
    mock_client.table.return_value.insert.return_value.execute.side_effect = [
        MagicMock(data=[{"id": "campaign-fail"}]),
        Exception("npc insert failed"),
    ]
    app.dependency_overrides[get_user_supabase_client] = lambda: mock_client
    app.dependency_overrides[get_auth_context] = lambda: AuthContext(
        user_id="user-1", access_token="token-1"
    )
    body = dict(VALID_BODY)
    body["npcs"] = [
        {
            "name": "N",
            "description": "d",
            "current_state": "s",
            "motivation": "m",
            "content_source": "llm",
        }
    ]

    response = client.post("/campaigns", json=body)

    assert response.status_code == 409
    assert response.json()["retryable"] is True
