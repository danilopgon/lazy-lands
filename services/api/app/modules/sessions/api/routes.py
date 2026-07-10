"""HTTP routes for the sessions module: register + read session history.

Nested under ``/campaigns/{campaign_id}/sessions`` (sessions are always
scoped to their owning campaign).
"""

from typing import Annotated

from fastapi import APIRouter, Depends
from starlette.concurrency import run_in_threadpool

from app.modules.sessions.api.dependencies import (
    provide_get_session,
    provide_get_sessions,
    provide_register_session,
    provide_update_session,
)
from app.modules.sessions.api.schemas.session.requests import (
    RegisterSessionRequest,
    UpdateSessionRequest,
)
from app.modules.sessions.application.commands.register_session import (
    RegisterSession,
    RegisterSessionCommand,
)
from app.modules.sessions.application.commands.update_session import (
    UpdateSessionCommand,
    UpdateSessionUseCase,
)
from app.modules.sessions.application.contracts import RegisterSessionResponse
from app.modules.sessions.application.queries.get_session import GetSessionUseCase
from app.modules.sessions.application.queries.get_sessions import GetSessions
from app.modules.sessions.application.read_models.session import SessionResponse
from app.modules.sessions.application.read_models.session_detail import (
    SessionDetailResponse,
)
from app.shared.security import get_current_user

router = APIRouter(prefix="/campaigns/{campaign_id}/sessions", tags=["sessions"])
detail_router = APIRouter(prefix="/sessions", tags=["sessions"])


@router.post("", response_model=RegisterSessionResponse)
async def register_session(
    campaign_id: str,
    payload: RegisterSessionRequest,
    _user_id: Annotated[str, Depends(get_current_user)],
    handler: Annotated[RegisterSession, Depends(provide_register_session)],
) -> RegisterSessionResponse:
    """Register a session; summarize and suggest memories, persistence-first."""
    command = RegisterSessionCommand(
        summary=payload.summary, consequences=payload.consequences
    )
    return await handler.execute(campaign_id, command)


@router.get("", response_model=list[SessionResponse])
async def list_sessions(
    campaign_id: str,
    _user_id: Annotated[str, Depends(get_current_user)],
    handler: Annotated[GetSessions, Depends(provide_get_sessions)],
) -> list[SessionResponse]:
    """Return a campaign's sessions, chronologically ascending."""
    return await run_in_threadpool(handler.execute, campaign_id)


@detail_router.get("/{session_id}", response_model=SessionDetailResponse)
async def get_session(
    session_id: str,
    _user_id: Annotated[str, Depends(get_current_user)],
    handler: Annotated[GetSessionUseCase, Depends(provide_get_session)],
) -> SessionDetailResponse:
    """Return one caller-owned session with generated content and trace JSON."""
    return await run_in_threadpool(handler.execute, session_id)


@detail_router.patch("/{session_id}", response_model=SessionDetailResponse)
async def update_session(
    session_id: str,
    payload: UpdateSessionRequest,
    _user_id: Annotated[str, Depends(get_current_user)],
    handler: Annotated[UpdateSessionUseCase, Depends(provide_update_session)],
) -> SessionDetailResponse:
    """Patch generated content, summary, or consequences for one session."""
    command = UpdateSessionCommand(
        **payload.model_dump(exclude_unset=True, mode="json"),
        provided_fields=set(payload.model_fields_set),
    )
    return await run_in_threadpool(handler.execute, session_id, command)
