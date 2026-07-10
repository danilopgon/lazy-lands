"""HTTP schemas for next-session generation."""

from app.modules.generation.application.contracts import (
    DirectionInput,
    GenerateSessionResponse,
)


class GenerateSessionRequest(DirectionInput):
    """``POST /campaigns/{id}/generate-session`` request body."""


class GenerateSessionResponseSchema(GenerateSessionResponse):
    """HTTP response schema for generated session creation."""
