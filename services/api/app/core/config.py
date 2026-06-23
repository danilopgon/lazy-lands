from pydantic import AnyHttpUrl, Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_env: str = "development"
    api_cors_origins: list[str] = Field(
        default_factory=lambda: ["http://localhost:3000"]
    )
    supabase_url: AnyHttpUrl
    supabase_anon_key: str
    supabase_service_role_key: str = ""
    supabase_jwt_secret: str = ""
    llm_provider: str = "fake"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    @field_validator("api_cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, value: str | list[str]) -> list[str]:
        if isinstance(value, str):
            return [origin.strip() for origin in value.split(",") if origin.strip()]
        return value


settings = Settings()  # type: ignore[call-arg]
