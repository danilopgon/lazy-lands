"""HTTP exception handlers for the generation module."""

from fastapi import Request
from fastapi.responses import JSONResponse

from app.modules.generation.application.errors import (
    GenerationNotFoundError,
    GenerationPersistenceError,
)


async def generation_not_found_error_handler(
    _request: Request, _exc: GenerationNotFoundError
) -> JSONResponse:
    """Map campaign RLS misses to the standard uniform 404."""
    return JSONResponse(status_code=404, content={"error": "Not found."})


async def generation_persistence_error_handler(
    _request: Request, exc: GenerationPersistenceError
) -> JSONResponse:
    """Map failed generated-session inserts to a retryable conflict."""
    return JSONResponse(
        status_code=409,
        content={
            "error": "Could not save the generated session. Please retry.",
            "retryable": exc.retryable,
        },
    )
