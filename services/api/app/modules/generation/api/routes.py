"""HTTP routes for next-session generation."""

from typing import Annotated

from fastapi import APIRouter, Depends

from app.modules.generation.api.dependencies import provide_generate_next_session
from app.modules.generation.api.schemas import (
    GenerateSessionRequest,
    GenerateSessionResponseSchema,
)
from app.modules.generation.application.generate_session import (
    GenerateNextSessionUseCase,
)
from app.shared.generation_rate_limit import enforce_generation_rate_limit
from app.shared.security import get_current_user

router = APIRouter(prefix="/campaigns/{campaign_id}", tags=["generation"])


@router.post("/generate-session", response_model=GenerateSessionResponseSchema)
async def generate_session(
    campaign_id: str,
    payload: GenerateSessionRequest,
    _user_id: Annotated[str, Depends(get_current_user)],
    _rate_limit: Annotated[None, Depends(enforce_generation_rate_limit)],
    handler: Annotated[
        GenerateNextSessionUseCase, Depends(provide_generate_next_session)
    ],
) -> GenerateSessionResponseSchema:
    """Generate and persist a next-session proposal for a caller-owned campaign."""
    result = await handler.execute(campaign_id, payload.to_direction())
    return GenerateSessionResponseSchema(**result.model_dump(mode="json"))
