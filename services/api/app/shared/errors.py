"""Base exception hierarchy and global FastAPI error handlers."""

from fastapi import Request
from fastapi.responses import JSONResponse


class AppError(Exception):
    """Base application exception for expected domain/application failures."""


async def http_error_handler(_request: Request, exc: Exception) -> JSONResponse:
    """Convert an AppError into a 400 JSON response."""
    return JSONResponse(status_code=400, content={"error": str(exc)})
