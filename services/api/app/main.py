"""FastAPI application entry point — middleware, error handlers, and router wiring."""

import logging

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.modules.campaigns.api import routes as campaigns
from app.modules.campaigns.api.exception_handlers import (
    campaign_not_found_error_handler,
    campaign_persistence_error_handler,
    campaign_validation_error_handler,
)
from app.modules.campaigns.application.errors import (
    CampaignNotFoundError,
    CampaignPersistenceError,
    CampaignValidationError,
)
from app.modules.generation.api import routes as generation
from app.modules.generation.api.exception_handlers import (
    generation_not_found_error_handler,
    generation_persistence_error_handler,
)
from app.modules.generation.application.errors import (
    GenerationNotFoundError,
    GenerationPersistenceError,
)
from app.modules.health import routes as health
from app.modules.memory.api import routes as memory
from app.modules.memory.api.exception_handlers import (
    campaign_not_found_error_handler as memory_campaign_not_found_error_handler,
)
from app.modules.memory.api.exception_handlers import (
    memory_fact_not_found_error_handler,
    memory_fact_persistence_error_handler,
    memory_fact_validation_error_handler,
)
from app.modules.memory.application.errors import (
    CampaignNotFoundError as MemoryCampaignNotFoundError,
)
from app.modules.memory.application.errors import (
    MemoryFactNotFoundError,
    MemoryFactPersistenceError,
    MemoryFactValidationError,
)
from app.modules.sessions.api import routes as sessions
from app.modules.sessions.api.exception_handlers import (
    session_not_found_error_handler,
    session_persistence_error_handler,
    session_validation_error_handler,
)
from app.modules.sessions.application.errors import (
    SessionNotFoundError,
    SessionPersistenceError,
    SessionValidationError,
)
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
app.add_exception_handler(
    CampaignValidationError,
    campaign_validation_error_handler,  # type: ignore[arg-type]
)
app.add_exception_handler(
    SessionNotFoundError,
    session_not_found_error_handler,  # type: ignore[arg-type]
)
app.add_exception_handler(
    SessionPersistenceError,
    session_persistence_error_handler,  # type: ignore[arg-type]
)
app.add_exception_handler(
    SessionValidationError,
    session_validation_error_handler,  # type: ignore[arg-type]
)
app.add_exception_handler(
    GenerationNotFoundError,
    generation_not_found_error_handler,  # type: ignore[arg-type]
)
app.add_exception_handler(
    GenerationPersistenceError,
    generation_persistence_error_handler,  # type: ignore[arg-type]
)
app.add_exception_handler(
    MemoryCampaignNotFoundError,
    memory_campaign_not_found_error_handler,  # type: ignore[arg-type]
)
app.add_exception_handler(
    MemoryFactNotFoundError,
    memory_fact_not_found_error_handler,  # type: ignore[arg-type]
)
app.add_exception_handler(
    MemoryFactPersistenceError,
    memory_fact_persistence_error_handler,  # type: ignore[arg-type]
)
app.add_exception_handler(
    MemoryFactValidationError,
    memory_fact_validation_error_handler,  # type: ignore[arg-type]
)


def _error_cors_headers(request: Request) -> dict[str, str]:
    """Build CORS headers for an error response by reflecting an allowed Origin.

    Starlette runs the catch-all handler below in ServerErrorMiddleware, the
    outermost layer, so its response never passes back through CORSMiddleware.
    Without these headers a browser reports an opaque CORS failure that hides the
    real 500 and its body. Mirrors CORSMiddleware's own allow-list + credentials.
    """
    origin = request.headers.get("origin")
    if origin and origin in settings.api_cors_origins:
        return {
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Credentials": "true",
            "Vary": "Origin",
        }
    return {}


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Catch-all handler that logs the traceback so silent 500s never happen again."""
    logger.exception("Unhandled exception in request: %s", exc)
    return JSONResponse(
        status_code=500,
        content={"error": "Internal server error — check server logs for details."},
        headers=_error_cors_headers(request),
    )


app.include_router(health.router)
app.include_router(campaigns.router)
app.include_router(campaigns.npcs_router)
app.include_router(campaigns.factions_router)
app.include_router(campaigns.arcs_router)
app.include_router(memory.router)
app.include_router(sessions.router)
app.include_router(sessions.detail_router)
app.include_router(generation.router)
