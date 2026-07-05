"""App-layer ownership test — the precedent-setting test for per-user writes.

CP-004 / NFR-PU-2: existing RLS coverage (test_rls.py) is raw-SQL only and
does not exercise app-layer client construction. This test drives the real
path instead: sign in as two distinct Supabase auth users, build a per-user
client for each via ``create_user_supabase_client``, and run the
``CreateCampaign`` use case through that client — proving the per-user
client (never the service-role client) is what sits on the write path, and
that ownership/RLS holds end-to-end.

Requires a running local Supabase stack (``pnpm supabase start``); skips
otherwise, matching the established convention in test_rls.py / test_schema.py.
The current CI backend job does not start the local stack, so this class is
an opt-in local verification path today (consistent with the rest of the
DB-integration test suite).
"""

from __future__ import annotations

import uuid

import httpx
import pytest

from app.modules.campaigns.api.schemas.campaign.requests import CreateCampaignRequest
from app.modules.campaigns.application.commands.create_campaign import CreateCampaign
from app.modules.campaigns.infrastructure.repository import SupabaseCampaignRepository
from app.shared.config import settings
from app.shared.database import create_user_supabase_client, get_supabase_client


def _stack_is_up() -> bool:
    try:
        base = str(settings.supabase_url).rstrip("/")
        httpx.get(f"{base}/auth/v1/health", timeout=2)
        return True
    except httpx.HTTPError:
        return False


@pytest.fixture(scope="module")
def stack_guard():
    if not _stack_is_up():
        pytest.skip("Local Supabase stack not running on :54321")


@pytest.fixture
def two_test_users(stack_guard):
    """Create two ephemeral auth users via the service-role admin client."""
    admin = get_supabase_client()
    password = "Ownership-Test-Pass-1!"
    users: list[tuple[str, str]] = []
    for _ in range(2):
        email = f"ownership-test-{uuid.uuid4().hex}@lazylands.test"
        created = admin.auth.admin.create_user(
            {"email": email, "password": password, "email_confirm": True}
        )
        users.append((created.user.id, email))
    yield users, password
    for user_id, _email in users:
        admin.auth.admin.delete_user(user_id)


def _sign_in(email: str, password: str) -> str:
    base = str(settings.supabase_url).rstrip("/")
    response = httpx.post(
        f"{base}/auth/v1/token?grant_type=password",
        json={"email": email, "password": password},
        headers={"apikey": settings.supabase_publishable_key or ""},
        timeout=5,
    )
    response.raise_for_status()
    return str(response.json()["access_token"])


def test_campaign_created_under_authenticated_users_own_user_id(two_test_users) -> None:
    """CP-004 scenario 1: created campaign's user_id equals the caller's auth.uid()."""
    users, password = two_test_users
    (user_a_id, user_a_email), _user_b = users
    token_a = _sign_in(user_a_email, password)
    client_a = create_user_supabase_client(token_a)
    use_case = CreateCampaign(SupabaseCampaignRepository(client_a))

    payload = CreateCampaignRequest(
        title="Ownership Test Campaign", description="D", world_state="W"
    )
    campaign_id = use_case.execute(user_a_id, payload)

    try:
        row = (
            client_a.table("campaigns")
            .select("user_id")
            .eq("id", campaign_id)
            .single()
            .execute()
        )
        assert row.data["user_id"] == user_a_id
    finally:
        client_a.table("campaigns").delete().eq("id", campaign_id).execute()


def test_user_b_client_cannot_read_user_a_campaign(two_test_users) -> None:
    """CP-004 scenario 2: User A's data is never visible/writable by User B's client."""
    users, password = two_test_users
    (user_a_id, user_a_email), (_user_b_id, user_b_email) = users
    token_a = _sign_in(user_a_email, password)
    token_b = _sign_in(user_b_email, password)
    client_a = create_user_supabase_client(token_a)
    client_b = create_user_supabase_client(token_b)

    use_case = CreateCampaign(SupabaseCampaignRepository(client_a))
    payload = CreateCampaignRequest(
        title="Owned By A", description="D", world_state="W"
    )
    campaign_id = use_case.execute(user_a_id, payload)

    try:
        result = (
            client_b.table("campaigns").select("id").eq("id", campaign_id).execute()
        )
        assert result.data == []
    finally:
        client_a.table("campaigns").delete().eq("id", campaign_id).execute()
