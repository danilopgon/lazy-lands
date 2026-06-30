"""In-memory fake LLM provider for development and testing."""

from app.shared.llm.port import LlmProvider


class FakeLlmProvider(LlmProvider):
    """Returns a static JSON string — used when no real LLM is configured."""

    async def complete(self, prompt: str) -> str:
        """Return a fixed fake response regardless of the prompt."""
        _ = prompt
        return '{"fake": true}'
