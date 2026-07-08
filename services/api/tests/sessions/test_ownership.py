"""App-layer ownership test for sessions — mirrors campaigns/test_ownership.py.

RLS on ``sessions`` already exists (verified against
``supabase/migrations/20260628101707_initial_schema.sql``: ownership via the
parent campaign, `sessions_select`/`sessions_insert`/`sessions_update`/
`sessions_delete` policies — see 8.1). This test drives the real app-layer
path against a running local Supabase stack to confirm a foreign user cannot
read/write another user's sessions; it skips (does not fail) when the stack
is not running, consistent with the campaigns module's opt-in convention.
"""

from __future__ import annotations

import uuid

import httpx
import pytest

from app.modules.campaigns.application.commands.create_campaign import (
    CreateCampaign,
    CreateCampaignCommand,
)
from app.modules.campaigns.infrastructure.repository import SupabaseCampaignRepository
from app.modules.sessions.application.commands.register_session import (
    RegisterSession,
    RegisterSessionCommand,
)
from app.modules.sessions.application.commands.suggest_memories import SuggestMemories
from app.modules.sessions.application.commands.summarize_campaign import (
    SummarizeCampaign,
)
from app.modules.sessions.infrastructure.repository import SupabaseSessionRepository
from app.shared.config import settings
from app.shared.database import create_user_supabase_client, get_supabase_client
from app.shared.llm.providers.fake import FakeLlmProvider


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
    try:
        for _ in range(2):
            email = f"session-ownership-test-{uuid.uuid4().hex}@lazylands.test"
            created = admin.auth.admin.create_user(
                {"email": email, "password": password, "email_confirm": True}
            )
            users.append((created.user.id, email))
        yield users, password
    finally:
        # Guarantee cleanup even if the second create_user raises mid-setup,
        # so a partially-created fixture never orphans users in the auth system.
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


@pytest.mark.asyncio
async def test_user_b_client_cannot_read_or_write_user_a_sessions(
    two_test_users,
) -> None:
    """A foreign user's session read/write is blocked at the RLS layer."""
    users, password = two_test_users
    (user_a_id, user_a_email), (_user_b_id, user_b_email) = users
    token_a = _sign_in(user_a_email, password)
    token_b = _sign_in(user_b_email, password)
    client_a = create_user_supabase_client(token_a)
    client_b = create_user_supabase_client(token_b)

    campaign_use_case = CreateCampaign(SupabaseCampaignRepository(client_a))
    campaign_id = campaign_use_case.execute(
        user_a_id,
        CreateCampaignCommand(
            title="Owned By A", description="D", world_state="W", system="D&D 5e"
        ),
    )

    provider = FakeLlmProvider()
    from app.modules.sessions.application.contracts import (
        CampaignSummaryOutput,
        MemorySuggestionsOutput,
    )

    provider.register(CampaignSummaryOutput, {"accumulated_summary": "s"})
    provider.register(MemorySuggestionsOutput, {"suggestions": []})
    repo_a = SupabaseSessionRepository(client_a)
    register_use_case = RegisterSession(
        repo_a,
        SummarizeCampaign(provider, repo_a),
        SuggestMemories(provider, repo_a),
    )

    try:
        result = await register_use_case.execute(
            campaign_id,
            RegisterSessionCommand(summary="A's session.", consequences=None),
        )

        # User B cannot read User A's session under RLS.
        session_result = (
            client_b.table("sessions")
            .select("id")
            .eq("id", result.session_id)
            .execute()
        )
        assert session_result.data == []

        # User B cannot forge a session under User A's campaign either.
        repo_b = SupabaseSessionRepository(client_b)
        with pytest.raises(Exception):  # noqa: B017, PT011 - RLS insert rejection
            repo_b.insert_session(campaign_id, 99, "Forged session.", None)
    finally:
        client_a.table("campaigns").delete().eq("id", campaign_id).execute()
