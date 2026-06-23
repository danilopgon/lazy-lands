from app.core.config import Settings


def test_settings_load_required_environment(monkeypatch) -> None:
    monkeypatch.setenv("APP_ENV", "test")
    monkeypatch.setenv("SUPABASE_URL", "http://test")
    monkeypatch.setenv("SUPABASE_ANON_KEY", "test-key")

    settings = Settings()

    assert settings.app_env == "test"
    assert str(settings.supabase_url) == "http://test/"
    assert settings.supabase_anon_key == "test-key"
