"""HTTP routes for the campaigns module: extract, create, read, and full CRUD.

Four routers: the campaigns router plus flat npcs/factions/arcs routers (their
entities are campaign-owned; ownership is enforced by RLS + the create
pre-check, design 6.4). All register in ``app/main.py``.
"""

from typing import Annotated

from fastapi import APIRouter, Depends
from starlette.concurrency import run_in_threadpool

from app.modules.campaigns.api.dependencies import (
    provide_create_arc,
    provide_create_campaign,
    provide_create_faction,
    provide_create_npc,
    provide_delete_arc,
    provide_delete_faction,
    provide_delete_npc,
    provide_extract_campaign,
    provide_get_campaign_detail,
    provide_get_campaigns,
    provide_update_arc,
    provide_update_campaign,
    provide_update_faction,
    provide_update_npc,
)
from app.modules.campaigns.api.schemas.arc.requests import (
    CreateArcInput,
    UpdateArcRequest,
)
from app.modules.campaigns.api.schemas.campaign.requests import (
    CreateCampaignRequest,
    ExtractRequest,
    UpdateCampaignRequest,
)
from app.modules.campaigns.api.schemas.campaign.responses import CreateCampaignResponse
from app.modules.campaigns.api.schemas.faction.requests import (
    CreateFactionInput,
    UpdateFactionRequest,
)
from app.modules.campaigns.api.schemas.npc.requests import (
    CreateNpcInput,
    UpdateNpcRequest,
)
from app.modules.campaigns.application.commands.create_arc import CreateArc
from app.modules.campaigns.application.commands.create_campaign import (
    CreateCampaign,
    CreateCampaignCommand,
)
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
from app.modules.campaigns.application.contracts import ExtractCampaignOutput
from app.modules.campaigns.application.queries.get_campaign_detail import (
    GetCampaignDetail,
)
from app.modules.campaigns.application.queries.get_campaigns import GetCampaigns
from app.modules.campaigns.application.read_models.arc import ArcResponse
from app.modules.campaigns.application.read_models.campaign import (
    CampaignDetailResponse,
    CampaignMutationResponse,
    CampaignSummary,
)
from app.modules.campaigns.application.read_models.faction import FactionResponse
from app.modules.campaigns.application.read_models.npc import NpcResponse
from app.modules.campaigns.domain.arc import NewArc
from app.modules.campaigns.domain.faction import Faction
from app.modules.campaigns.domain.npc import NPC
from app.shared.dependencies import get_current_user
from app.shared.security import AuthContext, get_auth_context

router = APIRouter(prefix="/campaigns", tags=["campaigns"])
npcs_router = APIRouter(prefix="/npcs", tags=["npcs"])
factions_router = APIRouter(prefix="/factions", tags=["factions"])
arcs_router = APIRouter(prefix="/arcs", tags=["arcs"])


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


@router.patch("/{campaign_id}", response_model=CampaignMutationResponse)
async def update_campaign(
    campaign_id: str,
    payload: UpdateCampaignRequest,
    handler: Annotated[UpdateCampaign, Depends(provide_update_campaign)],
) -> CampaignMutationResponse:
    """Patch world_state/system/tone on a caller-owned campaign."""
    changes = payload.model_dump(exclude_unset=True, exclude_none=True, mode="json")
    return await run_in_threadpool(handler.execute, campaign_id, changes)


# ── NPCs ─────────────────────────────────────────────────────────────────


@npcs_router.post("", response_model=NpcResponse, status_code=201)
async def create_npc(
    payload: CreateNpcInput,
    handler: Annotated[CreateNpc, Depends(provide_create_npc)],
) -> NpcResponse:
    """Create a DM-authored NPC (content_source forced to `manual`)."""
    fields = payload.model_dump(
        exclude={"campaign_id"}, exclude_none=True, mode="json"
    )
    return await run_in_threadpool(handler.execute, payload.campaign_id, fields)


@npcs_router.patch("/{npc_id}", response_model=NpcResponse)
async def update_npc(
    npc_id: str,
    payload: UpdateNpcRequest,
    handler: Annotated[UpdateNpc, Depends(provide_update_npc)],
) -> NpcResponse:
    """Patch a caller-owned NPC."""
    changes = payload.model_dump(exclude_unset=True, exclude_none=True, mode="json")
    return await run_in_threadpool(handler.execute, npc_id, changes)


@npcs_router.delete("/{npc_id}", status_code=204)
async def delete_npc(
    npc_id: str,
    handler: Annotated[DeleteNpc, Depends(provide_delete_npc)],
) -> None:
    """Delete a caller-owned NPC (404 on RLS miss)."""
    await run_in_threadpool(handler.execute, npc_id)


# ── Factions ─────────────────────────────────────────────────────────────


@factions_router.post("", response_model=FactionResponse, status_code=201)
async def create_faction(
    payload: CreateFactionInput,
    handler: Annotated[CreateFaction, Depends(provide_create_faction)],
) -> FactionResponse:
    """Create a DM-authored faction (content_source forced to `manual`)."""
    fields = payload.model_dump(
        exclude={"campaign_id"}, exclude_none=True, mode="json"
    )
    return await run_in_threadpool(handler.execute, payload.campaign_id, fields)


@factions_router.patch("/{faction_id}", response_model=FactionResponse)
async def update_faction(
    faction_id: str,
    payload: UpdateFactionRequest,
    handler: Annotated[UpdateFaction, Depends(provide_update_faction)],
) -> FactionResponse:
    """Patch a caller-owned faction."""
    changes = payload.model_dump(exclude_unset=True, exclude_none=True, mode="json")
    return await run_in_threadpool(handler.execute, faction_id, changes)


@factions_router.delete("/{faction_id}", status_code=204)
async def delete_faction(
    faction_id: str,
    handler: Annotated[DeleteFaction, Depends(provide_delete_faction)],
) -> None:
    """Delete a caller-owned faction (404 on RLS miss)."""
    await run_in_threadpool(handler.execute, faction_id)


# ── Arcs ─────────────────────────────────────────────────────────────────


@arcs_router.post("", response_model=ArcResponse, status_code=201)
async def create_arc(
    payload: CreateArcInput,
    handler: Annotated[CreateArc, Depends(provide_create_arc)],
) -> ArcResponse:
    """Create a DM-authored arc (content_source forced to `manual`)."""
    fields = payload.model_dump(
        exclude={"campaign_id"}, exclude_none=True, mode="json"
    )
    return await run_in_threadpool(handler.execute, payload.campaign_id, fields)


@arcs_router.patch("/{arc_id}", response_model=ArcResponse)
async def update_arc(
    arc_id: str,
    payload: UpdateArcRequest,
    handler: Annotated[UpdateArc, Depends(provide_update_arc)],
) -> ArcResponse:
    """Patch a caller-owned arc (status changes flow through here)."""
    changes = payload.model_dump(exclude_unset=True, exclude_none=True, mode="json")
    return await run_in_threadpool(handler.execute, arc_id, changes)


@arcs_router.delete("/{arc_id}", status_code=204)
async def delete_arc(
    arc_id: str,
    handler: Annotated[DeleteArc, Depends(provide_delete_arc)],
) -> None:
    """Delete a caller-owned arc (404 on RLS miss)."""
    await run_in_threadpool(handler.execute, arc_id)
