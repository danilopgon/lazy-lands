"""In-memory fake LLM provider for development and testing."""

import json

from pydantic import BaseModel

from app.shared.llm.json_guard import parse_llm_json


class FakeLlmProvider:
    """Deterministic fake LLM provider.

    Supports a generic registration API so modules can register per-schema
    fixture payloads at setup time (ADR-05 rule 3: module → shared, never
    shared → module).

    ``complete_json`` serializes the registered payload to a JSON string and
    routes it through ``parse_llm_json`` — the same guard the real adapter
    uses. This ensures use-case tests hit the real validation path.
    """

    def __init__(self) -> None:
        """Initialize with an empty fixture registry."""
        self._fixtures: dict[type[BaseModel], dict[str, object]] = {}

    def register(self, schema: type[BaseModel], payload: dict[str, object]) -> None:
        """Register a fixture payload for a Pydantic schema.

        Modules call this at setup/import time (e.g., in conftest). The
        direction is module → shared, compliant with ADR-05 rule 3.

        Args:
            schema: The Pydantic model class to register a fixture for.
            payload: A dict that, after JSON serialization and guard routing,
                should be valid for the given schema.
        """
        self._fixtures[schema] = payload

    async def complete_text(self, prompt: str) -> str:
        """Return a deterministic echo string including the prompt."""
        truncated = prompt[:50] + "..." if len(prompt) > 50 else prompt
        return f"FakeLlmProvider: text completion for prompt '{truncated}'"

    async def complete_json[T: BaseModel](self, prompt: str, schema: type[T]) -> T:
        """Validate and return a typed instance via the shared JSON guard.

        Looks up the registered payload for ``schema``, serializes it to a
        JSON string, and routes it through ``parse_llm_json`` — ensuring
        fence-strip, JSON parsing, and Pydantic validation run identically
        to the real adapter path.

        Args:
            prompt: The prompt string (echoed in the payload, if configured).
            schema: The Pydantic model class to validate against.

        Returns:
            A validated instance of ``schema``.

        Raises:
            KeyError: If ``schema`` has not been registered via ``register()``.
            LlmOutputValidationError: If the registered payload fails the
                guard (invalid JSON or schema mismatch).
        """
        _ = prompt
        if schema not in self._fixtures:
            raise KeyError(
                f"No fixture registered for schema '{schema.__name__}'. "
                f"Call provider.register({schema.__name__}, payload) first."
            )
        raw = json.dumps(self._fixtures[schema])
        return parse_llm_json(raw, schema)
