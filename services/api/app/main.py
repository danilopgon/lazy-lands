"""FastAPI application entry point — middleware, error handlers, and router wiring."""

import traceback
from pathlib import Path
from uuid import uuid4

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
    export_selection_error_handler,
    non_exportable_session_error_handler,
    session_already_registered_error_handler,
    session_not_found_error_handler,
    session_persistence_error_handler,
    session_validation_error_handler,
)
from app.modules.sessions.application.errors import (
    ExportSelectionError,
    NonExportableSessionError,
    SessionAlreadyRegisteredError,
    SessionNotFoundError,
    SessionPersistenceError,
    SessionValidationError,
)
from app.shared.config import settings
from app.shared.errors import (
    AppError,
    generation_rate_limit_error_handler,
    http_error_handler,
    llm_output_validation_error_handler,
    provider_rate_limit_error_handler,
)
from app.shared.generation_rate_limit import GenerationRateLimitError
from app.shared.llm.errors import LlmOutputValidationError, ProviderRateLimitError
from app.shared.logging import get_logger

logger = get_logger(__name__)

app = FastAPI(
    title="lazy-lands-api",
    docs_url=None,
    redoc_url=None,
    openapi_url=None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.api_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

_API_SECURITY_HEADERS = {
    "Content-Security-Policy": (
        "default-src 'none'; base-uri 'none'; form-action 'none'; "
        "frame-ancestors 'none'; object-src 'none'"
    ),
    "X-Frame-Options": "DENY",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), geolocation=(), microphone=()",
}


def _set_security_headers(response: JSONResponse, request_id: str) -> None:
    """Attach browser protections and the server-generated correlation ID."""
    response.headers.update(_API_SECURITY_HEADERS)
    response.headers["X-Request-ID"] = request_id


@app.middleware("http")
async def add_request_context(request: Request, call_next):  # type: ignore[no-untyped-def]
    """Generate a request ID without reflecting potentially untrusted input."""
    request_id = uuid4().hex
    request.state.request_id = request_id
    response = await call_next(request)
    _set_security_headers(response, request_id)
    logger.info(
        "Request complete request_id=%s method=%s path=%s status_code=%d",
        request_id,
        request.method,
        request.url.path.replace("\r", "").replace("\n", ""),
        response.status_code,
    )
    return response


app.add_exception_handler(AppError, http_error_handler)
app.add_exception_handler(
    GenerationRateLimitError,
    generation_rate_limit_error_handler,  # type: ignore[arg-type]
)
app.add_exception_handler(
    ProviderRateLimitError,
    provider_rate_limit_error_handler,  # type: ignore[arg-type]
)
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
    SessionAlreadyRegisteredError,
    session_already_registered_error_handler,  # type: ignore[arg-type]
)
app.add_exception_handler(
    ExportSelectionError,
    export_selection_error_handler,  # type: ignore[arg-type]
)
app.add_exception_handler(
    NonExportableSessionError,
    non_exportable_session_error_handler,  # type: ignore[arg-type]
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


def _exception_location(exc: Exception) -> str:
    """Return the source location without rendering sensitive exception details."""
    frames = traceback.extract_tb(exc.__traceback__)
    if not frames:
        return "unknown"
    frame = frames[-1]
    return f"{Path(frame.filename).name}:{frame.lineno}:{frame.name}"


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Return a generic 500 and retain safe diagnostics for triage."""
    request_id = getattr(request.state, "request_id", uuid4().hex)
    logger.error(
        "Unhandled request error request_id=%s exception_type=%s exception_location=%s",
        request_id,
        type(exc).__name__,
        _exception_location(exc),
    )
    response = JSONResponse(
        status_code=500,
        content={"error": "Internal server error."},
        headers=_error_cors_headers(request),
    )
    _set_security_headers(response, request_id)
    return response


app.include_router(health.router)
app.include_router(campaigns.router)
app.include_router(campaigns.npcs_router)
app.include_router(campaigns.factions_router)
app.include_router(campaigns.arcs_router)
app.include_router(memory.router)
app.include_router(sessions.router)
app.include_router(sessions.detail_router)
app.include_router(generation.router)
