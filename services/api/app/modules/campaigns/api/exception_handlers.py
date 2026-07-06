"""FastAPI exception handlers for campaign application errors.

Colocated in the ``campaigns`` module's ``api`` layer (not ``shared/errors.py``)
— these handlers are module-specific, and ``shared/`` must not import from
``modules/*`` (ADR-05 rule 3: the dependency direction is module -> shared,
never the reverse). The exception *classes* they map live in
``application/errors.py``; HTTP mapping is a presentation concern and stays
here, in ``api``.
"""

import logging

from fastapi import Request
from fastapi.responses import JSONResponse

from app.modules.campaigns.application.errors import (
    CampaignNotFoundError,
    CampaignPersistenceError,
    CampaignValidationError,
)

logger = logging.getLogger(__name__)


async def campaign_not_found_error_handler(
    _request: Request, _exc: CampaignNotFoundError
) -> JSONResponse:
    """Map RLS misses and unknown ids to a uniform 404."""
    return JSONResponse(status_code=404, content={"error": "Not found."})


async def campaign_validation_error_handler(
    _request: Request, _exc: CampaignValidationError
) -> JSONResponse:
    """Map an empty PATCH (nothing to change) to 422."""
    return JSONResponse(
        status_code=422, content={"error": "Provide at least one field to update."}
    )


async def campaign_persistence_error_handler(
    _request: Request, exc: CampaignPersistenceError
) -> JSONResponse:
    """Map a CampaignPersistenceError to a retryable 409 (CP-005).

    Surfaces ``orphaned_campaign_id`` when the compensating delete itself
    failed, so it can be manually cleaned up; logs the failure per docs/05.
    """
    body: dict[str, object] = {
        "error": "Could not save the campaign. Please retry.",
        "retryable": exc.retryable,
    }
    if exc.orphaned_campaign_id is not None:
        body["orphaned_campaign_id"] = exc.orphaned_campaign_id
        logger.error(
            "Compensating delete failed for campaign_id=%s", exc.orphaned_campaign_id
        )
    return JSONResponse(status_code=409, content=body)
