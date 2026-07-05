"""Provider registry and build_provider factory.

Resolves the active LLM provider from application settings.
Returns a configured OpenAiCompatibleProvider for real providers,
a FallbackLlmProvider when LLM_FALLBACKS is set, or FakeLlmProvider for
tests/dev.
"""

import logging

from app.shared.config import Settings
from app.shared.llm.port import LlmProvider
from app.shared.llm.providers.fake import FakeLlmProvider
from app.shared.llm.providers.fallback import FallbackLlmProvider
from app.shared.llm.providers.openai_compatible import OpenAiCompatibleProvider

logger = logging.getLogger(__name__)

# OpenAI-compatible providers keyed by name.
# Each entry maps to {base_url, api_key_env, model}.
# All expose /chat/completions, so a single adapter class covers all.
PROVIDERS: dict[str, dict[str, str]] = {
    "gemini": {
        "base_url": "https://generativelanguage.googleapis.com/v1beta/openai/",
        "api_key_env": "GEMINI_API_KEY",
        "model": "gemini-2.5-flash",
    },
    "groq": {
        "base_url": "https://api.groq.com/openai/v1",
        "api_key_env": "GROQ_API_KEY",
        "model": "qwen/qwen3-32b",
    },
    "mistral": {
        "base_url": "https://api.mistral.ai/v1",
        "api_key_env": "MISTRAL_API_KEY",
        "model": "mistral-small-latest",
    },
    "cerebras": {
        "base_url": "https://api.cerebras.ai/v1",
        "api_key_env": "CEREBRAS_API_KEY",
        "model": "gpt-oss-120b",
    },
}


def _get_provider_api_key(settings: Settings, api_key_env: str) -> str:
    value = getattr(settings, api_key_env.lower(), None)
    return (value or "").strip()


def _build_single(
    settings: Settings, name: str, entry: dict[str, str]
) -> OpenAiCompatibleProvider:
    """Create an OpenAiCompatibleProvider for a single registered provider.

    Reads the API key from the settings field named by *entry*.
    """
    api_key = _get_provider_api_key(settings, entry["api_key_env"])
    if not api_key:
        raise ValueError(
            f"API key environment variable '{entry['api_key_env']}' "
            f"is not set. Set it to use provider '{name}'."
        )
    return OpenAiCompatibleProvider(
        base_url=entry["base_url"],
        api_key=api_key,
        model=entry["model"],
        provider_name=name,
    )


def build_provider() -> LlmProvider:
    """Construct an LlmProvider from application settings.

    When LLM_PROVIDER is "fake", returns a FakeLlmProvider (no API key needed).

    Otherwise looks up the matching entry in PROVIDERS, reads the provider's
    API key from settings, and returns a configured OpenAiCompatibleProvider.

    If LLM_FALLBACKS is set (comma-separated provider names), returns a
    ``FallbackLlmProvider`` that wraps the primary provider PLUS every
    named fallback whose API key is set.  Providers are tried in order,
    with unhealthy providers temporarily skipped.

    Returns:
        A configured LlmProvider (single or fallback).

    Raises:
        ValueError: If LLM_PROVIDER refers to an unknown provider, or the
            required API key setting for the primary is missing.
    """
    settings = Settings()  # type: ignore[call-arg]
    primary = settings.llm_provider.strip().lower()
    if not primary:
        raise ValueError(
            "LLM_PROVIDER setting is not set. "
            "Set it to one of: fake, gemini, groq, mistral, cerebras"
        )

    if primary == "fake":
        return FakeLlmProvider()

    entry = PROVIDERS.get(primary)
    if entry is None:
        raise ValueError(
            f"Unknown LLM_PROVIDER '{primary}'. "
            f"Must be one of: fake, {', '.join(sorted(PROVIDERS.keys()))}"
        )

    primary_provider = _build_single(settings, primary, entry)

    # ---- Fallback chain ------------------------------------------------
    fallback_names = _parse_fallback_names(settings, primary)
    if not fallback_names:
        return primary_provider  # no fallbacks configured — fast path

    chain: list[LlmProvider] = [primary_provider]
    for name in fallback_names:
        fb_entry = PROVIDERS.get(name)
        if fb_entry is None:
            logger.warning(
                "Unknown fallback provider %r — skipping. Known providers: %s",
                name,
                ", ".join(sorted(PROVIDERS.keys())),
            )
            continue
        api_key = _get_provider_api_key(settings, fb_entry["api_key_env"])
        if not api_key:
            logger.info(
                "Skipping fallback %r — %s not set.",
                name,
                fb_entry["api_key_env"],
            )
            continue
        chain.append(
            OpenAiCompatibleProvider(
                base_url=fb_entry["base_url"],
                api_key=api_key,
                model=fb_entry["model"],
                provider_name=name,
            )
        )

    if len(chain) == 1:
        return primary_provider  # all named fallbacks were skipped

    logger.info(
        "Built fallback chain: %s",
        " → ".join(_provider_label(p) for p in chain),
    )
    return FallbackLlmProvider(chain)


def _parse_fallback_names(settings: Settings, primary: str) -> list[str]:
    """Return a deduplicated, ordered list of fallback provider names.

    Reads ``LLM_FALLBACKS`` (comma- or space-separated) and ignores any value
    that matches the primary provider.
    """
    raw = settings.llm_fallbacks.strip()
    if not raw:
        return []

    names: list[str] = []
    for token in raw.replace(",", " ").split():
        name = token.strip().lower()
        if not name:
            continue
        if name == primary:
            continue  # don't include primary in its own fallback list
        if name not in names:  # deduplicate
            names.append(name)
    return names


def _provider_label(provider: LlmProvider) -> str:
    """Return a short diagnostic label for *provider*."""
    name = getattr(provider, "provider_name", None)
    if name:
        return name
    return type(provider).__name__
