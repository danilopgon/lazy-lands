"""Shared FastAPI dependency for the process-cached LLM provider.

Transversal concern (ADR-05 rule 3): used by 2+ modules (campaigns,
sessions) and owned by neither, so it lives in ``shared/``.
"""

from functools import lru_cache

from app.shared.llm.port import LlmProvider
from app.shared.llm.providers.registry import build_provider


@lru_cache
def get_llm_provider() -> LlmProvider:
    """FastAPI dependency wrapping ``build_provider``.

    Cached for the process lifetime so request handlers do not rebuild
    ``Settings`` (re-reading env/.env) on every call. Tests override this via
    ``dependency_overrides``, which bypasses the cache entirely.
    """
    return build_provider()
