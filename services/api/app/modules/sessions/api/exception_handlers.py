"""FastAPI exception handlers for session application errors.

Colocated in the ``sessions`` module's ``api`` layer, matching the campaigns
module's convention (module-specific HTTP mapping stays in ``api``, never in
``shared/``).
"""

from fastapi import Request
from fastapi.responses import JSONResponse

from app.modules.sessions.application.errors import (
    ExportSelectionError,
    NonExportableSessionError,
    SessionAlreadyRegisteredError,
    SessionNotFoundError,
    SessionNotPlayedError,
    SessionPersistenceError,
    SessionValidationError,
)


async def session_not_found_error_handler(
    _request: Request, _exc: SessionNotFoundError
) -> JSONResponse:
    """Map RLS misses and unknown campaign ids to a uniform 404."""
    return JSONResponse(status_code=404, content={"error": "Not found."})


async def session_validation_error_handler(
    _request: Request, _exc: SessionValidationError
) -> JSONResponse:
    """Map a direct application-command contract violation to 422."""
    return JSONResponse(
        status_code=422, content={"error": "The Scribe could not do that."}
    )


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


async def session_already_registered_error_handler(
    _request: Request, _exc: SessionAlreadyRegisteredError
) -> JSONResponse:
    """Map a repeat completion of an already-registered session to 409.

    Non-retryable, unlike ``SessionPersistenceError``'s 409: the played
    outcome is already recorded, so replaying the request can never succeed.
    """
    return JSONResponse(
        status_code=409,
        content={
            "error": "This session is already recorded.",
            "retryable": False,
        },
    )


async def session_not_played_error_handler(
    _request: Request, _exc: SessionNotPlayedError
) -> JSONResponse:
    """Map a recovery attempt on an unplayed session to 409.

    Non-retryable, like ``SessionAlreadyRegisteredError``'s 409: the session
    holds a plan rather than a played account, so replaying the request can
    never succeed until the DM completes it.
    """
    return JSONResponse(
        status_code=409,
        content={
            "error": "This session has not been played yet.",
            "retryable": False,
        },
    )


async def export_selection_error_handler(
    _request: Request, _exc: ExportSelectionError
) -> JSONResponse:
    """Map invalid persisted section selections to an unrendered 422."""
    return JSONResponse(
        status_code=422,
        content={"error": "Select one or more unique saved sections."},
    )


async def non_exportable_session_error_handler(
    _request: Request, _exc: NonExportableSessionError
) -> JSONResponse:
    """Map a missing or invalid saved draft to an unrendered 409."""
    return JSONResponse(
        status_code=409,
        content={"error": "This saved session draft cannot be exported."},
    )
