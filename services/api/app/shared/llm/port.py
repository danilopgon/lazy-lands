from typing import Protocol


class LlmProvider(Protocol):
    async def complete(self, prompt: str) -> str:
        """Return a completion proposal for the provided prompt."""
