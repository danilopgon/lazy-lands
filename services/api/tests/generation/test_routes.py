"""HTTP route tests for generated session creation and detail editing."""

from __future__ import annotations

from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.modules.generation.application.contracts import GeneratedSessionOutput
from app.shared.database import get_user_supabase_client
from app.shared.llm.dependencies import get_llm_provider
from app.shared.llm.providers.fake import FakeLlmProvider
from app.shared.security import AuthContext, get_auth_context


class _FakeSupabaseClient:
    def __init__(self) -> None:
        self._tables: dict[str, MagicMock] = {}

    def table(self, name: str) -> MagicMock:
        return self._tables.setdefault(name, MagicMock())


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


@pytest.fixture(autouse=True)
def _clear_overrides():
    yield
    app.dependency_overrides.clear()


def _authenticate() -> None:
    app.dependency_overrides[get_auth_context] = lambda: AuthContext(
        user_id="user-1", access_token="token-1"
    )


def _provider() -> FakeLlmProvider:
    provider = FakeLlmProvider()
    provider.register(
        GeneratedSessionOutput,
        {
            "title": "Threads in the Mine",
            "synopsis": "The party follows the arcane core clue.",
            "main_objective": "Recover the core.",
            "twist": "The spared manticore returns.",
            "encounters": [
                {"name": "Ravine", "description": "Negotiate.", "type": "social"}
            ],
            "faction_reactions": [{"faction_name": "Guild", "reaction": "Watches."}],
            "arc_progression": [{"arc_title": "Core", "progression": "Clue found."}],
            "continuity_links": [{"memory_fact_id": "mem-1", "relevance": "Payoff."}],
            "generated_content": {
                "sections": [
                    {
                        "id": "synopsis",
                        "label": "Synopsis",
                        "body": "Draft.",
                        "origin": "scribe",
                    }
                ]
            },
        },
    )
    return provider


def test_generate_session_route_persists_response(client: TestClient) -> None:
    fake_client = _FakeSupabaseClient()
    campaign_query = fake_client.table("campaigns").select.return_value.eq.return_value
    campaign_query.execute.return_value = MagicMock(
        data=[
            {
                "id": "campaign-1",
                "title": "Sombras",
                "description": "Intrigue.",
                "world_state": "Winter.",
                "accumulated_summary": "Herman was humiliated.",
                "summarized_up_to_session": 7,
            }
        ]
    )
    for name in ("npcs", "factions"):
        table = fake_client.table(name)
        query = table.select.return_value.eq.return_value
        query.execute.return_value = MagicMock(data=[])
    for name in ("arcs", "memory_facts"):
        table = fake_client.table(name)
        query = table.select.return_value.eq.return_value.eq.return_value
        query.execute.return_value = MagicMock(data=[])
    sessions = fake_client.table("sessions")
    number_query = sessions.select.return_value.eq.return_value.order.return_value
    number_query.limit.return_value.execute.return_value = MagicMock(data=[])
    sessions.insert.return_value.execute.return_value = MagicMock(
        data=[{"id": "session-1", "session_number": 8}]
    )
    app.dependency_overrides[get_user_supabase_client] = lambda: fake_client
    app.dependency_overrides[get_llm_provider] = _provider
    _authenticate()

    response = client.post("/campaigns/campaign-1/generate-session", json={})

    assert response.status_code == 200
    body = response.json()
    assert body["id"] == "session-1"
    assert body["title"] == "Threads in the Mine"
    assert body["trace_id"] == "session-1"
    inserted = sessions.insert.call_args[0][0]
    assert inserted["generated_content"]["sections"][0]["origin"] == "scribe"
    assert inserted["trace_json"]["error_code"] is None


def test_generate_session_route_returns_404_for_rls_miss(client: TestClient) -> None:
    fake_client = _FakeSupabaseClient()
    campaign_query = fake_client.table("campaigns").select.return_value.eq.return_value
    campaign_query.execute.return_value = MagicMock(data=[])
    app.dependency_overrides[get_user_supabase_client] = lambda: fake_client
    app.dependency_overrides[get_llm_provider] = _provider
    _authenticate()

    response = client.post("/campaigns/foreign/generate-session", json={})

    assert response.status_code == 404
