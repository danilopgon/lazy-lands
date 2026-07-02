from app.shared.config import Settings


def test_settings_load_required_environment(monkeypatch) -> None:
    monkeypatch.setenv("APP_ENV", "test")
    monkeypatch.setenv("SUPABASE_URL", "http://test")
    monkeypatch.setenv("SUPABASE_PUBLISHABLE_KEY", "test-key")

    settings = Settings()

    assert settings.app_env == "test"
    assert str(settings.supabase_url) == "http://test/"
    assert settings.supabase_publishable_key == "test-key"


def test_api_cors_origins_default() -> None:
    settings = Settings()
    assert settings.api_cors_origins == ["http://localhost:3000"]


def test_api_cors_origins_single_origin(monkeypatch) -> None:
    monkeypatch.setenv("API_CORS_ORIGINS", "https://lazy-lands.com")
    settings = Settings()
    assert settings.api_cors_origins == ["https://lazy-lands.com"]


def test_api_cors_origins_comma_separated(monkeypatch) -> None:
    monkeypatch.setenv(
        "API_CORS_ORIGINS", "https://lazy-lands.com,https://scribe.lazy-lands.com"
    )
    settings = Settings()
    assert settings.api_cors_origins == [
        "https://lazy-lands.com",
        "https://scribe.lazy-lands.com",
    ]


def test_api_cors_origins_json_array(monkeypatch) -> None:
    monkeypatch.setenv("API_CORS_ORIGINS", '["http://localhost:3000"]')
    settings = Settings()
    assert settings.api_cors_origins == ["http://localhost:3000"]


def test_api_cors_origins_json_array_multiple(monkeypatch) -> None:
    monkeypatch.setenv(
        "API_CORS_ORIGINS",
        '["https://lazy-lands.com","https://scribe.lazy-lands.com"]',
    )
    settings = Settings()
    assert settings.api_cors_origins == [
        "https://lazy-lands.com",
        "https://scribe.lazy-lands.com",
    ]
