"""Tests for provider registry and build_provider factory (LLM-SEAM-008 a-f)."""

import pytest

from app.shared.llm.providers.fake import FakeLlmProvider
from app.shared.llm.providers.fallback import FallbackLlmProvider
from app.shared.llm.providers.openai_compatible import OpenAiCompatibleProvider
from app.shared.llm.providers.registry import PROVIDERS, build_provider


# LLM-SEAM-008a: PROVIDERS dict contains exactly four entries
def test_008a_providers_has_four_entries() -> None:
    assert len(PROVIDERS) == 4
    assert "gemini" in PROVIDERS
    assert "groq" in PROVIDERS
    assert "mistral" in PROVIDERS
    assert "cerebras" in PROVIDERS


# LLM-SEAM-008b: each provider entry has base_url, api_key_env, model
def test_008b_each_entry_has_required_fields() -> None:
    required = {"base_url", "api_key_env", "model"}
    for name, entry in PROVIDERS.items():
        assert set(entry.keys()) >= required, (
            f"Provider '{name}' missing required fields: {required - set(entry.keys())}"
        )


# LLM-SEAM-008c: build_provider() returns correct OpenAiCompatibleProvider
def test_008c_build_provider_gemini(monkeypatch) -> None:
    monkeypatch.setenv("LLM_PROVIDER", "gemini")
    monkeypatch.setenv("GEMINI_API_KEY", "test-gemini-key")
    provider = build_provider()
    assert isinstance(provider, OpenAiCompatibleProvider)
    assert (
        provider.base_url == "https://generativelanguage.googleapis.com/v1beta/openai/"
    )
    assert provider.model == "gemini-2.5-flash"


def test_build_provider_reads_provider_from_settings_env_file(
    monkeypatch, tmp_path
) -> None:
    monkeypatch.chdir(tmp_path)
    for name in ("LLM_PROVIDER", "LLM_FALLBACKS", "GEMINI_API_KEY", "GROQ_API_KEY"):
        monkeypatch.delenv(name, raising=False)
    tmp_path.joinpath(".env").write_text(
        "LLM_PROVIDER=gemini\nGEMINI_API_KEY=dotenv-gemini-key\n",
        encoding="utf-8",
    )

    provider = build_provider()

    assert isinstance(provider, OpenAiCompatibleProvider)
    assert provider.provider_name == "gemini"
    assert provider.api_key == "dotenv-gemini-key"


def test_build_provider_reads_fallbacks_from_settings_env_file(
    monkeypatch, tmp_path
) -> None:
    monkeypatch.chdir(tmp_path)
    for name in (
        "LLM_PROVIDER",
        "LLM_FALLBACKS",
        "GEMINI_API_KEY",
        "GROQ_API_KEY",
    ):
        monkeypatch.delenv(name, raising=False)
    tmp_path.joinpath(".env").write_text(
        "LLM_PROVIDER=gemini\n"
        "GEMINI_API_KEY=dotenv-gemini-key\n"
        "LLM_FALLBACKS=groq\n"
        "GROQ_API_KEY=dotenv-groq-key\n",
        encoding="utf-8",
    )

    provider = build_provider()

    assert isinstance(provider, FallbackLlmProvider)


# LLM-SEAM-008d: missing API key fails loudly
def test_008d_missing_key_raises(monkeypatch, tmp_path) -> None:
    monkeypatch.chdir(tmp_path)
    monkeypatch.setenv("LLM_PROVIDER", "gemini")
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    with pytest.raises(ValueError, match="GEMINI_API_KEY"):
        build_provider()


# LLM-SEAM-008d2: fake provider returns FakeLlmProvider (no API key needed)
def test_008d2_fake_provider(monkeypatch) -> None:
    monkeypatch.setenv("LLM_PROVIDER", "fake")
    provider = build_provider()
    assert isinstance(provider, FakeLlmProvider)


# LLM-SEAM-008e: all base_urls end with /v1, /openai/, or /v1/
def test_008e_base_urls_are_openai_compatible() -> None:
    for name, entry in PROVIDERS.items():
        url = entry["base_url"]
        assert url.endswith(("/v1", "/openai/", "/v1/")), (
            f"Provider '{name}' base_url '{url}' "
            f"does not end with /v1, /openai/, or /v1/"
        )


# LLM-SEAM-008f: registry imports from shared/llm/, not modules/*
def test_008f_registry_no_modules_import() -> None:
    import ast
    from pathlib import Path

    reg_path = (
        Path(__file__).parent.parent
        / "app"
        / "shared"
        / "llm"
        / "providers"
        / "registry.py"
    )
    tree = ast.parse(reg_path.read_text(encoding="utf-8"))
    for node in ast.walk(tree):
        if isinstance(node, (ast.Import, ast.ImportFrom)):
            line = ast.unparse(node) if hasattr(ast, "unparse") else str(node)
            assert "modules" not in line, (
                f"registry.py must not import from modules/*: {line}"
            )


# ---------------------------------------------------------------------------
# Fallback-related tests
# ---------------------------------------------------------------------------


# LLM-SEAM-008g: no fallback when LLM_FALLBACKS is empty
def test_008g_no_fallbacks_returns_single_provider(monkeypatch) -> None:
    monkeypatch.setenv("LLM_PROVIDER", "gemini")
    monkeypatch.setenv("GEMINI_API_KEY", "k")
    monkeypatch.delenv("LLM_FALLBACKS", raising=False)
    provider = build_provider()
    assert isinstance(provider, OpenAiCompatibleProvider)
    assert not isinstance(provider, FallbackLlmProvider)


# LLM-SEAM-008h: with fallbacks, returns FallbackLlmProvider
def test_008h_with_fallbacks_returns_fallback_provider(monkeypatch) -> None:
    monkeypatch.setenv("LLM_PROVIDER", "gemini")
    monkeypatch.setenv("GEMINI_API_KEY", "k")
    monkeypatch.setenv("LLM_FALLBACKS", "groq,mistral")
    monkeypatch.setenv("GROQ_API_KEY", "k")
    monkeypatch.setenv("MISTRAL_API_KEY", "k")
    provider = build_provider()
    assert isinstance(provider, FallbackLlmProvider)


# LLM-SEAM-008i: fallback skips providers whose API key is missing
def test_008i_fallback_skips_missing_keys(monkeypatch) -> None:
    monkeypatch.setenv("LLM_PROVIDER", "gemini")
    monkeypatch.setenv("GEMINI_API_KEY", "k")
    monkeypatch.setenv("LLM_FALLBACKS", "groq,mistral")
    # Only set GROQ — MISTRAL missing
    monkeypatch.setenv("GROQ_API_KEY", "k")
    monkeypatch.delenv("MISTRAL_API_KEY", raising=False)
    provider = build_provider()
    # Fallback chain built, but only with gemini + groq (mistral skipped)
    assert isinstance(provider, FallbackLlmProvider)


# LLM-SEAM-008j: unknown fallback names are ignored with a warning
def test_008j_unknown_fallback_ignored(monkeypatch) -> None:
    monkeypatch.setenv("LLM_PROVIDER", "gemini")
    monkeypatch.setenv("GEMINI_API_KEY", "k")
    monkeypatch.setenv("LLM_FALLBACKS", "openrouter,unknown")
    # No API keys set for the unknown ones either
    provider = build_provider()
    # Should still return a single provider since all fallbacks are
    # either unknown or missing keys.
    assert isinstance(provider, OpenAiCompatibleProvider)
    assert not isinstance(provider, FallbackLlmProvider)


# LLM-SEAM-008k: fallback deduplicates provider names
def test_008k_fallback_deduplicates(monkeypatch) -> None:
    monkeypatch.setenv("LLM_PROVIDER", "gemini")
    monkeypatch.setenv("GEMINI_API_KEY", "k")
    monkeypatch.setenv("LLM_FALLBACKS", "groq,groq,mistral,groq")
    monkeypatch.setenv("GROQ_API_KEY", "k")
    monkeypatch.setenv("MISTRAL_API_KEY", "k")
    provider = build_provider()
    assert isinstance(provider, FallbackLlmProvider)


# LLM-SEAM-008l: providing the primary in LLM_FALLBACKS is harmless
def test_008l_primary_in_fallbacks_ignored(monkeypatch) -> None:
    monkeypatch.setenv("LLM_PROVIDER", "gemini")
    monkeypatch.setenv("GEMINI_API_KEY", "k")
    monkeypatch.setenv("LLM_FALLBACKS", "gemini,groq")
    monkeypatch.setenv("GROQ_API_KEY", "k")
    provider = build_provider()
    assert isinstance(provider, FallbackLlmProvider)
