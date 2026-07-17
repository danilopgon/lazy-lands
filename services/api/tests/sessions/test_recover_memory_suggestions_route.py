"""Route tests for POST /sessions/{id}/memory-suggestions.

Cross-tenant convention check: like every other session detail endpoint, an
RLS miss (foreign session), an unknown id, and a malformed id all collapse
into a uniform 404 — no 403 path exists or is asserted here.
"""

from __future__ import annotations

from unittest.mock import MagicMock

import pytest
from fastapi.routing import APIRoute
from fastapi.testclient import TestClient

from app.main import app
from app.modules.sessions.api.dependencies import (
    provide_recover_memory_suggestions,
)
from app.modules.sessions.application.contracts import (
    MemorySuggestionsOutput,
)
from app.modules.sessions.application.errors import SessionNotFoundError
from app.shared.database import get_user_supabase_client
from app.shared.generation_rate_limit import enforce_generation_rate_limit
from app.shared.llm.dependencies import get_llm_provider
from app.shared.llm.errors import ProviderRateLimitError
from app.shared.llm.providers.fake import FakeLlmProvider
from app.shared.security import AuthContext, get_auth_context

SESSION_ID = "11111111-1111-4111-8111-111111111111"
ROUTE_PATH = "/sessions/{session_id}/memory-suggestions"

SUGGESTION_PAYLOAD = {
    "content": "Captain Vess is hiding in the harbor district.",
    "type": "revelation",
    "importance": "medium",
    "reason": "Introduced this session.",
    "related": [],
}


class _FakeUseCase:
    def __init__(self, result=None, error: Exception | None = None) -> None:
        self.result = result if result is not None else []
        self.error = error
        self.calls: list[str] = []

    async def execute(self, session_id: str):
        self.calls.append(session_id)
        if self.error is not None:
            raise self.error
        return self.result


class _FakeSupabaseClient:
    """A per-table mock Supabase client (each table gets its own PostgREST chain)."""

    def __init__(self) -> None:
        self._tables: dict[str, MagicMock] = {}

    def table(self, name: str) -> MagicMock:
        return self._tables.setdefault(name, MagicMock())


def _session_row() -> dict[str, object]:
    return {
        "id": SESSION_ID,
        "campaign_id": "campaign-1",
        "session_number": 3,
        "summary": "The party burned the vault down.",
        "consequences": None,
        "status": "registered",
    }


def _wired_client(session_row: dict | None) -> _FakeSupabaseClient:
    client = _FakeSupabaseClient()
    sessions_table = client.table("sessions")
    sessions_table.select.return_value.eq.return_value.execute.return_value = MagicMock(
        data=[session_row] if session_row is not None else []
    )
    campaign_row = {
        "id": "campaign-1",
        "accumulated_summary": None,
        "world_state": None,
    }
    campaigns_table = client.table("campaigns")
    campaigns_table.select.return_value.eq.return_value.execute.return_value = (
        MagicMock(data=[campaign_row])
    )
    for name in ("npcs", "factions", "arcs", "memory_facts"):
        table = client.table(name)
        select_eq = table.select.return_value.eq.return_value
        select_eq.execute.return_value = MagicMock(data=[])
        select_eq.eq.return_value.execute.return_value = MagicMock(data=[])
    return client


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


@pytest.fixture(autouse=True)
def _clear_overrides():
    app.dependency_overrides[enforce_generation_rate_limit] = lambda: None
    yield
    app.dependency_overrides.clear()


def _authenticate() -> None:
    app.dependency_overrides[get_auth_context] = lambda: AuthContext(
        user_id="user-1", access_token="token-1"
    )


def test_recovery_returns_200_with_validated_suggestions(client: TestClient) -> None:
    fake_client = _wired_client(_session_row())
    provider = FakeLlmProvider()
    provider.register(MemorySuggestionsOutput, {"suggestions": [SUGGESTION_PAYLOAD]})
    app.dependency_overrides[get_user_supabase_client] = lambda: fake_client
    app.dependency_overrides[get_llm_provider] = lambda: provider
    _authenticate()

    response = client.post(f"/sessions/{SESSION_ID}/memory-suggestions")

    assert response.status_code == 200
    body = response.json()
    assert len(body["memory_suggestions"]) == 1
    assert body["memory_suggestions"][0]["content"] == SUGGESTION_PAYLOAD["content"]
    assert body["memory_suggestions"][0]["type"] == "revelation"


def test_recovery_is_read_only_and_never_writes_the_session(
    client: TestClient,
) -> None:
    fake_client = _wired_client(_session_row())
    provider = FakeLlmProvider()
    provider.register(MemorySuggestionsOutput, {"suggestions": [SUGGESTION_PAYLOAD]})
    app.dependency_overrides[get_user_supabase_client] = lambda: fake_client
    app.dependency_overrides[get_llm_provider] = lambda: provider
    _authenticate()

    response = client.post(f"/sessions/{SESSION_ID}/memory-suggestions")

    assert response.status_code == 200
    sessions_table = fake_client.table("sessions")
    sessions_table.update.assert_not_called()
    sessions_table.insert.assert_not_called()
    sessions_table.upsert.assert_not_called()
    sessions_table.delete.assert_not_called()
    fake_client.table("campaigns").update.assert_not_called()


def test_intentional_empty_result_returns_200_with_an_empty_list(
    client: TestClient,
) -> None:
    """The heart of #91: an empty proposal set is a success, not a failure."""
    fake_client = _wired_client(_session_row())
    provider = FakeLlmProvider()
    provider.register(MemorySuggestionsOutput, {"suggestions": []})
    app.dependency_overrides[get_user_supabase_client] = lambda: fake_client
    app.dependency_overrides[get_llm_provider] = lambda: provider
    _authenticate()

    response = client.post(f"/sessions/{SESSION_ID}/memory-suggestions")

    assert response.status_code == 200
    assert response.json()["memory_suggestions"] == []


def test_unparseable_provider_output_surfaces_as_422_not_an_empty_list(
    client: TestClient,
) -> None:
    """The other half of #91: a failure must never masquerade as an empty list."""
    fake_client = _wired_client(_session_row())
    provider = FakeLlmProvider()
    # A registered payload that cannot validate against MemorySuggestionsOutput
    # routes through the same JSON guard the real adapter uses, raising
    # LlmOutputValidationError instead of a synthetic transport error.
    provider.register(MemorySuggestionsOutput, {"suggestions": [{"content": ""}]})
    app.dependency_overrides[get_user_supabase_client] = lambda: fake_client
    app.dependency_overrides[get_llm_provider] = lambda: provider
    _authenticate()

    response = client.post(f"/sessions/{SESSION_ID}/memory-suggestions")

    assert response.status_code == 422
    body = response.json()
    assert "memory_suggestions" not in body
    assert body["retryable"] is True


def test_provider_quota_failure_surfaces_as_429(client: TestClient) -> None:
    use_case = _FakeUseCase(error=ProviderRateLimitError("quota exhausted"))
    app.dependency_overrides[provide_recover_memory_suggestions] = lambda: use_case
    _authenticate()

    response = client.post(f"/sessions/{SESSION_ID}/memory-suggestions")

    assert response.status_code == 429
    assert "memory_suggestions" not in response.json()


def test_recovery_returns_uniform_404_for_rls_miss_or_unknown_session(
    client: TestClient,
) -> None:
    use_case = _FakeUseCase(error=SessionNotFoundError())
    app.dependency_overrides[provide_recover_memory_suggestions] = lambda: use_case
    _authenticate()

    response = client.post(f"/sessions/{SESSION_ID}/memory-suggestions")

    assert response.status_code == 404
    assert response.json() == {"error": "Not found."}


def test_recovery_returns_404_for_a_foreign_session_without_calling_the_provider(
    client: TestClient,
) -> None:
    fake_client = _wired_client(None)
    provider = FakeLlmProvider()
    app.dependency_overrides[get_user_supabase_client] = lambda: fake_client
    app.dependency_overrides[get_llm_provider] = lambda: provider
    _authenticate()

    response = client.post(f"/sessions/{SESSION_ID}/memory-suggestions")

    assert response.status_code == 404
    assert response.json() == {"error": "Not found."}


def test_recovery_returns_404_for_a_malformed_session_id(client: TestClient) -> None:
    use_case = _FakeUseCase()
    app.dependency_overrides[provide_recover_memory_suggestions] = lambda: use_case
    _authenticate()

    response = client.post("/sessions/not-a-uuid/memory-suggestions")

    assert response.status_code == 404
    assert use_case.calls == []


def test_recovery_requires_authentication(client: TestClient) -> None:
    response = client.post(f"/sessions/{SESSION_ID}/memory-suggestions")

    assert response.status_code == 401


def test_repeated_recovery_calls_stay_successful_and_read_only(
    client: TestClient,
) -> None:
    fake_client = _wired_client(_session_row())
    provider = FakeLlmProvider()
    provider.register(MemorySuggestionsOutput, {"suggestions": [SUGGESTION_PAYLOAD]})
    app.dependency_overrides[get_user_supabase_client] = lambda: fake_client
    app.dependency_overrides[get_llm_provider] = lambda: provider
    _authenticate()

    first = client.post(f"/sessions/{SESSION_ID}/memory-suggestions")
    second = client.post(f"/sessions/{SESSION_ID}/memory-suggestions")

    assert first.status_code == 200
    assert second.status_code == 200
    assert first.json() == second.json()
    fake_client.table("sessions").update.assert_not_called()
    fake_client.table("sessions").insert.assert_not_called()


def _api_routes(routes) -> list[APIRoute]:
    """Flatten the app's route tree.

    FastAPI wraps each ``include_router`` call in an ``_IncludedRouter`` node
    exposing its router as ``original_router``, so ``app.routes`` is a tree
    rather than a flat list of ``APIRoute``.
    """
    flattened: list[APIRoute] = []
    for route in routes:
        if isinstance(route, APIRoute):
            flattened.append(route)
            continue
        nested = getattr(route, "original_router", None)
        flattened.extend(_api_routes(getattr(nested, "routes", [])))
    return flattened


def test_recovery_route_enforces_the_generation_rate_limit() -> None:
    """The metered LLM call must sit behind the same budget as regeneration."""
    route = next(
        route for route in _api_routes(app.routes) if route.path == ROUTE_PATH
    )

    assert "POST" in route.methods
    assert any(
        dependency.call is enforce_generation_rate_limit
        for dependency in route.dependant.dependencies
    )


def test_recovery_provider_builds_the_use_case() -> None:
    use_case = provide_recover_memory_suggestions(MagicMock(), MagicMock())

    assert use_case is not None
