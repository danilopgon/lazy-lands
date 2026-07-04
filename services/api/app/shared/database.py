"""Supabase client factories: service-role singleton and per-user per-request."""

from functools import lru_cache
from typing import Annotated

from fastapi import Depends
from supabase import Client, create_client

from app.shared.config import settings
from app.shared.security import AuthContext, get_auth_context


@lru_cache(maxsize=1)
def get_supabase_client() -> Client:
    """Lazy singleton Supabase client using the service-role key.

    OWNERSHIP CONSTRAINT (JA-004): This client uses the service-role key,
    which bypasses Supabase Row Level Security (RLS).  It is provided here
    for admin / seed use only.  Feature modules MUST NOT use this client
    for user-data reads or writes.  They MUST enforce ownership via RLS
    (per-user client context) or explicit campaign_id / user_id ownership
    checks.  This constraint is binding on all future blocks.
    """
    return create_client(
        str(settings.supabase_url).rstrip("/"),
        settings.supabase_service_role_key,
    )


def create_user_supabase_client(access_token: str) -> Client:
    """Construct a Supabase client authenticated AS the calling user.

    The ``apikey`` header stays the anon/publishable key; the Authorization
    bearer becomes the user's JWT, so ``auth.uid()`` resolves inside
    Postgres and RLS permits owner-scoped reads/writes.

    NEVER cached. Building a fresh client per call is deliberate: a cached
    or shared client would leak one user's token into another user's
    request. Contrast this with ``get_supabase_client()``'s ``lru_cache``
    singleton — that pattern is forbidden here because this client carries
    a request-scoped credential (PU-001, NFR-PU-1).
    """
    if not settings.supabase_publishable_key:
        raise RuntimeError(
            "SUPABASE_PUBLISHABLE_KEY is required to create a per-user Supabase client"
        )

    client = create_client(
        str(settings.supabase_url).rstrip("/"),
        settings.supabase_publishable_key,
    )
    client.postgrest.auth(access_token)
    return client


def get_user_supabase_client(
    ctx: Annotated[AuthContext, Depends(get_auth_context)],
) -> Client:
    """FastAPI dependency — a per-request client authenticated as the caller."""
    return create_user_supabase_client(ctx.access_token)
