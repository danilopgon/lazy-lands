"""Tests for flat session detail read/update use cases and schemas."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

from app.main import app
from app.modules.sessions.api.schemas.session.requests import UpdateSessionRequest
from app.modules.sessions.application.commands.update_session import (
    UpdateSessionCommand,
    UpdateSessionUseCase,
)
from app.modules.sessions.application.errors import SessionNotFoundError
from app.modules.sessions.application.queries.get_session import GetSessionUseCase
from app.shared.database import get_user_supabase_client
from app.shared.security import AuthContext, get_auth_context


class _Repo:
    def __init__(self, session: dict | None) -> None:
        self.session = session
        self.updated_with: dict | None = None

    def get_session(self, session_id: str) -> dict | None:
        assert session_id == "session-1"
        return self.session

    def update_session(self, session_id: str, data: dict) -> dict:
        assert session_id == "session-1"
        self.updated_with = data
        assert self.session is not None
        self.session = {**self.session, **data, "updated_at": "2026-07-10T00:00:00Z"}
        return self.session


def _session() -> dict[str, object]:
    return {
        "id": "session-1",
        "campaign_id": "campaign-1",
        "session_number": 8,
        "summary": "Draft synopsis.",
        "consequences": None,
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
        "trace_json": {"prompt_version": "generate_session_v1"},
        "created_at": "2026-07-10T00:00:00Z",
        "updated_at": "2026-07-10T00:00:00Z",
    }


def test_get_session_returns_full_generated_content() -> None:
    result = GetSessionUseCase(_Repo(_session())).execute("session-1")

    assert result.id == "session-1"
    assert result.generated_content["sections"][0]["origin"] == "scribe"
    assert result.trace_json["prompt_version"] == "generate_session_v1"


def test_get_session_raises_not_found_on_rls_miss() -> None:
    with pytest.raises(SessionNotFoundError):
        GetSessionUseCase(_Repo(None)).execute("session-1")


def test_update_session_persists_full_generated_content_as_is() -> None:
    repo = _Repo(_session())
    content = {
        "sections": [
            {
                "id": "synopsis",
                "label": "Synopsis",
                "body": "Edited.",
                "origin": "edited",
            }
        ]
    }

    result = UpdateSessionUseCase(repo).execute(
        "session-1",
        UpdateSessionCommand(generated_content=content, summary="Edited summary"),
    )

    assert repo.updated_with == {
        "generated_content": content,
        "summary": "Edited summary",
    }
    assert result.generated_content["sections"][0]["origin"] == "edited"


def test_update_session_can_clear_nullable_consequences() -> None:
    row = _session()
    row["consequences"] = "Old consequences."
    repo = _Repo(row)

    result = UpdateSessionUseCase(repo).execute(
        "session-1",
        UpdateSessionCommand(consequences=None, provided_fields={"consequences"}),
    )

    assert repo.updated_with == {"consequences": None}
    assert result.consequences is None


def test_update_session_raises_not_found_on_rls_miss() -> None:
    with pytest.raises(SessionNotFoundError):
        UpdateSessionUseCase(_Repo(None)).execute(
            "session-1", UpdateSessionCommand(summary="Edited")
        )


def test_update_session_request_rejects_empty_body() -> None:
    with pytest.raises(ValidationError):
        UpdateSessionRequest()


def test_session_detail_routes_get_and_patch_generated_content() -> None:
    class FakeClient:
        def __init__(self) -> None:
            self.sessions = _Repo(_session())

        def table(self, name: str) -> _Repo:
            assert name == "sessions"
            return self.sessions

    class QueryRepo(_Repo):
        def select(self, _columns: str) -> QueryRepo:
            return self

        def eq(self, _column: str, _value: str) -> QueryRepo:
            return self

        def execute(self):
            from unittest.mock import MagicMock

            return MagicMock(data=[self.session] if self.session is not None else [])

        def update(self, data: dict) -> QueryRepo:
            self.updated_with = data
            assert self.session is not None
            self.session = {**self.session, **data}
            return self

    fake_client = FakeClient()
    fake_client.sessions = QueryRepo(_session())
    app.dependency_overrides[get_user_supabase_client] = lambda: fake_client
    app.dependency_overrides[get_auth_context] = lambda: AuthContext(
        user_id="user-1", access_token="token-1"
    )
    client = TestClient(app)
    try:
        get_response = client.get("/sessions/session-1")
        patch_response = client.patch(
            "/sessions/session-1",
            json={
                "generated_content": {
                    "sections": [
                        {
                            "id": "synopsis",
                            "label": "Synopsis",
                            "body": "Edited.",
                            "origin": "edited",
                        }
                    ]
                }
            },
        )
    finally:
        app.dependency_overrides.clear()

    assert get_response.status_code == 200
    assert get_response.json()["generated_content"]["sections"][0]["origin"] == (
        "scribe"
    )
    assert patch_response.status_code == 200
    assert patch_response.json()["generated_content"]["sections"][0]["origin"] == (
        "edited"
    )
