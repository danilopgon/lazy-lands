"""HTTP routes for the campaigns module: extract (stateless) and create (persist)."""

from typing import Annotated

from fastapi import APIRouter, Depends
from starlette.concurrency import run_in_threadpool

from app.modules.campaigns.api.dependencies import (
    provide_create_campaign,
    provide_extract_campaign,
    provide_get_campaign_detail,
    provide_get_campaigns,
)
from app.modules.campaigns.api.schemas.campaign.requests import (
    CreateCampaignRequest,
    ExtractRequest,
)
from app.modules.campaigns.api.schemas.campaign.responses import (
    CampaignDetailResponse,
    CampaignSummary,
    CreateCampaignResponse,
)
from app.modules.campaigns.application.commands.create_campaign import CreateCampaign
from app.modules.campaigns.application.commands.extract_campaign import ExtractCampaign
from app.modules.campaigns.application.contracts import ExtractCampaignOutput
from app.modules.campaigns.application.queries.get_campaign_detail import (
    GetCampaignDetail,
)
from app.modules.campaigns.application.queries.get_campaigns import GetCampaigns
from app.shared.dependencies import get_current_user
from app.shared.security import AuthContext, get_auth_context

router = APIRouter(prefix="/campaigns", tags=["campaigns"])


@router.post("/extract", response_model=ExtractCampaignOutput)
async def extract_campaign(
    payload: ExtractRequest,
    _user_id: Annotated[str, Depends(get_current_user)],
    handler: Annotated[ExtractCampaign, Depends(provide_extract_campaign)],
) -> ExtractCampaignOutput:
    """Extract a structured campaign scaffold from a DM's free-text premise.

    Stateless: writes nothing to any table (CE-006).
    """
    return await handler.execute(payload.raw_text)


@router.get("", response_model=list[CampaignSummary])
async def list_campaigns(
    handler: Annotated[GetCampaigns, Depends(provide_get_campaigns)],
) -> list[CampaignSummary]:
    """Return campaigns visible to the authenticated caller."""
    return await run_in_threadpool(handler.execute)


@router.get("/{campaign_id}", response_model=CampaignDetailResponse)
async def get_campaign_detail(
    campaign_id: str,
    handler: Annotated[GetCampaignDetail, Depends(provide_get_campaign_detail)],
) -> CampaignDetailResponse:
    """Return one campaign plus NPC, faction, and arc children."""
    return await run_in_threadpool(handler.execute, campaign_id)


@router.post("", response_model=CreateCampaignResponse)
async def create_campaign(
    payload: CreateCampaignRequest,
    ctx: Annotated[AuthContext, Depends(get_auth_context)],
    handler: Annotated[CreateCampaign, Depends(provide_create_campaign)],
) -> CreateCampaignResponse:
    """Persist a DM-reviewed campaign (and its NPCs/factions/arcs).

    Writes go through the per-user Supabase client only (PU-003, NFR-CP-1).
    """
    campaign_id = await run_in_threadpool(handler.execute, ctx.user_id, payload)
    return CreateCampaignResponse(id=campaign_id)
