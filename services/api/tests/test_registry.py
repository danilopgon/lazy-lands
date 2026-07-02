"""Tests for provider registry and build_provider factory (LLM-SEAM-008 a-f)."""

import pytest

from app.shared.llm.providers.fake import FakeLlmProvider
from app.shared.llm.providers.openai_compatible import OpenAiCompatibleProvider
from app.shared.llm.providers.registry import PROVIDERS, build_provider


# LLM-SEAM-008a: PROVIDERS dict contains exactly two keys
def test_008a_providers_has_two_entries() -> None:
    assert len(PROVIDERS) == 2
    assert "gemini" in PROVIDERS
    assert "groq" in PROVIDERS


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


# LLM-SEAM-008d: missing API key fails loudly
def test_008d_missing_key_raises(monkeypatch) -> None:
    monkeypatch.setenv("LLM_PROVIDER", "gemini")
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    with pytest.raises(ValueError) as exc_info:
        build_provider()
    assert "GEMINI_API_KEY" in str(exc_info.value)


# LLM-SEAM-008d2: fake provider returns FakeLlmProvider (no API key needed)
def test_008d2_fake_provider(monkeypatch) -> None:
    monkeypatch.setenv("LLM_PROVIDER", "fake")
    provider = build_provider()
    assert isinstance(provider, FakeLlmProvider)


# LLM-SEAM-008e: all base_urls end with /v1 or /openai/
def test_008e_base_urls_are_openai_compatible() -> None:
    for name, entry in PROVIDERS.items():
        url = entry["base_url"]
        assert (
            url.endswith("/v1") or url.endswith("/openai/") or url.endswith("/v1/")
        ), f"Provider '{name}' base_url '{url}' does not end with /v1 or /openai/"


# LLM-SEAM-008f: registry imports from shared/llm/openai_compatible, not modules/*
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
