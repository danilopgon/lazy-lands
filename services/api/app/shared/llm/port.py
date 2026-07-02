"""LLM provider protocol — the contract every provider implementation must satisfy."""

from typing import Protocol

from pydantic import BaseModel


class LlmProvider(Protocol):
    """Structural typing contract for LLM completion providers.

    Matches the signature documented in docs/05-ai-system.md § "LLM Provider
    abstraction" and ADR-03 verbatim.
    """

    async def complete_text(self, prompt: str) -> str:
        """Return a raw text completion for the provided prompt."""
        ...

    async def complete_json[T: BaseModel](self, prompt: str, schema: type[T]) -> T:
        """Return a typed, Pydantic-validated completion for the prompt."""
        ...
