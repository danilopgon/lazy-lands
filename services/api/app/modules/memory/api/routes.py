"""HTTP routes for MemoryFact create/list/update."""

from typing import Annotated

from fastapi import APIRouter, Depends, Query
from starlette.concurrency import run_in_threadpool

from app.modules.memory.api.dependencies import (
    provide_create_memory_fact,
    provide_list_memory_facts,
    provide_update_memory_fact,
)
from app.modules.memory.api.schemas.requests import (
    CreateMemoryFactRequest,
    UpdateMemoryFactRequest,
)
from app.modules.memory.application.commands.create_memory_fact import (
    CreateMemoryFact,
    CreateMemoryFactCommand,
)
from app.modules.memory.application.commands.update_memory_fact import (
    UpdateMemoryFact,
    UpdateMemoryFactCommand,
)
from app.modules.memory.application.queries.list_memory_facts import ListMemoryFacts
from app.modules.memory.application.read_models.memory_fact import MemoryFactResponse
from app.modules.memory.domain.enums import MemoryStatus
from app.shared.security import get_current_user

router = APIRouter(tags=["memory"])


@router.post(
    "/campaigns/{campaign_id}/memory-facts",
    response_model=MemoryFactResponse,
    status_code=201,
)
async def create_memory_fact(
    campaign_id: str,
    payload: CreateMemoryFactRequest,
    _user_id: Annotated[str, Depends(get_current_user)],
    handler: Annotated[CreateMemoryFact, Depends(provide_create_memory_fact)],
) -> MemoryFactResponse:
    """Persist a DM-accepted or edited Scribe suggestion as active memory."""
    command = CreateMemoryFactCommand(
        source_session_id=payload.source_session_id,
        content=payload.content,
        type=payload.type,
        importance=payload.importance.value if payload.importance else None,
    )
    return await run_in_threadpool(handler.execute, campaign_id, command)


@router.get(
    "/campaigns/{campaign_id}/memory-facts", response_model=list[MemoryFactResponse]
)
async def list_memory_facts(
    campaign_id: str,
    _user_id: Annotated[str, Depends(get_current_user)],
    handler: Annotated[ListMemoryFacts, Depends(provide_list_memory_facts)],
    status: Annotated[MemoryStatus | None, Query()] = None,
) -> list[MemoryFactResponse]:
    """Return campaign memory facts, optionally filtered to active facts."""
    status_value = status.value if status else None
    return await run_in_threadpool(handler.execute, campaign_id, status_value)


@router.patch("/memory-facts/{memory_fact_id}", response_model=MemoryFactResponse)
async def update_memory_fact(
    memory_fact_id: str,
    payload: UpdateMemoryFactRequest,
    _user_id: Annotated[str, Depends(get_current_user)],
    handler: Annotated[UpdateMemoryFact, Depends(provide_update_memory_fact)],
) -> MemoryFactResponse:
    """Patch memory content or retire via ``status=archived``."""
    changes = payload.model_dump(exclude_unset=True, mode="json")
    command = UpdateMemoryFactCommand(changes=changes)
    return await run_in_threadpool(handler.execute, memory_fact_id, command)
