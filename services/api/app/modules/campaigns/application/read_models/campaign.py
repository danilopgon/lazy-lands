"""Campaign read models returned by campaign queries."""

from pydantic import BaseModel, Field

from app.modules.campaigns.application.read_models.arc import ArcResponse
from app.modules.campaigns.application.read_models.faction import FactionResponse
from app.modules.campaigns.application.read_models.npc import NpcResponse


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
    session_count: int = 0
    memory_count: int = 0


class CampaignMutationResponse(BaseModel):
    """Campaign returned by ``PATCH /campaigns/{id}`` — the affected row, no children.

    Lets the frontend reconcile world_state/system/tone in place after an edit.
    """

    id: str
    title: str
    description: str | None = None
    world_state: str | None = None
    system: str | None = None
    tone: str | None = None
    updated_at: str | None = None


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
