"""FastAPI dependency providers for campaigns handlers.

Each provider constructs a query/command handler with the per-user Supabase
repository (or LLM provider) so route bodies never wire infrastructure
directly.
"""

from functools import lru_cache
from typing import Annotated

from fastapi import Depends
from supabase import Client

from app.modules.campaigns.application.commands.create_campaign import CreateCampaign
from app.modules.campaigns.application.commands.extract_campaign import ExtractCampaign
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
