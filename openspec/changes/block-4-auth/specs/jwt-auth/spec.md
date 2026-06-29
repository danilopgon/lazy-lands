# Spec: jwt-auth (revised — ES256/JWKS)

**Change**: block-4-auth
**Capability**: `jwt-auth` (new)
**Revised**: 2026-06-29 — Corrected from HS256/shared-secret to ES256/JWKS. See proposal amendment.

---

## Overview

Replace the `get_current_user` stub with real JWT validation using PyJWT `PyJWKClient`
against the Supabase JWKS endpoint. Supabase hosted projects sign tokens with **ES256**
(asymmetric ECC P-256) and a rotating key id (`kid`). No shared JWT secret is shipped
to the API. The JWKS URL and issuer are derived from the existing `SUPABASE_URL`
setting — no new env vars required.

`supabase_jwt_secret` is removed from `Settings`. This is a **breaking config change**
relative to the prior spec version.

---

## Functional requirements

### JA-001: PyJWT dependency

`pyjwt[crypto]` MUST be present in `services/api/pyproject.toml` under
`[project.dependencies]`. The `[crypto]` extra is required for ES256 support via the
`cryptography` package. No change from prior spec — dependency is the same.

---

### JA-002: `get_current_user` FastAPI dependency

`services/api/app/shared/security.py` MUST implement `get_current_user` as an `async`
FastAPI dependency using the JWKS-based contract below.

#### JA-002.1: Token extraction

The dependency MUST read the `Authorization` HTTP header. If the header is absent or does
not begin with `Bearer ` (case-sensitive space included), the dependency MUST raise
`HTTPException(status_code=401)` with `WWW-Authenticate: Bearer`.

#### JA-002.2: JWKS client instantiation

The dependency MUST use `jwt.PyJWKClient` to resolve the signing key. The JWKS endpoint
URL MUST be derived from `settings.supabase_url`:

```
jwks_uri = f"{settings.supabase_url}/auth/v1/.well-known/jwks.json"
```

`PyJWKClient` handles caching of fetched public keys and automatic re-fetch when an
unknown `kid` is encountered in a token header. The client SHOULD be instantiated once
(module-level singleton or dependency-injected singleton) to preserve the key cache across
requests.

#### JA-002.3: JWT decoding

The dependency MUST call `jwt.decode()` with:

| Parameter | Value |
|-----------|-------|
| `algorithms` | `["ES256"]` |
| `key` | `signing_key.key` from `PyJWKClient.get_signing_key_from_jwt(token)` |
| `audience` | `"authenticated"` |
| `issuer` | `f"{settings.supabase_url}/auth/v1"` |

Tokens signed with any algorithm other than `ES256` MUST be rejected with HTTP 401.

#### JA-002.4: Valid token return value

When the token passes all checks, the dependency MUST return the `sub` claim value as a
`str` (the Supabase user UUID). This string is the authenticated user identity used by
all downstream route handlers in future blocks.

#### JA-002.5: Error responses

Every failure condition MUST produce HTTP 401. The response MUST include the header
`WWW-Authenticate: Bearer`. The response body MUST include a `detail` string. No PyJWT
or PyJWKClient exception MUST propagate uncaught to the HTTP layer.

| Condition | Source |
|-----------|--------|
| Missing `Authorization` header | Pre-decode guard |
| Header does not start with `Bearer ` | Pre-decode guard |
| Malformed token (not a valid JWT) | `jwt.exceptions.DecodeError` |
| Token expired (`exp` in the past) | `jwt.exceptions.ExpiredSignatureError` |
| Tampered / invalid signature | `jwt.exceptions.InvalidSignatureError` |
| Audience mismatch (`aud != "authenticated"`) | `jwt.exceptions.InvalidAudienceError` |
| Issuer mismatch | `jwt.exceptions.InvalidIssuerError` |
| Algorithm not ES256 | `jwt.exceptions.InvalidAlgorithmError` |
| JWKS fetch failure / unknown kid after re-fetch | `jwt.exceptions.PyJWKClientError` |

#### Scenario: Valid ES256 token is accepted

- GIVEN a JWT signed with the project's EC P-256 private key, `aud: "authenticated"`, correct issuer, not yet expired
- WHEN a request to a protected endpoint includes `Authorization: Bearer <token>`
- THEN the response is HTTP 200 and the handler receives the correct `sub` value

#### Scenario: Missing Authorization header

- GIVEN no `Authorization` header is present
- WHEN the request reaches a protected endpoint
- THEN the response is HTTP 401 with `WWW-Authenticate: Bearer` header

#### Scenario: Token with wrong audience

- GIVEN a valid ES256 JWT where `aud` is `"anon"` or any value other than `"authenticated"`
- WHEN a request to a protected endpoint includes `Authorization: Bearer <token>`
- THEN the response is HTTP 401

#### Scenario: Token with wrong issuer

- GIVEN a valid ES256 JWT where `iss` does not match `{SUPABASE_URL}/auth/v1`
- WHEN a request to a protected endpoint includes `Authorization: Bearer <token>`
- THEN the response is HTTP 401

#### Scenario: Tampered signature

- GIVEN a syntactically valid JWT whose signature has been altered
- WHEN a request to a protected endpoint includes `Authorization: Bearer <token>`
- THEN the response is HTTP 401

#### Scenario: Expired token

- GIVEN a JWT whose `exp` claim is in the past
- WHEN a request to a protected endpoint includes `Authorization: Bearer <token>`
- THEN the response is HTTP 401

#### Scenario: JWKS key rotation — unknown kid

- GIVEN a JWT signed with a valid key but whose `kid` is not in the JWKS client's cache
- WHEN the JWKS client attempts a re-fetch and the key is found in the refreshed JWKS
- THEN the token is accepted and the response is HTTP 200

#### Scenario: JWKS unreachable

- GIVEN the JWKS endpoint is unreachable or returns an error
- WHEN a request to a protected endpoint is made with any token
- THEN the response is HTTP 401 (no unhandled exception reaches the HTTP layer)

---

### JA-003: `GET /health` remains public

`GET /health` MUST NOT use `get_current_user` as a dependency. It MUST return HTTP 200
regardless of whether an `Authorization` header is present or absent.

#### Scenario: Health endpoint is unauthenticated

- GIVEN no `Authorization` header
- WHEN `GET /health` is called
- THEN the response is HTTP 200

---

### JA-004: `shared/database.py` Supabase client factory

`services/api/app/shared/database.py` MUST provide a factory that creates a Supabase
client using `settings.supabase_url` and `settings.supabase_service_role_key`.

> **Ownership constraint (forward requirement)**: The service-role client bypasses
> Supabase RLS. It is scaffolded here for admin/seed use only. Feature modules in later
> blocks MUST NOT use the service-role client for user-data reads or writes. They MUST
> enforce ownership via RLS (per-user client context) or explicit `campaign_id`/`user_id`
> ownership checks. This constraint is binding on all future blocks.

The client factory MUST be importable from `app.shared.database` and MUST NOT instantiate
the Supabase client at module load time (factory function or lazy singleton pattern).

---

### JA-005: `supabase_jwt_secret` removed from `Settings`

`services/api/app/shared/config.py` MUST NOT contain a `supabase_jwt_secret` field.
The JWKS URL and JWT issuer are derived programmatically from `settings.supabase_url`
(which already exists). No new environment variable is introduced for JWT validation.

If `supabase_jwt_secret` is referenced anywhere in application code or tests after this
change, those references MUST be removed. Tests MUST NOT inject a raw JWT secret for
signing or validation — they MUST use the keypair-fixture approach described below.

> **Why**: Shipping a shared secret to the API service creates a credential that, if
> leaked, allows arbitrary JWT forgery. JWKS validation uses only the public key, which
> is safe to expose. Supabase hosted projects already use asymmetric ES256; eliminating
> the secret aligns local, CI, and production environments.

---

### JA-006: Local Supabase MUST emit ES256 tokens

For tests to be valid and for local development to be equivalent to production, the local
Supabase stack MUST be configured to sign JWTs with an asymmetric EC P-256 key pair.

**Requirement**: `supabase/config.toml` MUST have `signing_keys_path` set to a valid
signing keys file path (the line is currently commented out at line 168-169).

**Signing keys file**: A signing key file MUST be generated using the Supabase CLI. The
exact command MUST be verified against current Supabase CLI documentation before setup
(see risks). The generated file contains a JSON object with a `keys` array of JWK
objects. The file path MUST be added to `.gitignore` — do NOT commit the file.

**Testable acceptance condition**: After local setup, running
`supabase start` and calling `supabase auth token` (or registering a test user) MUST
produce a JWT whose header contains `"alg": "ES256"`. The JWKS endpoint at
`http://127.0.0.1:54321/auth/v1/.well-known/jwks.json` MUST return the corresponding
public key.

---

## Test requirements

### Strict TDD — tests before implementation

All tests MUST be written in a failing state before `get_current_user` is modified.
Tests MUST pass only after the implementation is complete.

### Test fixture: EC P-256 keypair

Tests MUST use a pytest fixture that generates a real EC P-256 key pair in memory:

```python
# conftest.py or jwt_auth fixture file
from cryptography.hazmat.primitives.asymmetric.ec import generate_private_key, SECP256R1
from cryptography.hazmat.backends import default_backend

@pytest.fixture(scope="session")
def ec_keypair():
    private_key = generate_private_key(SECP256R1(), default_backend())
    public_key = private_key.public_key()
    return private_key, public_key
```

### Test fixture: token helper

Tests MUST use a helper that generates ES256 JWTs signed with the fixture private key:

```python
def make_token(
    private_key,
    sub: str = "user-uuid",
    aud: str = "authenticated",
    iss: str = "https://example.supabase.co/auth/v1",
    exp_offset: int = 3600,   # seconds from now; negative = expired
    algorithm: str = "ES256",
    kid: str = "test-kid-1",
) -> str: ...
```

### Test fixture: mocked PyJWKClient

Tests MUST mock `jwt.PyJWKClient` so no HTTP request is made. The mock
`get_signing_key_from_jwt(token)` method returns a `SimpleNamespace(key=public_key)` for
known tokens and raises `jwt.exceptions.PyJWKClientError` for rotation/failure scenarios:

```python
@pytest.fixture
def mock_jwks_client(ec_keypair, monkeypatch):
    _, public_key = ec_keypair
    client = MagicMock()
    client.get_signing_key_from_jwt.return_value = SimpleNamespace(key=public_key)
    monkeypatch.setattr("app.shared.security.jwks_client", client)
    return client
```

### Test fixture: protected test endpoint

Tests MUST mount a minimal FastAPI app with a single protected route. This endpoint
MUST NOT be registered in production `main.py`:

```python
@test_router.get("/protected")
async def protected_route(user_id: str = Depends(get_current_user)) -> dict:
    return {"user_id": user_id}
```

### Test matrix

| Test ID | Input | Expected HTTP status |
|---------|-------|---------------------|
| JA-T-01 | Valid ES256 token (correct key, `aud: "authenticated"`, correct issuer, not expired) | 200 |
| JA-T-02 | No `Authorization` header | 401 |
| JA-T-03 | `Authorization: Bearer ` (empty token part) | 401 |
| JA-T-04 | Header present but no `Bearer ` prefix | 401 |
| JA-T-05 | Token signed by an unknown EC key (signature mismatch) | 401 |
| JA-T-06 | Expired token (`exp` in the past) | 401 |
| JA-T-07 | Malformed string (not a valid JWT) | 401 |
| JA-T-08 | `GET /health` with no Authorization header | 200 |
| JA-T-09 | Token with `aud: "anon"` | 401 |
| JA-T-10 | Token with wrong issuer | 401 |
| JA-T-11 | JWKS client raises `PyJWKClientError` (simulating unreachable JWKS or unknown kid after re-fetch) | 401 |

All 401 responses MUST include `WWW-Authenticate: Bearer` in the response headers.
Test MUST assert this header is present on every 401 response.

### JWKS key rotation unit test

To validate that `PyJWKClient` re-fetch behavior is exercised (and not silently bypassed),
test JA-T-11 MUST configure the mock to raise `PyJWKClientError` and assert the response
is 401. This proves the implementation handles JWKS errors gracefully. The actual
re-fetch-and-succeed path is an integration concern covered by PyJWKClient's own test
suite; it need not be re-tested here.

---

## Non-functional requirements

### NFR-JA-1: Test isolation

JWT tests MUST NOT require a live Supabase stack, network access, or any HTTP server.
All key material is generated in-memory; all JWKS resolution is mocked.

### NFR-JA-2: No hardcoded project references in application code

The JWKS URL and issuer MUST be derived from `settings.supabase_url` at runtime.
The string `vprryqqoforhdtbejqab` or any other project ref MUST NOT appear in
application code or spec files (only in the dashboard setup guide, clearly labeled
as a placeholder example).

### NFR-JA-3: JWKS client is a singleton or request-scoped cache

`PyJWKClient` MUST NOT be instantiated on every request. A module-level singleton or
FastAPI dependency-injected singleton is required to preserve the key cache.

---

## Acceptance criteria

1. `pyjwt[crypto]` is present in `pyproject.toml` dependencies. (JA-001)
2. `get_current_user` in `shared/security.py` uses `PyJWKClient` with `algorithms=["ES256"]`,
   `audience="authenticated"`, and `issuer` derived from `settings.supabase_url`. (JA-002)
3. `get_current_user` returns the `sub` claim as a `str` on valid tokens. (JA-002.4)
4. All 11 test cases in the test matrix pass. (Test requirements)
5. All 401 responses include `WWW-Authenticate: Bearer`. (JA-002.5)
6. `GET /health` returns 200 without an `Authorization` header. (JA-003)
7. `shared/database.py` is importable and provides a Supabase client factory. (JA-004)
8. `supabase_jwt_secret` does not appear in `Settings` or in any application import. (JA-005)
9. `supabase/config.toml` has `signing_keys_path` set and a signing keys file generated. (JA-006)
10. Local JWKS endpoint at `http://127.0.0.1:54321/auth/v1/.well-known/jwks.json`
    returns an ES256 public key after `supabase start`. (JA-006)
11. JWT tests do not make any network requests. (NFR-JA-1)
12. No project-specific string (project ref) is hardcoded in application code. (NFR-JA-2)
