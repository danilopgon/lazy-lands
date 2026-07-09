"""FastAPI exception handlers for memory application errors."""

from fastapi import Request
from fastapi.responses import JSONResponse

from app.modules.memory.application.errors import (
    CampaignNotFoundError,
    MemoryFactNotFoundError,
    MemoryFactPersistenceError,
    MemoryFactValidationError,
)


async def campaign_not_found_error_handler(
    _request: Request, _exc: CampaignNotFoundError
) -> JSONResponse:
    """Map unknown or non-owned campaigns to an accurate 404."""
    return JSONResponse(status_code=404, content={"error": "Campaign not found."})


async def memory_fact_not_found_error_handler(
    _request: Request, _exc: MemoryFactNotFoundError
) -> JSONResponse:
    """Map RLS misses and unknown ids to a uniform 404."""
    return JSONResponse(status_code=404, content={"error": "Memory fact not found."})


async def memory_fact_persistence_error_handler(
    _request: Request, exc: MemoryFactPersistenceError
) -> JSONResponse:
    """Map failed memory writes to retryable conflict responses."""
    message = (
        "Could not save the memory. Please retry."
        if exc.retryable
        else "Could not save the memory."
    )
    return JSONResponse(
        status_code=409, content={"error": message, "retryable": exc.retryable}
    )


async def memory_fact_validation_error_handler(
    _request: Request, exc: MemoryFactValidationError
) -> JSONResponse:
    """Map application-level validation misses to 422."""
    return JSONResponse(status_code=422, content={"error": exc.message})
