"""Route tests for POST /campaigns/extract (CE-002, CE-003, CE-004, CE-005, CE-006)."""

from __future__ import annotations

import time
from types import SimpleNamespace
from unittest.mock import MagicMock

import jwt
import pytest
from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives.asymmetric.ec import SECP256R1, generate_private_key
from fastapi.testclient import TestClient

from app.main import app
from app.modules.campaigns.routes import get_llm_provider
from app.shared.config import settings
from app.shared.llm.errors import LlmOutputValidationError
from app.shared.llm.providers.fake import FakeLlmProvider

VALID_TEXT = "A premise long enough to pass the backend validation bound. " * 3
VALID_PAYLOAD = {
    "title": "Title",
    "description": "Description",
    "world_state": "World state",
    "npcs": [],
    "factions": [],
    "arcs": [],
}


def _derived_issuer() -> str:
    return f"{str(settings.supabase_url).rstrip('/')}/auth/v1"


@pytest.fixture(scope="module")
def ec_keypair():
    private_key = generate_private_key(SECP256R1(), default_backend())
    return private_key, private_key.public_key()


def _make_token(private_key, sub: str = "user-uuid-1234") -> str:
    now = int(time.time())
    payload = {
        "sub": sub,
        "aud": "authenticated",
        "iss": _derived_issuer(),
        "iat": now,
        "exp": now + 3600,
    }
    return jwt.encode(
        payload, private_key, algorithm="ES256", headers={"kid": "test-kid-1"}
    )


@pytest.fixture
def mock_jwks_client(ec_keypair, monkeypatch):
    _, public_key = ec_keypair
    client = MagicMock()
    client.get_signing_key_from_jwt.return_value = SimpleNamespace(key=public_key)
    monkeypatch.setattr("app.shared.security.jwks_client", client)
    return client


@pytest.fixture
def auth_header(ec_keypair, mock_jwks_client) -> dict[str, str]:
    private_key, _ = ec_keypair
    token = _make_token(private_key)
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def fake_provider():
    provider = FakeLlmProvider()
    app.dependency_overrides[get_llm_provider] = lambda: provider
    yield provider
    app.dependency_overrides.pop(get_llm_provider, None)


@pytest.fixture
def client():
    return TestClient(app)


def test_happy_path_returns_200_with_content_source_llm(
    client, auth_header, fake_provider
) -> None:
    from app.modules.campaigns.schemas import ExtractCampaignOutput  # noqa: PLC0415

    fake_provider.register(
        ExtractCampaignOutput,
        {
            "title": "Title",
            "description": "Description",
            "world_state": "World state",
            "npcs": [
                {
                    "name": "N",
                    "description": "d",
                    "current_state": "s",
                    "motivation": "m",
                }
            ],
            "factions": [],
            "arcs": [{"title": "A", "description": "d", "priority": "high"}],
        },
    )

    response = client.post(
        "/campaigns/extract", json={"raw_text": VALID_TEXT}, headers=auth_header
    )

    assert response.status_code == 200
    body = response.json()
    assert body["npcs"][0]["content_source"] == "llm"
    assert body["arcs"][0]["content_source"] == "llm"


def test_premise_below_100_chars_returns_422(
    client, auth_header, fake_provider
) -> None:
    response = client.post(
        "/campaigns/extract", json={"raw_text": "too short"}, headers=auth_header
    )

    assert response.status_code == 422


def test_premise_above_8000_chars_returns_422(
    client, auth_header, fake_provider
) -> None:
    response = client.post(
        "/campaigns/extract", json={"raw_text": "x" * 8001}, headers=auth_header
    )

    assert response.status_code == 422


def test_unauthenticated_request_returns_401_no_llm_call(client, fake_provider) -> None:
    call_count = {"n": 0}
    original_complete_json = fake_provider.complete_json

    async def _tracked(*args, **kwargs):
        call_count["n"] += 1
        return await original_complete_json(*args, **kwargs)

    fake_provider.complete_json = _tracked

    response = client.post("/campaigns/extract", json={"raw_text": VALID_TEXT})

    assert response.status_code == 401
    assert call_count["n"] == 0


def test_statelessness_no_db_writes_on_any_path(
    client, auth_header, fake_provider
) -> None:
    """No repository/client is constructed on the extract path at all."""
    import app.modules.campaigns.routes as routes_module  # noqa: PLC0415

    with pytest.MonkeyPatch.context() as mp:
        called = {"n": 0}

        def _fail_if_called(*_args, **_kwargs):
            called["n"] += 1
            raise AssertionError("extract must never construct a repository")

        mp.setattr(
            routes_module, "SupabaseCampaignRepository", _fail_if_called, raising=True
        )

        from app.modules.campaigns.schemas import ExtractCampaignOutput  # noqa: PLC0415

        fake_provider.register(ExtractCampaignOutput, VALID_PAYLOAD)

        response = client.post(
            "/campaigns/extract", json={"raw_text": VALID_TEXT}, headers=auth_header
        )

        assert response.status_code == 200
        assert called["n"] == 0


def test_malformed_llm_output_maps_to_retryable_error_no_raw_leak(
    client, auth_header, fake_provider
) -> None:
    from app.modules.campaigns.schemas import ExtractCampaignOutput  # noqa: PLC0415

    # Missing required "title" -> LlmOutputValidationError inside the guard.
    fake_provider.register(
        ExtractCampaignOutput,
        {
            "description": "Description",
            "world_state": "World state",
            "npcs": [],
            "factions": [],
            "arcs": [],
        },
    )

    response = client.post(
        "/campaigns/extract", json={"raw_text": VALID_TEXT}, headers=auth_header
    )

    assert response.status_code in (422, 503)
    body = response.json()
    assert body.get("retryable") is True
    text = response.text
    assert "raw_output" not in text
    assert "title" not in text or "could not be parsed" in text.lower()


@pytest.mark.asyncio
async def test_llm_output_validation_error_never_leaks_raw_output_in_handler() -> None:
    """Direct handler-level guard: the response body has no raw_output key."""
    from app.shared.errors import llm_output_validation_error_handler  # noqa: PLC0415

    exc = LlmOutputValidationError(
        schema_name="ExtractCampaignOutput",
        raw_output="SECRET-SHOULD-NOT-LEAK-title-missing",
        retryable=True,
    )

    response = await llm_output_validation_error_handler(None, exc)  # type: ignore[arg-type]

    assert response.status_code == 422
    body = response.body.decode()
    assert "SECRET-SHOULD-NOT-LEAK" not in body
