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
from app.modules.campaigns.api.schemas.campaign.responses import CreateCampaignResponse
from app.modules.campaigns.application.commands.create_campaign import (
    CreateCampaign,
    CreateCampaignCommand,
)
from app.modules.campaigns.application.commands.extract_campaign import ExtractCampaign
from app.modules.campaigns.application.contracts import ExtractCampaignOutput
from app.modules.campaigns.application.queries.get_campaign_detail import (
    GetCampaignDetail,
)
from app.modules.campaigns.application.queries.get_campaigns import GetCampaigns
from app.modules.campaigns.application.read_models.campaign import (
    CampaignDetailResponse,
    CampaignSummary,
)
from app.modules.campaigns.domain.arc import NewArc
from app.modules.campaigns.domain.faction import Faction
from app.modules.campaigns.domain.npc import NPC
from app.shared.dependencies import get_current_user
from app.shared.security import AuthContext, get_auth_context

router = APIRouter(prefix="/campaigns", tags=["campaigns"])


def _to_create_campaign_command(
    payload: CreateCampaignRequest,
) -> CreateCampaignCommand:
    """Map the HTTP request DTO into the command's domain-shaped input.

    The api layer owns this translation so neither ``application`` nor
    ``domain`` ever import from ``api`` (ADR-05).
    """
    return CreateCampaignCommand(
        title=payload.title,
        description=payload.description,
        world_state=payload.world_state,
        system=payload.system,
        tone=payload.tone,
        npcs=[
            NPC(
                name=npc.name,
                description=npc.description,
                current_state=npc.current_state,
                motivation=npc.motivation,
                content_source=npc.content_source,
            )
            for npc in payload.npcs
        ],
        factions=[
            Faction(
                name=faction.name,
                description=faction.description,
                current_stance=faction.current_stance,
                goals=faction.goals,
                content_source=faction.content_source,
            )
            for faction in payload.factions
        ],
        arcs=[
            NewArc(
                title=arc.title,
                description=arc.description,
                priority=arc.priority,
                content_source=arc.content_source,
            )
            for arc in payload.arcs
        ],
    )


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
    command = _to_create_campaign_command(payload)
    campaign_id = await run_in_threadpool(handler.execute, ctx.user_id, command)
    return CreateCampaignResponse(id=campaign_id)
