from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.health import routes as health
from app.shared.config import settings
from app.shared.errors import AppError, http_error_handler

app = FastAPI(title="lazy-lands-api")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.api_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_exception_handler(AppError, http_error_handler)
app.include_router(health.router)
