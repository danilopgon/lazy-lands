"""Campaign HTTP response DTOs."""

from pydantic import BaseModel, Field

from app.modules.campaigns.api.schemas.arc.responses import ArcResponse
from app.modules.campaigns.api.schemas.faction.responses import FactionResponse
from app.modules.campaigns.api.schemas.npc.responses import NpcResponse


class CreateCampaignResponse(BaseModel):
    """``POST /campaigns`` success response body."""

    id: str


class CampaignSummary(BaseModel):
    """Campaign summary returned by ``GET /campaigns``."""

    id: str
    title: str
    description: str | None = None
    updated_at: str | None = None
    system: str | None = None
    tone: str | None = None
    npc_count: int = 0
    faction_count: int = 0
    arc_count: int = 0


class CampaignDetailResponse(BaseModel):
    """Campaign detail returned by ``GET /campaigns/{id}``."""

    id: str
    title: str
    description: str | None = None
    world_state: str | None = None
    system: str | None = None
    tone: str | None = None
    updated_at: str | None = None
    npcs: list[NpcResponse] = Field(default_factory=list)
    factions: list[FactionResponse] = Field(default_factory=list)
    arcs: list[ArcResponse] = Field(default_factory=list)
