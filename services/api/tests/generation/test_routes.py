"""HTTP route tests for generated session creation and detail editing."""

from __future__ import annotations

import logging
from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.modules.generation.api.dependencies import provide_generate_next_session
from app.modules.generation.application.contracts import GeneratedSessionOutput
from app.modules.generation.application.errors import GenerationPersistenceError
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


def _invalid_provider() -> FakeLlmProvider:
    provider = _provider()
    invalid_payload = {
        "synopsis": "Missing title should fail validation.",
        "main_objective": "Recover the core.",
        "twist": "The spared manticore returns.",
    }
    provider.register(GeneratedSessionOutput, invalid_payload)
    return provider


def _fake_generation_client() -> tuple[_FakeSupabaseClient, MagicMock]:
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
    return fake_client, sessions


def test_generate_session_route_persists_response(client: TestClient) -> None:
    fake_client, sessions = _fake_generation_client()
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
    assert inserted["generated_content"]["continuity_links"] == [
        {"memory_fact_id": "mem-1", "relevance": "Payoff."}
    ]
    assert inserted["trace_json"]["error_code"] is None


def test_generate_session_route_returns_retryable_422_for_invalid_llm_output(
    client: TestClient, caplog: pytest.LogCaptureFixture
) -> None:
    fake_client, sessions = _fake_generation_client()
    app.dependency_overrides[get_user_supabase_client] = lambda: fake_client
    app.dependency_overrides[get_llm_provider] = _invalid_provider
    _authenticate()

    with caplog.at_level(logging.WARNING):
        response = client.post("/campaigns/campaign-1/generate-session", json={})

    assert response.status_code == 422
    assert response.json()["retryable"] is True
    sessions.insert.assert_not_called()
    assert "llm_output_validation_failed" in caplog.text
    assert "duration_ms" in caplog.text


def test_generate_session_route_maps_persistence_error_to_retryable_409(
    client: TestClient,
) -> None:
    class FailingUseCase:
        async def execute(self, campaign_id: str, direction: object) -> object:
            assert campaign_id == "campaign-1"
            assert direction is not None
            raise GenerationPersistenceError(retryable=True)

    app.dependency_overrides[provide_generate_next_session] = lambda: FailingUseCase()
    _authenticate()

    response = client.post("/campaigns/campaign-1/generate-session", json={})

    assert response.status_code == 409
    assert response.json() == {
        "error": "Could not save the generated session. Please retry.",
        "retryable": True,
    }


def test_generate_session_route_returns_404_for_rls_miss(client: TestClient) -> None:
    fake_client = _FakeSupabaseClient()
    campaign_query = fake_client.table("campaigns").select.return_value.eq.return_value
    campaign_query.execute.return_value = MagicMock(data=[])
    app.dependency_overrides[get_user_supabase_client] = lambda: fake_client
    app.dependency_overrides[get_llm_provider] = _provider
    _authenticate()

    response = client.post("/campaigns/foreign/generate-session", json={})

    assert response.status_code == 404
