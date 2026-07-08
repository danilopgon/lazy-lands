"""FastAPI exception handlers for session application errors.

Colocated in the ``sessions`` module's ``api`` layer, matching the campaigns
module's convention (module-specific HTTP mapping stays in ``api``, never in
``shared/``).
"""

from fastapi import Request
from fastapi.responses import JSONResponse

from app.modules.sessions.application.errors import (
    SessionNotFoundError,
    SessionPersistenceError,
)


async def session_not_found_error_handler(
    _request: Request, _exc: SessionNotFoundError
) -> JSONResponse:
    """Map RLS misses and unknown campaign ids to a uniform 404."""
    return JSONResponse(status_code=404, content={"error": "Not found."})


async def session_persistence_error_handler(
    _request: Request, exc: SessionPersistenceError
) -> JSONResponse:
    """Map a failed session insert to a retryable 409.

    Only reached when the insert itself fails (persistence-first ordering) —
    no row was written, so the client may safely retry the same payload.
    """
    message = (
        "Could not save the session. Please retry."
        if exc.retryable
        else "Could not save the session."
    )
    return JSONResponse(
        status_code=409,
        content={"error": message, "retryable": exc.retryable},
    )
