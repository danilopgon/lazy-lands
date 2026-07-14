"""Route tests for POST /sessions/{id}/regenerate-section.

Cross-tenant convention check (task 2.7): this codebase maps every RLS miss
(forged/foreign id or unknown id) to a uniform 404 — never a 403 — for
comparable endpoints (see ``GetSessionUseCase``/``SessionNotFoundError`` and
``session_not_found_error_handler``). Regenerate follows the same
convention: no 403 path exists or is asserted here.
"""

from __future__ import annotations

from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.modules.sessions.api.dependencies import provide_regenerate_section
from app.modules.sessions.application.commands.regenerate_section import (
    RegenerateSectionCommand,
)
from app.modules.sessions.application.errors import SessionNotFoundError
from app.shared.generation_rate_limit import enforce_generation_rate_limit
from app.shared.security import AuthContext, get_auth_context

SESSION_ID = "11111111-1111-4111-8111-111111111111"


class _FakeUseCase:
    def __init__(self, result=None, error: Exception | None = None) -> None:
        self.result = result
        self.error = error
        self.calls: list[tuple[str, RegenerateSectionCommand]] = []

    async def execute(self, session_id: str, command: RegenerateSectionCommand):
        self.calls.append((session_id, command))
        if self.error is not None:
            raise self.error
        return self.result


def _session_detail_row() -> dict[str, object]:
    return {
        "id": SESSION_ID,
        "campaign_id": "campaign-1",
        "session_number": 8,
        "summary": "Draft.",
        "consequences": None,
        "generated_content": {
            "title": "Threads in the Mine",
            "sections": [
                {
                    "id": "goal",
                    "label": "Session goal",
                    "body": "Fresh goal.",
                    "origin": "scribe",
                }
            ],
            "continuity_links": [],
        },
        "trace_json": {"prompt_version": "regenerate_goal_v1"},
        "created_at": "2026-07-10T00:00:00Z",
        "updated_at": "2026-07-10T00:00:00Z",
    }


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


def test_regenerate_section_returns_200_with_updated_body_and_origin(
    client: TestClient,
) -> None:
    from app.modules.sessions.application.read_models.session_detail import (
        SessionDetailResponse,
    )

    use_case = _FakeUseCase(result=SessionDetailResponse(**_session_detail_row()))
    app.dependency_overrides[provide_regenerate_section] = lambda: use_case
    _authenticate()

    response = client.post(
        f"/sessions/{SESSION_ID}/regenerate-section", json={"section_id": "goal"}
    )

    assert response.status_code == 200
    body = response.json()
    goal_section = next(
        section
        for section in body["generated_content"]["sections"]
        if section["id"] == "goal"
    )
    assert goal_section["body"] == "Fresh goal."
    assert goal_section["origin"] == "scribe"
    assert use_case.calls[0][1].section_id == "goal"


def test_regenerate_section_rejects_unknown_section_id_with_422_no_use_case_call(
    client: TestClient,
) -> None:
    use_case = _FakeUseCase()
    app.dependency_overrides[provide_regenerate_section] = lambda: use_case
    _authenticate()

    response = client.post(
        f"/sessions/{SESSION_ID}/regenerate-section",
        json={"section_id": "not-a-real-section"},
    )

    assert response.status_code == 422
    assert use_case.calls == []


def test_regenerate_section_requires_authentication(client: TestClient) -> None:
    response = client.post(
        f"/sessions/{SESSION_ID}/regenerate-section", json={"section_id": "goal"}
    )

    assert response.status_code == 401


def test_regenerate_section_returns_uniform_404_for_rls_miss_or_unknown_session(
    client: TestClient,
) -> None:
    use_case = _FakeUseCase(error=SessionNotFoundError())
    app.dependency_overrides[provide_regenerate_section] = lambda: use_case
    _authenticate()

    response = client.post(
        f"/sessions/{SESSION_ID}/regenerate-section", json={"section_id": "goal"}
    )

    assert response.status_code == 404
    assert response.json() == {"error": "Not found."}


def test_regenerate_section_dependency_has_no_module_level_generation_import() -> None:
    """Composition-root check: the DI provider imports the generation adapter
    lazily (function-local), not at ``sessions/api/dependencies.py`` module
    scope — ``sessions`` never imports ``generation`` at module level."""
    import ast
    from pathlib import Path

    source = Path("app/modules/sessions/api/dependencies.py").read_text(
        encoding="utf-8"
    )
    tree = ast.parse(source)
    module_level_imports = {
        alias.name
        for node in tree.body
        if isinstance(node, (ast.Import, ast.ImportFrom))
        for alias in node.names
    }
    assert not any("generation" in name for name in module_level_imports)


def test_regenerate_section_provider_builds_use_case(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    fake_client = MagicMock()
    fake_llm_provider = MagicMock()

    use_case = provide_regenerate_section(fake_client, fake_llm_provider)

    assert use_case is not None
