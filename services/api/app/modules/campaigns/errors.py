"""Campaign-persistence-specific exception and its FastAPI error handler.

Colocated in the ``campaigns`` module (not ``shared/errors.py``) — this
exception is module-specific, and ``shared/`` must not import from
``modules/*`` (ADR-05 rule 3: the dependency direction is module -> shared,
never the reverse).
"""

import logging

from fastapi import Request
from fastapi.responses import JSONResponse

logger = logging.getLogger(__name__)


class CampaignPersistenceError(Exception):
    """Raised when the create-campaign use case cannot fully persist a campaign.

    Attributes:
        retryable: Whether the frontend may retry with the same reviewed
            payload. Always True today (design Decision 5).
        orphaned_campaign_id: Set only when the compensating delete itself
            failed — surfaced so it can be manually cleaned up.
    """

    def __init__(
        self,
        retryable: bool = True,
        orphaned_campaign_id: str | None = None,
    ) -> None:
        """Initialize with retry flag and optional orphaned campaign id."""
        self.retryable = retryable
        self.orphaned_campaign_id = orphaned_campaign_id
        super().__init__("Campaign persistence failed")


class CampaignNotFoundError(Exception):
    """Raised when a targeted resource returns no rows under caller-scoped RLS."""


async def campaign_not_found_error_handler(
    _request: Request, _exc: CampaignNotFoundError
) -> JSONResponse:
    """Map RLS misses and unknown ids to a uniform 404."""
    return JSONResponse(status_code=404, content={"error": "Not found."})


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
