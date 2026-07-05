"""HTTP routes for the campaigns module: extract (stateless) and create (persist)."""

from typing import Annotated

from fastapi import APIRouter, Depends
from starlette.concurrency import run_in_threadpool
from supabase import Client

from app.modules.campaigns.application.create_campaign import CreateCampaign
from app.modules.campaigns.application.extract_campaign import ExtractCampaign
from app.modules.campaigns.application.get_campaign_detail import GetCampaignDetail
from app.modules.campaigns.application.get_campaigns import GetCampaigns
from app.modules.campaigns.infrastructure.repository import SupabaseCampaignRepository
from app.modules.campaigns.schemas import (
    CampaignDetailResponse,
    CampaignSummary,
    CreateCampaignRequest,
    CreateCampaignResponse,
    ExtractCampaignOutput,
    ExtractRequest,
)
from app.shared.database import get_user_supabase_client
from app.shared.dependencies import get_current_user
from app.shared.llm.port import LlmProvider
from app.shared.llm.providers.registry import build_provider
from app.shared.security import AuthContext, get_auth_context

router = APIRouter(prefix="/campaigns", tags=["campaigns"])


def get_llm_provider() -> LlmProvider:
    """FastAPI dependency wrapping ``build_provider`` — overridable in tests."""
    return build_provider()


@router.post("/extract", response_model=ExtractCampaignOutput)
async def extract_campaign(
    payload: ExtractRequest,
    _user_id: Annotated[str, Depends(get_current_user)],
    llm_provider: Annotated[LlmProvider, Depends(get_llm_provider)],
) -> ExtractCampaignOutput:
    """Extract a structured campaign scaffold from a DM's free-text premise.

    Stateless: writes nothing to any table (CE-006).
    """
    use_case = ExtractCampaign(llm_provider=llm_provider)
    return await use_case.execute(payload.raw_text)


@router.get("", response_model=list[CampaignSummary])
async def list_campaigns(
    client: Annotated[Client, Depends(get_user_supabase_client)],
) -> list[CampaignSummary]:
    """Return campaigns visible to the authenticated caller."""
    repository = SupabaseCampaignRepository(client)
    use_case = GetCampaigns(repository)
    return await run_in_threadpool(use_case.execute)


@router.get("/{campaign_id}", response_model=CampaignDetailResponse)
async def get_campaign_detail(
    campaign_id: str,
    client: Annotated[Client, Depends(get_user_supabase_client)],
) -> CampaignDetailResponse:
    """Return one campaign plus NPC, faction, and arc children."""
    repository = SupabaseCampaignRepository(client)
    use_case = GetCampaignDetail(repository)
    return await run_in_threadpool(use_case.execute, campaign_id)


@router.post("", response_model=CreateCampaignResponse)
async def create_campaign(
    payload: CreateCampaignRequest,
    ctx: Annotated[AuthContext, Depends(get_auth_context)],
    client: Annotated[Client, Depends(get_user_supabase_client)],
) -> CreateCampaignResponse:
    """Persist a DM-reviewed campaign (and its NPCs/factions/arcs).

    Writes go through the per-user Supabase client only (PU-003, NFR-CP-1).
    """
    repository = SupabaseCampaignRepository(client)
    use_case = CreateCampaign(repository)
    campaign_id = await run_in_threadpool(use_case.execute, ctx.user_id, payload)
    return CreateCampaignResponse(id=campaign_id)
