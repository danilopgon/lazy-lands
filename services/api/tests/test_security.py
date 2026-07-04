"""Tests for AuthContext + get_auth_context (PU-002).

Complements test_jwt_auth.py (which exercises get_current_user end-to-end via
routes). These tests exercise get_auth_context directly and confirm both the
user_id and the raw access_token are returned from a single validated JWT.
"""

from __future__ import annotations

import time
from types import SimpleNamespace
from unittest.mock import MagicMock

import jwt
import pytest
from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives.asymmetric.ec import SECP256R1, generate_private_key

from app.shared.config import settings
from app.shared.security import AuthContext, get_auth_context, get_current_user


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


@pytest.mark.asyncio
async def test_get_auth_context_returns_user_id_and_token(
    ec_keypair, mock_jwks_client
) -> None:
    private_key, _ = ec_keypair
    token = _make_token(private_key, sub="user-uuid-abc")

    ctx = await get_auth_context(authorization=f"Bearer {token}")

    assert isinstance(ctx, AuthContext)
    assert ctx.user_id == "user-uuid-abc"
    assert ctx.access_token == token


@pytest.mark.asyncio
async def test_get_current_user_still_returns_user_id_only(
    ec_keypair, mock_jwks_client
) -> None:
    private_key, _ = ec_keypair
    token = _make_token(private_key, sub="user-uuid-xyz")

    ctx = await get_auth_context(authorization=f"Bearer {token}")
    user_id = await get_current_user(ctx)

    assert user_id == "user-uuid-xyz"
