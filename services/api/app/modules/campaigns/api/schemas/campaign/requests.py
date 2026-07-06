"""Campaign HTTP request DTOs."""

from pydantic import BaseModel, Field

from app.modules.campaigns.api.schemas.arc.requests import CreateArcRequest
from app.modules.campaigns.api.schemas.faction.requests import CreateFactionRequest
from app.modules.campaigns.api.schemas.npc.requests import CreateNpcRequest


class ExtractRequest(BaseModel):
    """``POST /campaigns/extract`` request body — the backend trust boundary."""

    raw_text: str = Field(min_length=100, max_length=8000)


class CreateCampaignRequest(BaseModel):
    """``POST /campaigns`` request body — the DM-reviewed payload."""

    title: str = Field(min_length=1, max_length=200)
    description: str = Field(min_length=1, max_length=4000)
    world_state: str = Field(min_length=1, max_length=4000)
    system: str = Field(min_length=1, max_length=200)
    tone: str | None = Field(default=None, max_length=200)
    npcs: list[CreateNpcRequest] = Field(default_factory=list, max_length=100)
    factions: list[CreateFactionRequest] = Field(default_factory=list, max_length=100)
    arcs: list[CreateArcRequest] = Field(default_factory=list, max_length=100)
