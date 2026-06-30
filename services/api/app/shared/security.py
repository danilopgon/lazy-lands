from typing import Annotated

import jwt
from fastapi import Header, HTTPException, status

from app.shared.config import settings

# ---------------------------------------------------------------------------
# Module-level JWKS singleton (NFR-JA-3 — one client per process, key cache
# preserved across requests; PyJWKClient() makes no network call at construction).
# ---------------------------------------------------------------------------

# Fail fast on misconfiguration: without SUPABASE_URL the derived JWKS URI is
# "None/auth/v1/…", which would silently reject every request with a generic 401
# at runtime instead of surfacing the missing env var. Catch it at startup.
if settings.supabase_url is None:
    raise RuntimeError(
        "SUPABASE_URL is required for JWT validation but is not set."
    )

# Trailing-slash guard: Pydantic v2 normalises AnyHttpUrl with a trailing "/".
# Without rstrip() the derived issuer becomes "…//auth/v1" and every valid token
# is rejected (JA-T-01, JA-T-10 both fail on InvalidIssuerError).
_base: str = str(settings.supabase_url).rstrip("/")
_jwks_uri: str = f"{_base}/auth/v1/.well-known/jwks.json"
_issuer: str = f"{_base}/auth/v1"

jwks_client: jwt.PyJWKClient = jwt.PyJWKClient(_jwks_uri)

_WWW_AUTHENTICATE = {"WWW-Authenticate": "Bearer"}


def _unauthorized() -> HTTPException:
    """Build a fresh 401. A new instance per raise avoids mutating a shared
    exception's ``__cause__`` via ``raise … from exc`` (corrupts error chains
    in async tracing/logging)."""
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers=_WWW_AUTHENTICATE,
    )


async def get_current_user(
    authorization: Annotated[str | None, Header()] = None,
) -> str:
    """
    FastAPI dependency — validates a Supabase ES256 JWT.

    Extracts the Bearer token from the Authorization header, resolves the
    signing key via the JWKS endpoint singleton, and decodes with strict
    audience + issuer checks.  Every failure path raises HTTP 401 with a
    WWW-Authenticate: Bearer header.  Returns the ``sub`` claim as a str
    (the Supabase user UUID) for downstream handlers.
    """
    # --- pre-decode guard ---------------------------------------------------
    if not authorization or not authorization.startswith("Bearer "):
        raise _unauthorized()

    token = authorization[len("Bearer "):]
    if not token:
        raise _unauthorized()

    # --- JWKS key resolution + JWT decode -----------------------------------
    try:
        signing_key = jwks_client.get_signing_key_from_jwt(token)
        payload = jwt.decode(
            token,
            signing_key.key,
            algorithms=["ES256"],
            audience="authenticated",
            issuer=_issuer,
        )
    except jwt.PyJWTError as exc:
        raise _unauthorized() from exc

    # A token can pass signature/aud/iss/exp validation yet omit ``sub`` —
    # PyJWT does not require it. Treat a missing/non-str sub as 401, never let
    # the KeyError surface as a 500 (JA-002.5: all failures → 401).
    sub = payload.get("sub")
    if not sub or not isinstance(sub, str):
        raise _unauthorized()

    return sub
