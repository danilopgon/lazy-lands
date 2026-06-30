"""LLM provider protocol — the contract every provider implementation must satisfy."""

from typing import Protocol


class LlmProvider(Protocol):
    """Structural typing contract for LLM completion providers."""

    async def complete(self, prompt: str) -> str:
        """Return a completion proposal for the provided prompt."""
