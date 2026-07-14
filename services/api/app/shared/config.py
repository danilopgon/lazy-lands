"""Application settings loaded from environment variables and .env file."""

import json
from typing import Annotated

from pydantic import AnyHttpUrl, Field, field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict


class Settings(BaseSettings):
    """Pydantic settings model — reads from env vars and optional .env file."""

    app_env: str = "development"
    api_cors_origins: Annotated[list[str], NoDecode] = Field(
        default_factory=lambda: ["http://localhost:3000"]
    )
    supabase_url: AnyHttpUrl | None = None
    supabase_publishable_key: str | None = None
    supabase_service_role_key: str = ""
    llm_provider: str = "fake"
    gemini_api_key: str | None = None
    groq_api_key: str | None = None
    mistral_api_key: str | None = None
    cerebras_api_key: str | None = None
    llm_fallbacks: str = ""
    ai_generation_rate_limit: int = Field(default=5, ge=1)
    ai_generation_rate_window_seconds: int = Field(default=60, ge=1)

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    @field_validator("api_cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, value: str | list[str]) -> list[str]:
        """Accept a comma-separated string, JSON array, or a list."""
        if isinstance(value, str):
            stripped = value.strip()
            if stripped.startswith("[") and stripped.endswith("]"):
                try:
                    return json.loads(stripped)
                except json.JSONDecodeError:
                    pass
            return [origin.strip() for origin in value.split(",") if origin.strip()]
        return value


settings = Settings()  # type: ignore[call-arg]
