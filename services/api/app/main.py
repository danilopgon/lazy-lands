"""FastAPI application entry point — middleware, error handlers, and router wiring."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.modules.campaigns import routes as campaigns
from app.modules.campaigns.errors import (
    CampaignPersistenceError,
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
app.include_router(health.router)
app.include_router(campaigns.router)
