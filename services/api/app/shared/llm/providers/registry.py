"""Provider registry and build_provider factory.

Resolves the active LLM provider from settings.llm_provider.
Returns a configured OpenAiCompatibleProvider for real providers,
or FakeLlmProvider for tests/dev.
"""

from app.shared.config import settings
from app.shared.llm.port import LlmProvider
from app.shared.llm.providers.fake import FakeLlmProvider
from app.shared.llm.providers.openai_compatible import OpenAiCompatibleProvider

# OpenAI-compatible providers keyed by name.
# Each entry maps to {base_url, api_key_attr, model}.
# All expose /chat/completions, so a single adapter class covers all.
PROVIDERS: dict[str, dict[str, str]] = {
    "gemini": {
        "base_url": "https://generativelanguage.googleapis.com/v1beta/openai/",
        "api_key_attr": "gemini_api_key",
        "model": "gemini-2.5-flash",
    },
    "groq": {
        "base_url": "https://api.groq.com/openai/v1",
        "api_key_attr": "groq_api_key",
        "model": "qwen/qwen3-32b",
    },
}


def build_provider() -> LlmProvider:
    """Construct an LlmProvider from settings.llm_provider.

    When llm_provider is "fake", returns a FakeLlmProvider (no API key needed).
    Otherwise looks up the matching entry in PROVIDERS, reads the provider's
    API key from settings, and returns a configured OpenAiCompatibleProvider.

    Returns:
        A configured LlmProvider.

    Raises:
        ValueError: If llm_provider is not set, refers to an unknown provider,
            or the required API key is missing or empty.
    """
    provider_name = settings.llm_provider.strip().lower()
    if not provider_name:
        raise ValueError(
            "LLM_PROVIDER is not set. "
            "Set it to one of: fake, gemini, groq"
        )

    if provider_name == "fake":
        return FakeLlmProvider()

    entry = PROVIDERS.get(provider_name)
    if entry is None:
        raise ValueError(
            f"Unknown LLM_PROVIDER '{provider_name}'. "
            f"Must be one of: fake, {', '.join(sorted(PROVIDERS.keys()))}"
        )

    api_key = getattr(settings, entry["api_key_attr"], None)
    if not api_key:
        env_var_name = entry["api_key_attr"].upper()
        raise ValueError(
            f"API key '{entry['api_key_attr']}' is not set in settings. "
            f"Set {env_var_name} in .env to use provider '{provider_name}'."
        )

    return OpenAiCompatibleProvider(
        base_url=entry["base_url"],
        api_key=api_key,
        model=entry["model"],
    )
