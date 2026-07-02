# Spec: openai-compatible-provider

**Change**: block-build-parallelization
**Capability**: `openai-compatible-provider` (new)
**Track**: A (first slice)

---

## Overview

A single `LlmProvider` adapter that speaks the OpenAI-compatible chat completions HTTP contract,
configurable by `base_url` / `api_key` / `model`. It is driven by a small provider registry
covering free/cheap OpenAI-compatible endpoints (Gemini, Groq, Cerebras, OpenRouter). Because all
four targets share the same request/response shape, one adapter implementation covers all of
them — no per-vendor subclassing.

This adapter is not throwaway dev tooling: it **seeds the production `OpenRouterProvider`** that
Block 5 needs. Selecting `openrouter` from the registry with production credentials IS the
production provider.

---

## Functional requirements

### OP-001: Provider registry

A registry (e.g. `PROVIDERS: dict[str, ProviderConfig]`) MUST exist mapping a provider key to its
`base_url`, `api_key_env` (the environment variable name holding the key — never the key value),
and default `model`. At minimum the registry MUST include: `gemini`, `groq`, `cerebras`,
`openrouter`.

#### Scenario: Registry exposes all four required providers

- GIVEN the provider registry module
- WHEN its keys are inspected
- THEN `gemini`, `groq`, `cerebras`, and `openrouter` are all present, each with `base_url`,
  `api_key_env`, and `model` populated

---

### OP-002: Adapter implements `LlmProvider`

The adapter class MUST implement `complete_text` and `complete_json` per the `llm-port` spec,
calling the configured OpenAI-compatible endpoint's chat completions API and applying the same
JSON guard (fence stripping, typed validation error) required of any `LlmProvider`
implementation.

#### Scenario: Adapter constructed with an explicit registry entry

- GIVEN a provider key present in the registry and its API key set in the environment
- WHEN the adapter is instantiated for that provider key
- THEN it is configured with that entry's `base_url` and `model`, and is a valid `LlmProvider`

---

### OP-003: API key resolution from environment only

The adapter MUST read the API key from the environment variable named in the registry entry
(`api_key_env`) at construction or call time. The adapter MUST NOT accept a hardcoded key, MUST
NOT have any key baked into source, and MUST NOT read the key from any file tracked by git.

#### Scenario: Missing key produces a clear, explicit error

- GIVEN a provider key present in the registry whose corresponding environment variable is
  unset or empty
- WHEN the adapter attempts to construct or make a call for that provider
- THEN a clear, actionable error is raised naming the missing environment variable — the
  adapter MUST NOT silently proceed with an empty/`None` key, MUST NOT fall back to another
  provider without being told to, and MUST NOT hang or produce an ambiguous HTTP 401 as the
  only signal

---

### OP-004: No secret ever committed

No real API key value MUST appear in any committed file (source, test fixture, `.env.example`,
or documentation). `.env.example` MUST document the four key names (`GEMINI_API_KEY`,
`GROQ_API_KEY`, `CEREBRAS_API_KEY`, `OPENROUTER_API_KEY`) with placeholder or empty values only.

#### Scenario: `.env.example` documents key names without values

- GIVEN `services/api/.env.example` (or the project's documented env template location) after
  this change
- WHEN its contents are inspected
- THEN all four key names are present as documented variables, and none has a real,
  non-placeholder secret value

---

### OP-005: Adapter is inert without explicit opt-in

Constructing or importing the adapter module MUST NOT trigger a network call. The adapter is
only exercised by the opt-in `dev-inference-lane` (see that spec) or by explicit production
wiring — never implicitly during test collection, app startup smoke checks, or CI's default run.

#### Scenario: Importing the adapter module makes no network call

- GIVEN a clean test environment with no API keys set and no network mocking
- WHEN the adapter module is imported (not instantiated, not called)
- THEN no network call occurs and no exception is raised

---

## Non-functional requirements

### NFR-OP-1: One adapter, no per-vendor branching in call logic

The HTTP call logic MUST be shared across all four registry entries — differences are limited to
configuration values (`base_url`, `api_key_env`, `model`), not conditional code paths per
provider.

### NFR-OP-2: Timeouts and failures do not hang tests or CI

Any network call the adapter makes (exercised only by the opt-in lane) MUST use an explicit
timeout so a slow or unresponsive endpoint cannot hang the calling process indefinitely.

---

## Acceptance criteria

1. The provider registry contains `gemini`, `groq`, `cerebras`, `openrouter` with `base_url`,
   `api_key_env`, and `model`. (OP-001)
2. The adapter implements `complete_text`/`complete_json` per `llm-port`, including the JSON
   guard. (OP-002)
3. API keys are resolved only from environment variables named in the registry; a missing key
   raises a clear, named error — never a silent failure. (OP-003)
4. No real API key value is committed anywhere; `.env.example` documents the four names.
   (OP-004)
5. Importing/constructing the adapter without explicit use makes no network call. (OP-005)
6. All four providers share one adapter implementation (config-driven, not per-vendor code).
   (NFR-OP-1)
