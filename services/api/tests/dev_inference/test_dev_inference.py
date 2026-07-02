"""Opt-in dev-inference lane tests (LLM-SEAM-010).

These tests contact real LLM endpoints and are excluded from default CI
runs via ``@pytest.mark.dev_inference``. Each test skips when its
provider's API key env var is missing — belt + suspenders with the marker
exclusion (Design Decision 5).
"""

import os

import pytest

from app.shared.llm.providers.registry import build_provider


@pytest.mark.dev_inference
@pytest.mark.asyncio
async def test_dev_inference_minimal_roundtrip() -> None:
    """Build a real provider from env, send a minimal prompt, assert non-empty response.

    Skipped if the provider's API key is not set.
    """
    provider_name = os.environ.get("LLM_PROVIDER", "").strip().lower()
    if not provider_name:
        pytest.skip("LLM_PROVIDER not set — no provider to test against")

    # Resolve which key env var is needed
    from app.shared.llm.providers.registry import PROVIDERS

    entry = PROVIDERS.get(provider_name)
    if entry is None:
        pytest.skip(f"Unknown LLM_PROVIDER '{provider_name}'")

    api_key = os.environ.get(entry["api_key_env"], "").strip()
    if not api_key:
        pytest.skip(
            f"{entry['api_key_env']} not set — skipping real-LLM dev-inference test"
        )

    provider = build_provider()
    result = await provider.complete_text("Say 'hello' in exactly one word.")
    assert isinstance(result, str)
    assert len(result.strip()) > 0
