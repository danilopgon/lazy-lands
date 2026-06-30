"""Lazy singleton Supabase client factory with service-role ownership constraints."""

from functools import lru_cache

from supabase import Client, create_client

from app.shared.config import settings


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
