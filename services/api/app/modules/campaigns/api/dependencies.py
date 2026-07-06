"""FastAPI dependency providers for campaigns handlers.

Each provider constructs a query/command handler with the per-user Supabase
repository (or LLM provider) so route bodies never wire infrastructure
directly.
"""

from functools import lru_cache
from typing import Annotated

from fastapi import Depends
from supabase import Client

from app.modules.campaigns.application.commands.create_arc import CreateArc
from app.modules.campaigns.application.commands.create_campaign import CreateCampaign
from app.modules.campaigns.application.commands.create_faction import CreateFaction
from app.modules.campaigns.application.commands.create_npc import CreateNpc
from app.modules.campaigns.application.commands.delete_arc import DeleteArc
from app.modules.campaigns.application.commands.delete_faction import DeleteFaction
from app.modules.campaigns.application.commands.delete_npc import DeleteNpc
from app.modules.campaigns.application.commands.extract_campaign import ExtractCampaign
from app.modules.campaigns.application.commands.update_arc import UpdateArc
from app.modules.campaigns.application.commands.update_campaign import UpdateCampaign
from app.modules.campaigns.application.commands.update_faction import UpdateFaction
from app.modules.campaigns.application.commands.update_npc import UpdateNpc
from app.modules.campaigns.application.queries.get_campaign_detail import (
    GetCampaignDetail,
)
from app.modules.campaigns.application.queries.get_campaigns import GetCampaigns
from app.modules.campaigns.infrastructure.repository import SupabaseCampaignRepository
from app.shared.database import get_user_supabase_client
from app.shared.llm.port import LlmProvider
from app.shared.llm.providers.registry import build_provider


@lru_cache
def get_llm_provider() -> LlmProvider:
    """FastAPI dependency wrapping ``build_provider``.

    Cached for the process lifetime so the extract path does not rebuild
    ``Settings`` (re-reading env/.env) on every request. Tests override this
    via ``dependency_overrides``, which bypasses the cache entirely.
    """
    return build_provider()


def provide_get_campaigns(
    client: Annotated[Client, Depends(get_user_supabase_client)],
) -> GetCampaigns:
    """Build the GetCampaigns query handler with the caller-scoped repository."""
    return GetCampaigns(SupabaseCampaignRepository(client))


def provide_get_campaign_detail(
    client: Annotated[Client, Depends(get_user_supabase_client)],
) -> GetCampaignDetail:
    """Build the GetCampaignDetail query handler with the caller-scoped repository."""
    return GetCampaignDetail(SupabaseCampaignRepository(client))


def provide_create_campaign(
    client: Annotated[Client, Depends(get_user_supabase_client)],
) -> CreateCampaign:
    """Build the CreateCampaign command handler with the caller-scoped repository."""
    return CreateCampaign(SupabaseCampaignRepository(client))


def provide_extract_campaign(
    llm_provider: Annotated[LlmProvider, Depends(get_llm_provider)],
) -> ExtractCampaign:
    """Build the ExtractCampaign command handler with the injected LLM provider."""
    return ExtractCampaign(llm_provider=llm_provider)


def provide_update_campaign(
    client: Annotated[Client, Depends(get_user_supabase_client)],
) -> UpdateCampaign:
    """Build the UpdateCampaign command handler with the caller-scoped repository."""
    return UpdateCampaign(SupabaseCampaignRepository(client))


def provide_create_npc(
    client: Annotated[Client, Depends(get_user_supabase_client)],
) -> CreateNpc:
    """Build the CreateNpc command handler with the caller-scoped repository."""
    return CreateNpc(SupabaseCampaignRepository(client))


def provide_update_npc(
    client: Annotated[Client, Depends(get_user_supabase_client)],
) -> UpdateNpc:
    """Build the UpdateNpc command handler with the caller-scoped repository."""
    return UpdateNpc(SupabaseCampaignRepository(client))


def provide_delete_npc(
    client: Annotated[Client, Depends(get_user_supabase_client)],
) -> DeleteNpc:
    """Build the DeleteNpc command handler with the caller-scoped repository."""
    return DeleteNpc(SupabaseCampaignRepository(client))


def provide_create_faction(
    client: Annotated[Client, Depends(get_user_supabase_client)],
) -> CreateFaction:
    """Build the CreateFaction command handler with the caller-scoped repository."""
    return CreateFaction(SupabaseCampaignRepository(client))


def provide_update_faction(
    client: Annotated[Client, Depends(get_user_supabase_client)],
) -> UpdateFaction:
    """Build the UpdateFaction command handler with the caller-scoped repository."""
    return UpdateFaction(SupabaseCampaignRepository(client))


def provide_delete_faction(
    client: Annotated[Client, Depends(get_user_supabase_client)],
) -> DeleteFaction:
    """Build the DeleteFaction command handler with the caller-scoped repository."""
    return DeleteFaction(SupabaseCampaignRepository(client))


def provide_create_arc(
    client: Annotated[Client, Depends(get_user_supabase_client)],
) -> CreateArc:
    """Build the CreateArc command handler with the caller-scoped repository."""
    return CreateArc(SupabaseCampaignRepository(client))


def provide_update_arc(
    client: Annotated[Client, Depends(get_user_supabase_client)],
) -> UpdateArc:
    """Build the UpdateArc command handler with the caller-scoped repository."""
    return UpdateArc(SupabaseCampaignRepository(client))


def provide_delete_arc(
    client: Annotated[Client, Depends(get_user_supabase_client)],
) -> DeleteArc:
    """Build the DeleteArc command handler with the caller-scoped repository."""
    return DeleteArc(SupabaseCampaignRepository(client))
