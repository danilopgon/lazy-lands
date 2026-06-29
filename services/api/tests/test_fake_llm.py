import pytest

from app.shared.llm.port import LlmProvider
from app.shared.llm.fake import FakeLlmProvider


@pytest.mark.asyncio
async def test_fake_llm_provider_completes_with_non_empty_text() -> None:
    provider: LlmProvider = FakeLlmProvider()

    result = await provider.complete("Summarize the last session")

    assert result == '{"fake": true}'
