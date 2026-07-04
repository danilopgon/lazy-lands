"""OpenAI-compatible LLM provider adapter using httpx.AsyncClient.

A single adapter class covers all four providers (Gemini, Groq, Cerebras,
OpenRouter) because they all expose an OpenAI-compatible /chat/completions
endpoint. This class is the seed of the production OpenRouterProvider.
"""

import logging

import httpx
from pydantic import BaseModel

from app.shared.llm.json_guard import parse_llm_json

logger = logging.getLogger(__name__)


class OpenAiCompatibleProvider:
    """LLM provider that POSTs to an OpenAI-compatible /chat/completions endpoint.

    Accepts an optional ``http_client`` for testability — tests inject
    ``httpx.MockTransport`` so no network is required.

    ``complete_json`` always routes through the shared ``parse_llm_json``
    guard — the same validation path the fake uses.
    """

    def __init__(
        self,
        base_url: str,
        api_key: str,
        model: str,
        *,
        provider_name: str = "",
        http_client: httpx.AsyncClient | None = None,
    ) -> None:
        """Initialize with endpoint, credentials, and optional HTTP client.

        Args:
            base_url: Base URL for the OpenAI-compatible API (must end in
                a path where POST /chat/completions is appended).
            api_key: API key sent as Bearer token in the Authorization header.
            model: Model identifier (e.g. "gemini-2.5-flash").
            provider_name: Human-readable label for logging and fallback
                diagnostics (e.g. "gemini", "groq").
            http_client: Optional httpx.AsyncClient for test injection.
                If None, a default AsyncClient is created internally.
        """
        self.base_url = base_url
        self.api_key = api_key
        self.model = model
        self.provider_name = provider_name
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }
        self._client = http_client or httpx.AsyncClient(headers=headers)

    async def complete_text(self, prompt: str) -> str:
        """Send a chat completion prompt and return the raw text response.

        Args:
            prompt: The user prompt to send.

        Returns:
            The message content string from the first choice.
        """
        logger.info(
            "LLM call: provider=%s model=%s prompt_length=%d",
            self.provider_name or type(self).__name__,
            self.model,
            len(prompt),
        )
        body = {
            "model": self.model,
            "messages": [{"role": "user", "content": prompt}],
        }
        response = await self._client.post(
            f"{self.base_url.rstrip('/')}/chat/completions",
            json=body,
        )
        response.raise_for_status()
        data = response.json()
        return data["choices"][0]["message"]["content"]

    async def complete_json[T: BaseModel](self, prompt: str, schema: type[T]) -> T:
        """Send a prompt and return a typed, Pydantic-validated response.

        Calls ``complete_text`` internally, then routes the raw model output
        through ``parse_llm_json`` — identical validation path to the fake.

        Args:
            prompt: The user prompt to send.
            schema: The Pydantic model to validate the response against.

        Returns:
            A validated instance of ``schema``.

        Raises:
            LlmOutputValidationError: If the model output is not valid JSON
                or fails Pydantic validation.
        """
        raw = await self.complete_text(prompt)
        return parse_llm_json(raw, schema)
