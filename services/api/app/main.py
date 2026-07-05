"""FastAPI application entry point — middleware, error handlers, and router wiring."""

import logging

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.modules.campaigns.api import routes as campaigns
from app.modules.campaigns.errors import (
    CampaignNotFoundError,
    CampaignPersistenceError,
    campaign_not_found_error_handler,
    campaign_persistence_error_handler,
)
from app.modules.health import routes as health
from app.shared.config import settings
from app.shared.errors import (
    AppError,
    http_error_handler,
    llm_output_validation_error_handler,
)
from app.shared.llm.errors import LlmOutputValidationError

logger = logging.getLogger(__name__)

app = FastAPI(title="lazy-lands-api")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.api_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_exception_handler(AppError, http_error_handler)
# Starlette's add_exception_handler signature is typed against the generic
# Exception handler shape; these handlers narrow to their specific exception
# type for clarity (mirrors FastAPI's own documented pattern).
app.add_exception_handler(
    LlmOutputValidationError,
    llm_output_validation_error_handler,  # type: ignore[arg-type]
)
app.add_exception_handler(
    CampaignPersistenceError,
    campaign_persistence_error_handler,  # type: ignore[arg-type]
)
app.add_exception_handler(
    CampaignNotFoundError,
    campaign_not_found_error_handler,  # type: ignore[arg-type]
)


@app.exception_handler(Exception)
async def unhandled_exception_handler(
    _request: Request, exc: Exception
) -> JSONResponse:
    """Catch-all handler that logs the traceback so silent 500s never happen again."""
    logger.exception("Unhandled exception in request: %s", exc)
    return JSONResponse(
        status_code=500,
        content={"error": "Internal server error — check server logs for details."},
    )


app.include_router(health.router)
app.include_router(campaigns.router)
