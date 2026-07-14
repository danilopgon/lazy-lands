"""Base exception hierarchy and global FastAPI error handlers."""

import logging

from fastapi import Request
from fastapi.responses import JSONResponse

from app.shared.generation_rate_limit import GenerationRateLimitError
from app.shared.llm.errors import LlmOutputValidationError, ProviderRateLimitError

logger = logging.getLogger(__name__)


class AppError(Exception):
    """Base application exception for expected domain/application failures."""


async def generation_rate_limit_error_handler(
    _request: Request, _exc: GenerationRateLimitError
) -> JSONResponse:
    """Return a clear, retryable response for local generation throttling."""
    return JSONResponse(
        status_code=429,
        content={
            "error": "Too many generation requests. Please try again shortly.",
            "retryable": True,
        },
    )


async def http_error_handler(_request: Request, exc: Exception) -> JSONResponse:
    """Convert an AppError into a 400 JSON response."""
    _ = exc
    return JSONResponse(
        status_code=400,
        content={"error": "The request could not be completed."},
    )


async def llm_output_validation_error_handler(
    _request: Request, exc: LlmOutputValidationError
) -> JSONResponse:
    """Map an LlmOutputValidationError to a retryable 422 without leaking raw output.

    The raw LLM output and rendered prompt stay server-side only (logged for
    trace metadata per docs/05); the response body carries only a generic,
    retryable message (CE-005, design Decision 6).
    """
    logger.warning(
        "LLM output validation failed schema=%s retryable=%s",
        exc.schema_name,
        exc.retryable,
    )
    return JSONResponse(
        status_code=422,
        content={
            "error": "The Scribe's proposal could not be parsed. Please try again.",
            "retryable": exc.retryable,
        },
    )


async def provider_rate_limit_error_handler(
    _request: Request, _exc: ProviderRateLimitError
) -> JSONResponse:
    """Map upstream quota errors without exposing provider details or traces."""
    return JSONResponse(
        status_code=429,
        content={
            "error": "The Scribe is busy. Please try again shortly.",
            "retryable": True,
        },
    )
