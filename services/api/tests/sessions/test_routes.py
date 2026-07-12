"""Route tests for POST/GET /campaigns/{id}/sessions."""

from __future__ import annotations

from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.modules.sessions.application.contracts import (
    CampaignSummaryOutput,
    MemorySuggestionsOutput,
)
from app.shared.database import get_user_supabase_client
from app.shared.llm.dependencies import get_llm_provider
from app.shared.llm.providers.fake import FakeLlmProvider
from app.shared.security import AuthContext, get_auth_context


class _FakeSupabaseClient:
    """A per-table mock Supabase client (each table gets its own PostgREST chain)."""

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
    # Every child table used by get_suggestion_context defaults to empty.
    for name in ("npcs", "factions", "arcs", "memory_facts"):
        table = client.table(name)
        select_eq = table.select.return_value.eq.return_value
        select_eq.execute.return_value = MagicMock(data=[])
        select_eq.eq.return_value.execute.return_value = MagicMock(data=[])
    return client


def _configure_next_session_number(
    client: _FakeSupabaseClient, rows: list[dict]
) -> None:
    sessions_table = client.table("sessions")
    order_query = sessions_table.select.return_value.eq.return_value.order.return_value
    order_query.limit.return_value.execute.return_value = MagicMock(data=rows)


def _configure_session_insert(client: _FakeSupabaseClient, row: dict) -> None:
    sessions_table = client.table("sessions")
    sessions_table.insert.return_value.execute.return_value = MagicMock(data=[row])


def _configure_session_list(client: _FakeSupabaseClient, rows: list[dict]) -> None:
    sessions_table = client.table("sessions")
    order_query = sessions_table.select.return_value.eq.return_value.order
    order_query.return_value.execute.return_value = MagicMock(data=rows)


def _configure_sessions_since(client: _FakeSupabaseClient, rows: list[dict]) -> None:
    """Configure the delta fetch ``SummarizeCampaign`` uses (select().eq().gt())."""
    sessions_table = client.table("sessions")
    gt_query = sessions_table.select.return_value.eq.return_value.gt.return_value
    gt_query.order.return_value.execute.return_value = MagicMock(data=rows)


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture(autouse=True)
def _clear_overrides():
    yield
    app.dependency_overrides.clear()


def _authenticate() -> None:
    app.dependency_overrides[get_auth_context] = lambda: AuthContext(
        user_id="user-1", access_token="token-1"
    )


def test_register_session_happy_path_returns_expected_shape(client) -> None:
    fake_client = _client_with_campaign(
        {
            "id": "campaign-1",
            "accumulated_summary": None,
            "summarized_up_to_session": None,
        }
    )
    _configure_next_session_number(fake_client, [])
    inserted_session = {
        "id": "session-1",
        "session_number": 1,
        "summary": "The party arrived.",
        "consequences": None,
        "created_at": "2026-07-08T00:00:00Z",
    }
    _configure_session_insert(fake_client, inserted_session)
    # Without this, SummarizeCampaign.get_sessions_since() would find nothing,
    # short-circuit, and never call update_campaign_summary — masking a
    # broken summarize path. Configuring it means the happy path actually
    # exercises (and can fail on) the summarize step.
    _configure_sessions_since(fake_client, [inserted_session])
    provider = FakeLlmProvider()
    provider.register(CampaignSummaryOutput, {"accumulated_summary": "Updated."})
    provider.register(
        MemorySuggestionsOutput,
        {
            "suggestions": [
                {
                    "content": "Captain Vess is hiding in the harbor district.",
                    "type": "revelation",
                    "importance": "medium",
                    "reason": "Introduced this session.",
                    "related": [],
                }
            ]
        },
    )

    app.dependency_overrides[get_user_supabase_client] = lambda: fake_client
    app.dependency_overrides[get_llm_provider] = lambda: provider
    _authenticate()

    response = client.post(
        "/campaigns/campaign-1/sessions",
        json={"summary": "The party arrived.", "consequences": None},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["session_id"] == "session-1"
    assert body["session_number"] == 1
    # A real suggest result flows through — proves suggest actually ran.
    assert len(body["memory_suggestions"]) == 1
    assert body["memory_suggestions"][0]["content"] == (
        "Captain Vess is hiding in the harbor district."
    )
    # The campaign row was patched with the LLM's summary — proves summarize
    # actually ran end-to-end instead of degrading silently.
    campaigns_table = fake_client.table("campaigns")
    campaigns_table.update.assert_called_once()
    update_arg = campaigns_table.update.call_args[0][0]
    assert update_arg["accumulated_summary"] == "Updated."
    assert update_arg["summarized_up_to_session"] == 1


def test_register_session_llm_failure_degrades_but_session_still_persists(
    client,
) -> None:
    """HTTP-boundary proof of persistence-first degrade (design Decision 4).

    An LLM provider with no registered fixtures raises on every
    ``complete_json`` call, so both summarize and suggest fail after the
    session insert has already succeeded. The route must still return 2xx
    with the persisted session id and empty suggestions — never a 5xx/422
    caused solely by the LLM step.
    """
    inserted_session = {
        "id": "session-1",
        "session_number": 1,
        "summary": "The party arrived.",
        "consequences": None,
        "created_at": "2026-07-08T00:00:00Z",
    }
    fake_client = _client_with_campaign(
        {
            "id": "campaign-1",
            "accumulated_summary": None,
            "summarized_up_to_session": None,
        }
    )
    _configure_next_session_number(fake_client, [])
    _configure_session_insert(fake_client, inserted_session)
    _configure_sessions_since(fake_client, [inserted_session])
    # No fixtures registered -> FakeLlmProvider.complete_json raises KeyError
    # for both CampaignSummaryOutput and MemorySuggestionsOutput.
    failing_provider = FakeLlmProvider()

    app.dependency_overrides[get_user_supabase_client] = lambda: fake_client
    app.dependency_overrides[get_llm_provider] = lambda: failing_provider
    _authenticate()

    response = client.post(
        "/campaigns/campaign-1/sessions",
        json={"summary": "The party arrived.", "consequences": None},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["session_id"] == "session-1"
    assert body["session_number"] == 1
    assert body["memory_suggestions"] == []
    # The campaign summary was never touched — the LLM failure degraded
    # instead of silently succeeding.
    fake_client.table("campaigns").update.assert_not_called()


def test_register_session_forged_campaign_id_returns_404(client) -> None:
    fake_client = _client_with_campaign(None)
    app.dependency_overrides[get_user_supabase_client] = lambda: fake_client
    app.dependency_overrides[get_llm_provider] = lambda: FakeLlmProvider()
    _authenticate()

    response = client.post(
        "/campaigns/forged-campaign/sessions",
        json={"summary": "s", "consequences": None},
    )

    assert response.status_code == 404


def test_register_session_unauthenticated_returns_401() -> None:
    local_client = TestClient(app)

    response = local_client.post(
        "/campaigns/campaign-1/sessions",
        json={"summary": "s", "consequences": None},
    )

    assert response.status_code == 401


def test_register_session_missing_summary_returns_422(client) -> None:
    fake_client = _client_with_campaign({"id": "campaign-1"})
    app.dependency_overrides[get_user_supabase_client] = lambda: fake_client
    app.dependency_overrides[get_llm_provider] = lambda: FakeLlmProvider()
    _authenticate()

    response = client.post("/campaigns/campaign-1/sessions", json={"consequences": "c"})

    assert response.status_code == 422


def test_list_sessions_returns_chronological_order(client) -> None:
    fake_client = _client_with_campaign({"id": "campaign-1"})
    _configure_session_list(
        fake_client,
        [
            {"id": "s1", "session_number": 1, "summary": "a", "consequences": None},
            {
                "id": "s2",
                "session_number": 2,
                "summary": "b",
                "consequences": None,
                "generated_content": {"sections": [{"body": "Draft."}]},
            },
        ],
    )
    app.dependency_overrides[get_user_supabase_client] = lambda: fake_client
    _authenticate()

    response = client.get("/campaigns/campaign-1/sessions")

    assert response.status_code == 200
    body = response.json()
    assert [row["session_number"] for row in body] == [1, 2]
    assert [row["has_generated_content"] for row in body] == [False, True]
    assert "generated_content" not in body[1]


def test_list_sessions_forged_campaign_id_returns_404(client) -> None:
    fake_client = _client_with_campaign(None)
    app.dependency_overrides[get_user_supabase_client] = lambda: fake_client
    _authenticate()

    response = client.get("/campaigns/forged-campaign/sessions")

    assert response.status_code == 404


def test_list_sessions_empty_campaign_returns_empty_array(client) -> None:
    fake_client = _client_with_campaign({"id": "campaign-1"})
    _configure_session_list(fake_client, [])
    app.dependency_overrides[get_user_supabase_client] = lambda: fake_client
    _authenticate()

    response = client.get("/campaigns/campaign-1/sessions")

    assert response.status_code == 200
    assert response.json() == []
