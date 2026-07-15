"""
JWT auth tests — JA-T-01..12 + database factory tests (T-12 + T-13).

RED phase: all JA-T-* tests fail because get_current_user is still a stub.
database factory tests fail because shared/database.py does not exist yet.
"""

from __future__ import annotations

import time
from types import SimpleNamespace
from unittest.mock import MagicMock

import jwt
import pytest
from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives.asymmetric.ec import SECP256R1, generate_private_key
from fastapi import Depends, FastAPI
from fastapi.testclient import TestClient

from app.modules.health import routes as health
from app.shared.config import settings
from app.shared.dependencies import get_current_user

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _derived_issuer() -> str:
    """Mirror the trailing-slash guard used in the implementation."""
    return f"{str(settings.supabase_url).rstrip('/')}/auth/v1"


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture(scope="session")
def ec_keypair():
    """Generate an EC P-256 key pair once per test session."""
    private_key = generate_private_key(SECP256R1(), default_backend())
    public_key = private_key.public_key()
    return private_key, public_key


def make_token(
    private_key,
    sub: str = "user-uuid-1234",
    aud: str = "authenticated",
    iss: str | None = None,
    exp_offset: int = 3600,
    algorithm: str = "ES256",
    kid: str = "test-kid-1",
) -> str:
    """Sign an ES256 JWT (or other algo) with the supplied private key."""
    if iss is None:
        iss = _derived_issuer()

    now = int(time.time())
    payload = {
        "sub": sub,
        "aud": aud,
        "iss": iss,
        "iat": now,
        "exp": now + exp_offset,
    }
    headers = {"kid": kid}

    if algorithm == "ES256":
        return jwt.encode(payload, private_key, algorithm=algorithm, headers=headers)
    # For non-ES256 tokens (e.g. HS256) use a string secret
    return jwt.encode(payload, "test-secret", algorithm=algorithm, headers=headers)


@pytest.fixture
def mock_jwks_client(ec_keypair, monkeypatch):
    """
    Monkeypatch the module-level jwks_client singleton in shared/security.py.
    get_signing_key_from_jwt returns the fixture public key by default.
    """
    _, public_key = ec_keypair
    client = MagicMock()
    client.get_signing_key_from_jwt.return_value = SimpleNamespace(key=public_key)
    monkeypatch.setattr("app.shared.security.jwks_client", client)
    return client


# ---------------------------------------------------------------------------
# Test app (only used in this test module — never in production main.py)
# ---------------------------------------------------------------------------

_test_router_app = FastAPI()
_test_router_app.include_router(health.router)


@_test_router_app.get("/protected")
async def protected_route(user_id: str = Depends(get_current_user)) -> dict:
    return {"user_id": user_id}


@pytest.fixture
def client():
    return TestClient(_test_router_app)


# ---------------------------------------------------------------------------
# JA-T-01 — Valid ES256 token → 200 and correct sub returned
# ---------------------------------------------------------------------------


def test_ja_t01_valid_token_returns_200_and_sub(ec_keypair, mock_jwks_client, client):
    private_key, _ = ec_keypair
    token = make_token(private_key, sub="user-uuid-abc")

    response = client.get("/protected", headers={"Authorization": f"Bearer {token}"})

    assert response.status_code == 200
    assert response.json()["user_id"] == "user-uuid-abc"


# ---------------------------------------------------------------------------
# JA-T-02 — No Authorization header → 401 + WWW-Authenticate: Bearer
# ---------------------------------------------------------------------------


def test_ja_t02_missing_auth_header_returns_401(mock_jwks_client, client):
    response = client.get("/protected")

    assert response.status_code == 401
    assert response.headers.get("WWW-Authenticate") == "Bearer"


# ---------------------------------------------------------------------------
# JA-T-03 — Bearer with empty token part → 401
# ---------------------------------------------------------------------------


def test_ja_t03_empty_bearer_token_returns_401(mock_jwks_client, client):
    response = client.get("/protected", headers={"Authorization": "Bearer "})

    assert response.status_code == 401
    assert response.headers.get("WWW-Authenticate") == "Bearer"


# ---------------------------------------------------------------------------
# JA-T-04 — Header present but no Bearer prefix → 401
# ---------------------------------------------------------------------------


def test_ja_t04_no_bearer_prefix_returns_401(mock_jwks_client, client):
    response = client.get("/protected", headers={"Authorization": "Token abc123"})

    assert response.status_code == 401
    assert response.headers.get("WWW-Authenticate") == "Bearer"


# ---------------------------------------------------------------------------
# JA-T-05 — Token signed by unknown EC key → 401
# ---------------------------------------------------------------------------


def test_ja_t05_unknown_signing_key_returns_401(ec_keypair, mock_jwks_client, client):
    # Sign with a *different* private key; mock still returns fixture public key
    unknown_private_key = generate_private_key(SECP256R1(), default_backend())
    token = make_token(unknown_private_key)

    response = client.get("/protected", headers={"Authorization": f"Bearer {token}"})

    assert response.status_code == 401
    assert response.headers.get("WWW-Authenticate") == "Bearer"


# ---------------------------------------------------------------------------
# JA-T-06 — Expired token → 401
# ---------------------------------------------------------------------------


def test_ja_t06_expired_token_returns_401(ec_keypair, mock_jwks_client, client):
    private_key, _ = ec_keypair
    token = make_token(private_key, exp_offset=-1)

    response = client.get("/protected", headers={"Authorization": f"Bearer {token}"})

    assert response.status_code == 401
    assert response.headers.get("WWW-Authenticate") == "Bearer"


# ---------------------------------------------------------------------------
# JA-T-07 — Malformed string → 401
# ---------------------------------------------------------------------------


def test_ja_t07_malformed_token_returns_401(mock_jwks_client, client):
    response = client.get("/protected", headers={"Authorization": "Bearer not.a.jwt"})

    assert response.status_code == 401
    assert response.headers.get("WWW-Authenticate") == "Bearer"


# ---------------------------------------------------------------------------
# JA-T-08 — GET /health without auth → 200 (public endpoint)
# ---------------------------------------------------------------------------


def test_ja_t08_health_endpoint_is_public(client):
    response = client.get("/health")

    assert response.status_code == 200


# ---------------------------------------------------------------------------
# JA-T-09 — Token with aud: "anon" → 401
# ---------------------------------------------------------------------------


def test_ja_t09_wrong_audience_returns_401(ec_keypair, mock_jwks_client, client):
    private_key, _ = ec_keypair
    token = make_token(private_key, aud="anon")

    response = client.get("/protected", headers={"Authorization": f"Bearer {token}"})

    assert response.status_code == 401
    assert response.headers.get("WWW-Authenticate") == "Bearer"


# ---------------------------------------------------------------------------
# JA-T-10 — Token with wrong issuer → 401
# ---------------------------------------------------------------------------


def test_ja_t10_wrong_issuer_returns_401(ec_keypair, mock_jwks_client, client):
    private_key, _ = ec_keypair
    token = make_token(private_key, iss="https://attacker.example.com/auth/v1")

    response = client.get("/protected", headers={"Authorization": f"Bearer {token}"})

    assert response.status_code == 401
    assert response.headers.get("WWW-Authenticate") == "Bearer"


# ---------------------------------------------------------------------------
# JA-T-11 — JWKS client raises PyJWKClientError → 401
# ---------------------------------------------------------------------------


def test_ja_t11_jwks_client_error_returns_401(ec_keypair, mock_jwks_client, client):
    private_key, _ = ec_keypair
    token = make_token(private_key)
    mock_jwks_client.get_signing_key_from_jwt.side_effect = (
        jwt.exceptions.PyJWKClientError("unknown kid after re-fetch")
    )

    response = client.get("/protected", headers={"Authorization": f"Bearer {token}"})

    assert response.status_code == 401
    assert response.headers.get("WWW-Authenticate") == "Bearer"


# ---------------------------------------------------------------------------
# JA-T-12 — Token with algorithm != ES256 → 401
# ---------------------------------------------------------------------------


def test_ja_t12_wrong_algorithm_returns_401(mock_jwks_client, client):
    # HS256-signed token; algorithms=["ES256"] in decode → InvalidAlgorithmError.
    # The mock returns an EC key, but that is irrelevant here: PyJWT rejects the
    # HS256 algorithm at the algorithm-pin check BEFORE attempting to use the key.
    token = make_token(None, algorithm="HS256")

    response = client.get("/protected", headers={"Authorization": f"Bearer {token}"})

    assert response.status_code == 401
    assert response.headers.get("WWW-Authenticate") == "Bearer"


# ---------------------------------------------------------------------------
# JA-T-13 — Otherwise-valid token without a `sub` claim → 401 (not 500)
# ---------------------------------------------------------------------------


def test_ja_t13_missing_sub_claim_returns_401(ec_keypair, mock_jwks_client, client):
    # A token can pass signature/aud/iss/exp validation yet omit `sub`. The
    # implementation must treat this as 401, never let a KeyError surface as 500
    # (JA-002.5: every failure → 401).
    private_key, _ = ec_keypair
    now = int(time.time())
    payload = {
        "aud": "authenticated",
        "iss": _derived_issuer(),
        "iat": now,
        "exp": now + 3600,
    }
    token = jwt.encode(
        payload, private_key, algorithm="ES256", headers={"kid": "test-kid-1"}
    )

    response = client.get("/protected", headers={"Authorization": f"Bearer {token}"})

    assert response.status_code == 401
    assert response.headers.get("WWW-Authenticate") == "Bearer"


# ---------------------------------------------------------------------------
# JA-T-14 — Otherwise-valid token without an `exp` claim → 401 (never expires)
# ---------------------------------------------------------------------------


def test_ja_t14_missing_exp_claim_returns_401(ec_keypair, mock_jwks_client, client):
    # A signed token without `exp` would otherwise be accepted forever. The
    # decode requires `exp`, so a token omitting it must be rejected (401).
    private_key, _ = ec_keypair
    payload = {
        "sub": "user-uuid-1234",
        "aud": "authenticated",
        "iss": _derived_issuer(),
        "iat": int(time.time()),
    }
    token = jwt.encode(
        payload, private_key, algorithm="ES256", headers={"kid": "test-kid-1"}
    )

    response = client.get("/protected", headers={"Authorization": f"Bearer {token}"})

    assert response.status_code == 401
    assert response.headers.get("WWW-Authenticate") == "Bearer"


# ---------------------------------------------------------------------------
# T-13 — database factory import tests (shared/database.py does not exist yet)
# ---------------------------------------------------------------------------


def test_database_factory_is_importable():
    from app.shared.database import get_supabase_client

    assert callable(get_supabase_client)


def test_database_factory_does_not_init_at_import():
    # Importing the module must not instantiate the Supabase client (no network
    # at import). Patch create_client and assert it is never called on reload.
    import importlib
    from unittest.mock import patch

    import app.shared.database

    try:
        with patch("supabase.create_client") as mock_create:
            importlib.reload(app.shared.database)

        mock_create.assert_not_called()
    finally:
        # Reloading under the patch rebinds the module's create_client to the
        # mock; reload once more to restore the real reference for later tests.
        importlib.reload(app.shared.database)
