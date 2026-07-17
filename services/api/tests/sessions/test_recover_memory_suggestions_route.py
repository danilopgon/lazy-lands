"""Route tests for POST /sessions/{id}/memory-suggestions.

Cross-tenant convention check: like every other session detail endpoint, an
RLS miss (foreign session), an unknown id, and a malformed id all collapse
into a uniform 404 — no 403 path exists or is asserted here.
"""

from __future__ import annotations

from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient
from pydantic import BaseModel

from app.main import app
from app.modules.sessions.api.dependencies import (
    provide_recover_memory_suggestions,
)
from app.modules.sessions.application.contracts import (
    MemorySuggestionsOutput,
)
from app.modules.sessions.application.errors import (
    SessionNotFoundError,
    SessionNotPlayedError,
)
from app.shared.database import get_user_supabase_client
from app.shared.generation_rate_limit import (
    GenerationRateLimitError,
    provide_generation_budget,
)
from app.shared.llm.dependencies import get_llm_provider
from app.shared.llm.errors import ProviderRateLimitError
from app.shared.llm.providers.fake import FakeLlmProvider
from app.shared.security import AuthContext, get_auth_context

SESSION_ID = "11111111-1111-4111-8111-111111111111"

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


class _RecordingBudget:
    """A generation budget that counts charges instead of touching the limiter.

    Charging is asserted through this fake rather than the module-global
    limiter: the real singleton would carry ``user-1``'s spend across tests in
    this module, coupling assertions to execution order and to the configured
    limit.
    """

    def __init__(self, error: Exception | None = None) -> None:
        self.charges = 0
        self.error = error

    def charge(self) -> None:
        self.charges += 1
        if self.error is not None:
            raise self.error


class _RecordingProvider(FakeLlmProvider):
    """A fake provider that records whether the Scribe was actually invoked."""

    def __init__(self) -> None:
        super().__init__()
        self.json_calls = 0

    async def complete_json[T: BaseModel](self, prompt: str, schema: type[T]) -> T:
        self.json_calls += 1
        return await super().complete_json(prompt, schema)


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
def budget() -> _RecordingBudget:
    """Install a counting budget for every test and reset overrides after."""
    recorder = _RecordingBudget()
    app.dependency_overrides[provide_generation_budget] = lambda: recorder
    yield recorder
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
    # The route is keyed by session alone, so the owning campaign travels with
    # the proposals: a review screen opened on another campaign can refuse them.
    assert body["campaign_id"] == "campaign-1"


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


def test_recovery_of_an_unplayed_draft_returns_a_non_retryable_409(
    client: TestClient,
) -> None:
    """Replaying can never succeed until the DM records what actually happened."""
    use_case = _FakeUseCase(error=SessionNotPlayedError())
    app.dependency_overrides[provide_recover_memory_suggestions] = lambda: use_case
    _authenticate()

    response = client.post(f"/sessions/{SESSION_ID}/memory-suggestions")

    assert response.status_code == 409
    body = response.json()
    assert body["retryable"] is False
    assert "memory_suggestions" not in body


def test_recovery_of_a_draft_row_returns_409_without_calling_the_provider(
    client: TestClient,
) -> None:
    """End-to-end through the real use case: the draft guard precedes the LLM."""
    fake_client = _wired_client({**_session_row(), "status": "draft"})
    provider = FakeLlmProvider()
    app.dependency_overrides[get_user_supabase_client] = lambda: fake_client
    app.dependency_overrides[get_llm_provider] = lambda: provider
    _authenticate()

    response = client.post(f"/sessions/{SESSION_ID}/memory-suggestions")

    assert response.status_code == 409
    assert response.json()["retryable"] is False
    fake_client.table("sessions").update.assert_not_called()


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


def test_an_eligible_request_charges_the_generation_budget_exactly_once(
    client: TestClient, budget: _RecordingBudget
) -> None:
    """The metered LLM call must still sit behind the per-user budget."""
    fake_client = _wired_client(_session_row())
    provider = _RecordingProvider()
    provider.register(MemorySuggestionsOutput, {"suggestions": [SUGGESTION_PAYLOAD]})
    app.dependency_overrides[get_user_supabase_client] = lambda: fake_client
    app.dependency_overrides[get_llm_provider] = lambda: provider
    _authenticate()

    response = client.post(f"/sessions/{SESSION_ID}/memory-suggestions")

    assert response.status_code == 200
    assert budget.charges == 1
    assert provider.json_calls == 1


def test_an_exhausted_budget_rejects_an_eligible_request_with_429(
    client: TestClient, budget: _RecordingBudget
) -> None:
    budget.error = GenerationRateLimitError("generation rate limit exceeded")
    fake_client = _wired_client(_session_row())
    provider = _RecordingProvider()
    provider.register(MemorySuggestionsOutput, {"suggestions": [SUGGESTION_PAYLOAD]})
    app.dependency_overrides[get_user_supabase_client] = lambda: fake_client
    app.dependency_overrides[get_llm_provider] = lambda: provider
    _authenticate()

    response = client.post(f"/sessions/{SESSION_ID}/memory-suggestions")

    assert response.status_code == 429
    assert provider.json_calls == 0


def test_a_malformed_session_id_does_not_consume_the_generation_budget(
    client: TestClient, budget: _RecordingBudget
) -> None:
    """A budget spent before eligibility is known turns a 404 into a 429."""
    fake_client = _wired_client(_session_row())
    provider = _RecordingProvider()
    app.dependency_overrides[get_user_supabase_client] = lambda: fake_client
    app.dependency_overrides[get_llm_provider] = lambda: provider
    _authenticate()

    response = client.post("/sessions/not-a-uuid/memory-suggestions")

    assert response.status_code == 404
    assert budget.charges == 0
    assert provider.json_calls == 0


def test_an_unknown_or_foreign_session_does_not_consume_the_generation_budget(
    client: TestClient, budget: _RecordingBudget
) -> None:
    fake_client = _wired_client(None)
    provider = _RecordingProvider()
    app.dependency_overrides[get_user_supabase_client] = lambda: fake_client
    app.dependency_overrides[get_llm_provider] = lambda: provider
    _authenticate()

    response = client.post(f"/sessions/{SESSION_ID}/memory-suggestions")

    assert response.status_code == 404
    assert budget.charges == 0
    assert provider.json_calls == 0


def test_an_unplayed_draft_does_not_consume_the_generation_budget(
    client: TestClient, budget: _RecordingBudget
) -> None:
    """The 409 is non-retryable, so it must never cost the DM a generation."""
    fake_client = _wired_client({**_session_row(), "status": "draft"})
    provider = _RecordingProvider()
    app.dependency_overrides[get_user_supabase_client] = lambda: fake_client
    app.dependency_overrides[get_llm_provider] = lambda: provider
    _authenticate()

    response = client.post(f"/sessions/{SESSION_ID}/memory-suggestions")

    assert response.status_code == 409
    assert response.json()["retryable"] is False
    assert budget.charges == 0
    assert provider.json_calls == 0


def test_recovery_provider_builds_the_use_case() -> None:
    use_case = provide_recover_memory_suggestions(
        MagicMock(), MagicMock(), _RecordingBudget()
    )

    assert use_case is not None
