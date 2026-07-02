"""Provider registry and build_provider factory.

Resolves the active LLM provider from the LLM_PROVIDER environment variable
(already declared in config.py::Settings.llm_provider) and constructs an
OpenAiCompatibleProvider with the matching base_url, model, and API key.
"""

import os

from app.shared.llm.port import LlmProvider
from app.shared.llm.providers.openai_compatible import OpenAiCompatibleProvider

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
}


def build_provider() -> LlmProvider:
    """Construct an OpenAiCompatibleProvider from LLM_PROVIDER env.

    Reads LLM_PROVIDER from the environment, looks up the matching entry
    in PROVIDERS, reads the provider's API key from the env var named by
    api_key_env, and returns a configured OpenAiCompatibleProvider.

    Returns:
        A configured OpenAiCompatibleProvider.

    Raises:
        ValueError: If LLM_PROVIDER is not set, refers to an unknown provider,
            or the required API key env var is missing or empty.
    """
    provider_name = os.environ.get("LLM_PROVIDER", "").strip().lower()
    if not provider_name:
        raise ValueError(
            "LLM_PROVIDER environment variable is not set. "
            "Set it to one of: gemini, groq"
        )

    entry = PROVIDERS.get(provider_name)
    if entry is None:
        raise ValueError(
            f"Unknown LLM_PROVIDER '{provider_name}'. "
            f"Must be one of: {', '.join(sorted(PROVIDERS.keys()))}"
        )

    api_key = os.environ.get(entry["api_key_env"], "").strip()
    if not api_key:
        raise ValueError(
            f"API key environment variable '{entry['api_key_env']}' "
            f"is not set. Set it to use provider '{provider_name}'."
        )

    return OpenAiCompatibleProvider(
        base_url=entry["base_url"],
        api_key=api_key,
        model=entry["model"],
    )
