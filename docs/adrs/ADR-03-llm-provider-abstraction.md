# ADR-03 — AI Provider: LlmProvider Abstraction

**Status:** Accepted — updated by ADR-06  
**Date:** 2025  
**Area:** Backend / LLM Integration

## Context and problem

Lazy Lands calls an LLM for several operations: campaign extraction, session summarization,
memory suggestion and session generation. The specific provider must not be coupled to the
application core — in development a free-tier provider (Gemini, Groq) is used via the
OpenAI-compatible adapter, in production an external API, and
in the future the provider may change without affecting the prompt builder or the data model.

## Decision

An `LlmProvider` abstraction defined as a Python `Protocol` from day one:

```python
from typing import Protocol, TypeVar
from pydantic import BaseModel

T = TypeVar("T", bound=BaseModel)

class LlmProvider(Protocol):
    async def complete_text(self, prompt: str) -> str:
        ...

    async def complete_json(self, prompt: str, schema: type[T]) -> T:
        ...
```

The active provider is resolved from configuration via the `LLM_PROVIDER` environment variable.
The prompt builder and generation endpoints do not know which provider they are using.

Implementations:

- `FakeLlmProvider` — deterministic, used in tests (no external calls). Register per-schema
  fixtures via `register(schema, payload)`; validation routes through `parse_llm_json`.
- `OpenAiCompatibleProvider` — single `httpx` adapter covering OpenAI-compatible endpoints
  (Gemini, Groq free tiers). Seeds the production `OpenRouterProvider`.
- `build_provider()` — factory that resolves the active provider from `LLM_PROVIDER` env var
  via a provider registry. Fail-loud on missing API key.

## Consequences

**Positive:**

- Changing provider = changing config, not code.
- Unit tests for the prompt builder can use a mock of `LlmProvider` without calling any real API.
- TFM demos work locally with free-tier providers and in production with an external API
  without touching the core.

**Negative / trade-offs:**

- Each provider has particularities (response format, token limits, parameters) that the
  abstraction must normalize.
- The abstraction assumes all providers work with a text prompt → text response model, which
  is valid for the MVP but may fall short if provider-specific features are needed
  (function calling, native structured outputs, etc.).
