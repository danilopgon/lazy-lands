# Spec: LLM Seam Enrichment

**Change**: block-build-parallelization
**Capabilities**: `llm-port`, `json-guard`, `fixture-fake`, `openai-compatible-provider`, `dev-inference-lane`
**Spec type**: Delta — enriches existing `llm-port` and `fake-llm-oracle` capabilities; adds new `json-guard`, `openai-compatible-provider`, `dev-inference-lane`
**Slice**: Track A — LLM Seam Enrichment
**Design reference**: decisions 1–6 from `design.md`

## Scope refinement (explicit — decide on the page)

Track A ships the seam mechanism, not the four domain output schemas. The schemas
(`ExtractCampaignOutput`, `CampaignSummaryOutput`, `MemorySuggestionsOutput`,
`GeneratedSessionOutput`) do not exist in code today (verified: no `BaseModel` subclass
under `services/api/app`) and no use case consumes them yet. Authoring them now is Block 5–9
domain work and would violate AGENTS.md anti-speculation rules.

**What Track A delivers:** the fixture mechanism supports registering any schema. Each owning
block registers its real schema + fixture when it lands. Track A proves the mechanism with the
guard's own tests plus one representative in-test schema/fixture.

**Out of scope for Track A:** domain schema authoring, use cases, prompt templates, FastAPI
routes, Supabase integration, and production wiring.

---

## Capability: llm-port

### Purpose

Enrich the `LlmProvider` Protocol from its current `complete(prompt) -> str` to the
`complete_text(prompt) -> str` + `complete_json(prompt, schema: type[T]) -> T` signature
documented in `docs/05-ai-system.md` and ADR-03. Add the shared JSON guard that both fake
and real providers validate through, the typed validation-error contract, and the generic
per-schema fixture fake that replaces the static `{"fake": true}` response.

---

### Requirements

#### LLM-SEAM-001: Shared JSON guard — `parse_llm_json`

The `services/api/app/shared/llm/json_guard.py` module MUST expose:

```python
def parse_llm_json(raw: str, schema: type[T]) -> T
```

This function MUST:
- Strip Markdown code fences (` ```json ``` ` and ` ``` ``` `) and surrounding prose from `raw` before attempting JSON parsing.
- Call `json.loads()` on the stripped content.
- Call `schema.model_validate(...)` on the parsed dict.
- Return the validated instance of type `T` on success.
- Raise `LlmOutputValidationError` on `json.JSONDecodeError` and on `pydantic.ValidationError` (never let raw parser errors propagate).
- Never silently accept semantically invalid data (per `docs/05-ai-system.md` "JSON guard" rule).

| Test ID | Pass/Fail condition |
|---------|---------------------|
| LLM-SEAM-001a | Valid JSON without fences returns typed instance |
| LLM-SEAM-001b | JSON wrapped in ` ```json ``` ` fences returns typed instance (fences stripped) |
| LLM-SEAM-001c | JSON wrapped in bare ` ``` ``` ` fences returns typed instance (fences stripped) |
| LLM-SEAM-001d | JSON with preceding/following prose text returns typed instance (prose stripped) |
| LLM-SEAM-001e | `LlmOutputValidationError` raised on invalid JSON with `retryable=True` |
| LLM-SEAM-001f | `LlmOutputValidationError` raised on schema field-type mismatch with `retryable=True` |
| LLM-SEAM-001g | `LlmOutputValidationError` raised on missing required fields with `retryable=True` |

##### Scenario: Clean JSON without fences

- **GIVEN** a `TestSchema(BaseModel)` with fields `name: str` and `level: int`
- **WHEN** `parse_llm_json('{"name": "Gandalf", "level": 20}', TestSchema)` is called
- **THEN** a `TestSchema` instance is returned with `name == "Gandalf"` and `level == 20`

##### Scenario: JSON wrapped in code fences

- **GIVEN** raw `"````\n```json\n{\"name\": \"Gandalf\", \"level\": 20}\n```\n````"`
- **WHEN** `parse_llm_json(raw, TestSchema)` is called
- **THEN** a validated `TestSchema` instance is returned — the function has stripped both outer and inner fences

##### Scenario: JSON with surrounding prose

- **GIVEN** raw `"Here is the character:\n{\"name\": \"Gandalf\", \"level\": 20}\nHope this helps."`
- **WHEN** `parse_llm_json(raw, TestSchema)` is called
- **THEN** a validated `TestSchema` instance is returned

##### Scenario: Invalid JSON — missing closing brace

- **GIVEN** raw `'{"name": "Gandalf", "level": 20'` (missing `}`)
- **WHEN** `parse_llm_json(raw, TestSchema)` is called
- **THEN** `LlmOutputValidationError` is raised with `retryable=True`, `schema_name="TestSchema"`, and `__cause__` set to the underlying `json.JSONDecodeError`

##### Scenario: Schema validation failure — wrong type

- **GIVEN** raw `'{"name": "Gandalf", "level": "twenty"}'`
- **WHEN** `parse_llm_json(raw, TestSchema)` is called
- **THEN** `LlmOutputValidationError` is raised with `retryable=True` and `__cause__` set to the underlying `pydantic.ValidationError`

---

#### LLM-SEAM-002: Typed validation-error contract — `LlmOutputValidationError`

The `services/api/app/shared/llm/errors.py` module MUST expose:

```python
class LlmOutputValidationError(Exception):
    schema_name: str
    raw_output: str
    retryable: bool = True
```

This class MUST:

- Extend `Exception` (or the existing `AppError` base if compatible — see **Decorator note** below).
- Carry `schema_name` as a required `str` — the name of the Pydantic model whose validation failed.
- Carry `raw_output` as a required `str` — the raw model output that caused the failure (for logging, never persisted per `docs/05` production rule).
- Carry `retryable` as an optional `bool` defaulting to `True` (per `docs/05` "JSON validation" section: "Return a clear retryable error to the frontend").
- Set `__cause__` to the underlying `json.JSONDecodeError` or `pydantic.ValidationError` during construction (so tracebacks preserve the root cause).

**Decorator note:** The existing `shared/errors.py` declares `AppError(Exception)` with a
`http_error_handler` for FastAPI 400 responses. `LlmOutputValidationError` lives under
`shared/llm/` and does not extend `AppError` unless that base is compatible with the fields
above. If `AppError` cannot carry `schema_name`/`raw_output`/`retryable` without breaking its
existing contract, `LlmOutputValidationError` extends `Exception` directly. This is an
implementation-level call during apply; the spec requires the three fields regardless of base
class.

| Test ID | Pass/Fail condition |
|---------|---------------------|
| LLM-SEAM-002a | Constructor accepts `schema_name`, `raw_output`, and optional `retryable` |
| LLM-SEAM-002b | `str(exc)` includes `schema_name` — human-readable for logging |
| LLM-SEAM-002c | `exc.__cause__` is set when constructed from `pydantic.ValidationError` |
| LLM-SEAM-002d | `exc.__cause__` is set when constructed from `json.JSONDecodeError` |
| LLM-SEAM-002e | Default `retryable` is `True` |

##### Scenario: Constructed from Pydantic failure

- **GIVEN** a `pydantic.ValidationError` raised by `TestSchema(name="Gandalf", level="twenty")`
- **WHEN** `LlmOutputValidationError(schema_name="TestSchema", raw_output='{"name":"Gandalf","level":"twenty"}', retryable=True)` is raised from the except block (with `from cause`)
- **THEN** `exc.schema_name == "TestSchema"`, `exc.retryable is True`, and `exc.__cause__` is the original `ValidationError`

##### Scenario: Constructed from JSON decode failure

- **GIVEN** a `json.JSONDecodeError` raised by `json.loads("{bad}")`
- **WHEN** `LlmOutputValidationError(schema_name="TestSchema", raw_output="{bad}")` is raised from the except block (with `from cause`)
- **THEN** `exc.schema_name == "TestSchema"`, `exc.retryable is True`, and `exc.__cause__` is the original `JSONDecodeError`

---

#### LLM-SEAM-003: Enriched `LlmProvider` port — `complete_text` + `complete_json`

The `services/api/app/shared/llm/port.py` module MUST be modified to define:

```python
from typing import Protocol, TypeVar
from pydantic import BaseModel

T = TypeVar("T", bound=BaseModel)

class LlmProvider(Protocol):
    async def complete_text(self, prompt: str) -> str: ...
    async def complete_json(self, prompt: str, schema: type[T]) -> T: ...
```

This MUST:

- Replace the existing `complete(prompt) -> str` method entirely — the old signature is removed (code catches up to docs).
- Use `TypeVar("T", bound=BaseModel)` so `complete_json` returns the same type as the `schema` argument (per ADR-03 and `docs/05` verbatim).
- Remain a `Protocol` with structural subtyping — no `ABC`, no base class, no default implementation in the Protocol.
- Reconcile with `services/api/app/shared/config.py::Settings.llm_provider` — the `llm_provider` string already defaults to `"fake"`; no config field change is needed, but the factory/builder that reads `llm_provider` must respect the decision (covered by LLM-SEAM-005).

| Test ID | Pass/Fail condition |
|---------|---------------------|
| LLM-SEAM-003a | `LlmProvider` Protocol has `complete_text(prompt: str) -> str` |
| LLM-SEAM-003b | `LlmProvider` Protocol has `complete_json(prompt: str, schema: type[T]) -> T` |
| LLM-SEAM-003c | Old `complete(prompt) -> str` method is NOT present on Protocol |
| LLM-SEAM-003d | `FakeLlmProvider` satisfies the new Protocol structurally (passes `isinstance(provider, LlmProvider)` — or equivalent runtime check — after update) |
| LLM-SEAM-003e | `complete_json` with `schema=TestSchema` returns a `TestSchema` instance (not `BaseModel`, not `dict`) when called against the fixture fake |

##### Scenario: Protocol matches docs/05 verbatim

- **GIVEN** the definition of `LlmProvider` in `port.py`
- **WHEN** compared against the signature documented in `docs/05-ai-system.md` § "LLM Provider abstraction"
- **THEN** `complete_text` and `complete_json(prompt, schema: type[T]) -> T` are present with matching type annotations

##### Scenario: Fake satisfies new Protocol

- **GIVEN** `FakeLlmProvider` is updated to implement the new Protocol
- **WHEN** a test instantiates `FakeLlmProvider()`
- **THEN** the instance is structurally assignable to `LlmProvider` — calling `complete_text` returns a `str` and `complete_json` returns the expected typed instance

---

#### LLM-SEAM-004: Per-schema fixture fake with registration API

The `services/api/app/shared/llm/providers/fake.py` module MUST be modified to support a generic
registration API:

```python
class FakeLlmProvider:
    def register(self, schema: type[BaseModel], payload: dict) -> None: ...
    async def complete_text(self, prompt: str) -> str: ...
    async def complete_json(self, prompt: str, schema: type[T]) -> T: ...
    async def complete(self, prompt: str) -> str: ...  # REMOVED
```

This MUST:

- **`register(schema, payload)`** — stores a `dict[type[BaseModel], dict]` mapping schemas to their fixture payloads. Modules call this at setup/import time (e.g., in conftest or a module's test fixtures). Direction: module → shared (ADR-05 rule 3 compliant — "kernel never imports module schemas").
- **`complete_text(prompt) -> str`** — returns a deterministic static string (e.g., `"FakeLlmProvider: text completion for prompt '...'"`) that includes a truncated copy of the prompt so tests can assert which prompt was sent. Old `complete()` logic is removed.
- **`complete_json(prompt, schema) -> T`** — looks up `schema` in the registered dictionary. If found, serializes the registered payload to a JSON string and routes it through `parse_llm_json(raw, schema)`. If NOT found, raises a clear error (e.g., `KeyError` or custom `SchemaNotRegisteredError`) naming the unregistered schema. **This is the load-bearing invariant from Design Decision 3:** the fake MUST NOT call `schema.model_validate(dict)` directly.
- **Fence-strip verification** — at least one test MUST register a fixture payload as a JSON string that is wrapped in Markdown code fences (e.g., `"\`\`\`json\n{pyload_str}\n\`\`\`"`). This proves the guard's fence-strip runs on the fake path too (Design Decision 1 critical invariant). The fake must not bypass the guard.

**Scope refinement applied:** Track A does not hardcode or import the four domain schemas. It
provides `register()` as a public API; modules call it when they land.

| Test ID | Pass/Fail condition |
|---------|---------------------|
| LLM-SEAM-004a | `complete_text("hello")` returns a non-empty `str` that contains `"hello"` |
| LLM-SEAM-004b | `register(TestSchema, {"name": "Gandalf", "level": 20})` + `complete_json("prompt", TestSchema)` returns `TestSchema(name="Gandalf", level=20)` |
| LLM-SEAM-004c | Route through `parse_llm_json` is proven: registering a fixture that is semantically *invalid* for the schema (e.g., wrong type for `level`) causes `complete_json` to raise `LlmOutputValidationError` |
| LLM-SEAM-004d | **Fence-strip on fake path**: fenced fixture ( ` ```json ... ``` ` ) still validates — proves `parse_llm_json` ran |
| LLM-SEAM-004e | Calling `complete_json` with an unregistered schema raises a descriptive error (must name the schema) |
| LLM-SEAM-004f | Old `complete()` method is NOT present on `FakeLlmProvider` |
| LLM-SEAM-004g | Dependency direction: `fake.py` imports nothing from any `modules/*` package (ADR-05 rule 3 verified) |

##### Scenario: Registered schema returns typed instance

- **GIVEN** `provider = FakeLlmProvider()`
- **AND** `provider.register(TestSchema, {"name": "Gandalf", "level": 20})`
- **WHEN** `result = await provider.complete_json("Any prompt", TestSchema)`
- **THEN** `result` is an instance of `TestSchema` with `result.name == "Gandalf"` and `result.level == 20`

##### Scenario: Fake validates through the guard — catches schema mismatch

- **GIVEN** `provider.register(TestSchema, {"name": "Gandalf", "level": "not_a_number"})`
- **WHEN** `await provider.complete_json("prompt", TestSchema)`
- **THEN** `LlmOutputValidationError` is raised (the fixture was serialized to JSON, parsed, and Pydantic rejected the wrong type for `level`)

##### Scenario: Fence-wrapped fixture still validates — guard runs on fake path

- **GIVEN** The fake is configured so a specific schema's fixture payload is stored as a JSON string wrapped in ` ```json ``` ` fences (simulating what a real LLM might return)
- **WHEN** `await provider.complete_json("prompt", FencedTestSchema)`
- **THEN** A validated instance is returned — the `parse_llm_json` function's fence-strip logic executed and succeeded

##### Scenario: Unregistered schema raises descriptive error

- **GIVEN** `provider = FakeLlmProvider()` with no schemas registered
- **WHEN** `await provider.complete_json("prompt", UnregisteredSchema)`
- **THEN** An error is raised that includes the name of `UnregisteredSchema` in its message

##### Scenario: Old complete() is gone

- **GIVEN** `provider = FakeLlmProvider()`
- **WHEN** `hasattr(provider, "complete")` is checked
- **THEN** the result is `False` — `complete()` was fully removed, not aliased

---

### Non-Functional Requirements (shared across capabilities)

#### LLM-SEAM-006: Determinism — fake stays CI oracle

The `FakeLlmProvider` MUST be deterministic: the same registered `(schema, payload)` pair
MUST always produce the same `complete_json` result. No randomness, no clock dependency, no
network call. This is a hard requirement because the fake is the CI/unit oracle per
`docs/08-quality-strategy.md`.

| Test ID | Pass/Fail condition |
|---------|---------------------|
| LLM-SEAM-006a | 100 invocations of `complete_json` with the same `(prompt, schema)` return identical (value-equal) instances |
| LLM-SEAM-006b | No `httpx`, `socket`, `asyncio.sleep`, or `random` imports in `fake.py` |

#### LLM-SEAM-007: ADR-05 dependency direction

No file under `services/api/app/shared/llm/` (kernel) MUST import from any
`services/api/app/modules/*/` package (modules). Dependency direction is
module → shared, never shared → module (ADR-05 rule 3). This is verified by LLM-SEAM-004g.

---

## Capability: openai-compatible-provider

### Purpose

Implement a single `httpx.AsyncClient`-based `LlmProvider` adapter configurable by
`base_url`/`api_key`/`model`, driven by a provider registry that resolves the active
provider from the `LLM_PROVIDER` environment variable. This adapter seeds the production
`OpenRouterProvider` (not throwaway). It runs only under the opt-in dev-inference marker
(LLM-SEAM-008); it must NOT be injected into any production FastAPI route or dependency in
this change.

### Reference: Design Decision 4

---

### Requirements

#### LLM-SEAM-005: Single OpenAI-compatible adapter + provider registry

**Module: `services/api/app/shared/llm/providers/openai_compatible.py`**

MUST expose a class:

```python
class OpenAiCompatibleProvider:
    def __init__(self, base_url: str, api_key: str, model: str, *, http_client: httpx.AsyncClient | None = None) -> None: ...
    async def complete_text(self, prompt: str) -> str: ...
    async def complete_json(self, prompt: str, schema: type[T]) -> T: ...
```

This class MUST:

- Accept `base_url`, `api_key`, `model` as required constructor arguments.
- Accept an optional `http_client: httpx.AsyncClient | None` for testability (mocked transport) — if `None`, construct a default `httpx.AsyncClient` internally.
- `complete_text` MUST POST `{base_url}/chat/completions` with `Authorization: Bearer {api_key}` and an OpenAI chat-completions-compatible JSON body. Extract and return the message content string.
- `complete_json` MUST call `complete_text` internally, then route the raw model output through `parse_llm_json(raw, schema)` — identical validation path to the fake. Never bypass the guard.
- Use ONLY `httpx` for HTTP (already a project dependency, `httpx>=0.28.0`). Do NOT add the `openai` package.
- Log request metadata (provider, model, prompt length) but NEVER log the full prompt or campaign content (per `docs/05` production rule).

| Test ID | Pass/Fail condition |
|---------|---------------------|
| LLM-SEAM-005a | `complete_text("hello")` with mock `httpx.MockTransport` returning `{"choices":[{"message":{"content":"world"}}]}` returns `"world"` — no network |
| LLM-SEAM-005b | Mock transport returns JSON-wrapped output with fences; `complete_json` strips fences and validates through `parse_llm_json` — returns typed instance |
| LLM-SEAM-005c | Mock transport returns invalid JSON; `complete_json` raises `LlmOutputValidationError(retryable=True)` |
| LLM-SEAM-005d | Mock transport returns valid JSON that fails Pydantic schema; `complete_json` raises `LlmOutputValidationError(retryable=True)` |
| LLM-SEAM-005e | Constructor with `http_client` uses it instead of creating a new client |
| LLM-SEAM-005f | `httpx` is the only HTTP dependency — no `openai` package import |

##### Scenario: text completion via mocked httpx

- **GIVEN** `httpx.MockTransport` returns `{"choices": [{"message": {"content": "response text"}}]}`
- **WHEN** `await provider.complete_text("hello")` is called
- **THEN** the return value is `"response text"` — no network, no live endpoint

##### Scenario: JSON completion routes through parse_llm_json

- **GIVEN** `httpx.MockTransport` returns `'```json\n{"name": "Gandalf", "level": 20}\n```'`
- **WHEN** `await provider.complete_json("prompt", TestSchema)` is called
- **THEN** a validated `TestSchema(name="Gandalf", level=20)` is returned — fence-strip ran through `parse_llm_json`

##### Scenario: Invalid JSON from model raises

- **GIVEN** `httpx.MockTransport` returns `"not json at all"`
- **WHEN** `await provider.complete_json("prompt", TestSchema)` is called
- **THEN** `LlmOutputValidationError` is raised with `retryable=True`

##### Scenario: Schema mismatch from model raises

- **GIVEN** `httpx.MockTransport` returns `'{"name": "Gandalf", "level": "oops"}'`
- **WHEN** `await provider.complete_json("prompt", TestSchema)` is called
- **THEN** `LlmOutputValidationError` is raised — Pydantic rejected `level: "oops"`

---

#### LLM-SEAM-008: Provider registry + `build_provider` factory

**Module: `services/api/app/shared/llm/providers/registry.py`**

MUST expose:

```python
PROVIDERS: dict[str, dict[str, str]]
# name → {base_url, api_key_env, model}
# Entries per proposal Approach §3:
#   "gemini"     → https://generativelanguage.googleapis.com/v1beta/openai/  | GEMINI_API_KEY     | gemini-2.5-flash
#   "groq"       → https://api.groq.com/openai/v1                             | GROQ_API_KEY       | qwen/qwen3-32b
#   "cerebras"   → https://api.cerebras.ai/v1                                 | CEREBRAS_API_KEY   | gpt-oss-120b
#   "openrouter" → https://openrouter.ai/api/v1                               | OPENROUTER_API_KEY | openrouter/free

def build_provider() -> LlmProvider: ...
```

This MUST:

- **`PROVIDERS`** — a `dict[str, dict[str, str]]` with exactly the four entries above (Gemini, Groq, Cerebras, OpenRouter). Each entry maps to `{base_url, api_key_env, model}`. All four are OpenAI-compatible (`/chat/completions`), so a single adapter class covers all.
- **`build_provider()`** — reads `LLM_PROVIDER` from env (already declared in `config.py::Settings.llm_provider`). Looks up the entry in `PROVIDERS`. Reads the provider's API key from the env var named by `api_key_env`. Constructs and returns `OpenAiCompatibleProvider(base_url, api_key, model)`.
- **Fail-loud on missing key** — if the resolved provider's `api_key_env` is not set (empty string or not present), `build_provider()` MUST raise a descriptive error (`ValueError` or custom). This is a production-construction safety invariant (Design Decision 4).
- **Note on `config.py`** — the existing `Settings.llm_provider` defaults to `"fake"`. The `build_provider` factory and `registry.py` are additive; the config module does not need modification for Track A.

| Test ID | Pass/Fail condition |
|---------|---------------------|
| LLM-SEAM-008a | `PROVIDERS` dict contains exactly four keys: `"gemini"`, `"groq"`, `"cerebras"`, `"openrouter"` |
| LLM-SEAM-008b | Each provider entry has `base_url`, `api_key_env`, and `model` |
| LLM-SEAM-008c | `build_provider()` with `LLM_PROVIDER=gemini` and `GEMINI_API_KEY` set returns `OpenAiCompatibleProvider` with correct `base_url`/`model` |
| LLM-SEAM-008d | `build_provider()` with `LLM_PROVIDER=gemini` and `GEMINI_API_KEY` missing raises descriptive error |
| LLM-SEAM-008e | All four provider base_urls end with `/v1` or `/openai/` — openai-compatible path |
| LLM-SEAM-008f | Registry module imports from `shared/llm/providers/openai_compatible.py` — does NOT import from `modules/*` |

##### Scenario: Successful provider construction

- **GIVEN** `os.environ["LLM_PROVIDER"] = "groq"` and `os.environ["GROQ_API_KEY"] = "test-key"`
- **WHEN** `provider = build_provider()`
- **THEN** `provider` is an instance of `OpenAiCompatibleProvider` configured with `base_url="https://api.groq.com/openai/v1"`, `api_key="test-key"`, `model="qwen/qwen3-32b"`

##### Scenario: Missing API key fails loudly

- **GIVEN** `os.environ["LLM_PROVIDER"] = "gemini"` and `GEMINI_API_KEY` is NOT set (or empty)
- **WHEN** `build_provider()` is called
- **THEN** a `ValueError` (or descriptive error) is raised mentioning `GEMINI_API_KEY`

##### Scenario: Unknown provider name fails

- **GIVEN** `os.environ["LLM_PROVIDER"] = "nonexistent"`
- **WHEN** `build_provider()` is called
- **THEN** an error is raised — unknown provider names are rejected

---

### Non-Functional Requirements (shared across capabilities)

#### LLM-SEAM-009: Security — no committed secrets

No API key, token, or secret MUST appear in any file under `services/api/app/shared/llm/`,
in any test fixture, or in any committed configuration. The `.env.example` file MUST be
updated (during apply phase) to document the four key names (`GEMINI_API_KEY`,
`GROQ_API_KEY`, `CEREBRAS_API_KEY`, `OPENROUTER_API_KEY`) with empty or placeholder values.
Real keys reside in `.env` (gitignored).

| Test ID | Pass/Fail condition |
|---------|---------------------|
| LLM-SEAM-009a | `grep -r "AIza\|sk-\|gsk_\|csk_\|sk-or-\|Bearer" services/api/app/shared/llm/` returns zero matches for real-looking keys |
| LLM-SEAM-009b | Test fixtures that configure `OpenAiCompatibleProvider` use fake key strings (e.g., `"test-key"`, `"fake-key"`) |

---

## Capability: dev-inference-lane

### Purpose

Provide an opt-in, non-CI pytest lane tagged `@pytest.mark.dev_inference` that drives
the real `OpenAiCompatibleProvider` against free-tier endpoints for prompt/JSON-contract
validation only. This lane is advisory, never blocking. It is excluded from the default CI
run and auto-skips when provider API keys are absent.

### Reference: Design Decision 5

---

### Requirements

#### LLM-SEAM-010: Dev-inference lane — opt-in marker, non-CI

MUST include:

- **Pytest marker registration** in `services/api/pyproject.toml` under `[tool.pytest.ini_options]`:
  ```
  markers = ["dev_inference: opt-in real-LLM prompt/JSON-contract validation; excluded from default CI"]
  ```
  (Added to the existing `[tool.pytest.ini_options]` table which currently has `asyncio_mode`, `pythonpath`, and `testpaths`.)

- **A test module** under `services/api/tests/dev_inference/` (new directory) containing at least:
  - One test marked `@pytest.mark.dev_inference` that constructs a real `OpenAiCompatibleProvider` (reading `LLM_PROVIDER` + key from env), sends a minimal prompt, and asserts the response is a non-empty string.
  - **Skip-on-missing-key:** each test MUST call `pytest.skip()` when the provider's `api_key_env` is absent (belt + suspenders with the marker exclusion — Design Decision 5).

- **CI exclusion:** in the apply phase, the backend test step adds `-m "not dev_inference"`. If CI config does not exist yet (no `.github/workflows/ci.yml`), the apply phase creates it; if it does, it modifies the backend test command.

- **What the lane proves (Track A scope):** basic HTTP roundtrip — the adapter reaches a real endpoint and returns text. Full prompt-template iteration (four Jinja templates, context-ceiling measurement) is a Block 5–9 concern; Track A only validates the mechanism.

| Test ID | Pass/Fail condition |
|---------|---------------------|
| LLM-SEAM-010a | `pyproject.toml` registers `dev_inference` marker under `[tool.pytest.ini_options].markers` |
| LLM-SEAM-010b | `uv run pytest -m "not dev_inference"` does NOT run dev-inference tests |
| LLM-SEAM-010c | `uv run pytest -m "dev_inference"` runs dev-inference tests (when marker is selected) |
| LLM-SEAM-010d | Dev-inference test `pytest.skip`s when its provider's `api_key_env` is not set |
| LLM-SEAM-010e | `ruff check` passes on all dev-inference test files |
| LLM-SEAM-010f | No API key or credential is hardcoded in dev-inference test files |

##### Scenario: Dev-inference test skips without key

- **GIVEN** `LLM_PROVIDER=gemini` and `GEMINI_API_KEY` is NOT set in the environment
- **WHEN** `uv run pytest -m dev_inference` is executed
- **THEN** the dev-inference test is SKIPPED (not FAILED) with a skip reason mentioning the missing env var

##### Scenario: Dev-inference test runs with key

- **GIVEN** `LLM_PROVIDER=gemini` and `GEMINI_API_KEY` is set to a valid key
- **WHEN** `uv run pytest -m dev_inference` is executed
- **THEN** the test contacts the Gemini endpoint, receives a non-empty response, and PASSES

##### Scenario: Dev-inference excluded from default run

- **GIVEN** the `pyproject.toml` marker is registered and test is marked
- **WHEN** `uv run pytest -m "not dev_inference"` is executed
- **THEN** zero dev-inference tests are collected or executed

---

## File Impact Summary (Track A)

| File | Action | Requirement(s) |
|------|--------|----------------|
| `services/api/app/shared/llm/json_guard.py` | **Create** | LLM-SEAM-001 |
| `services/api/app/shared/llm/errors.py` | **Create** | LLM-SEAM-002 |
| `services/api/app/shared/llm/port.py` | **Modify** — `complete()` → `complete_text()` + `complete_json()` | LLM-SEAM-003 |
| `services/api/app/shared/llm/providers/fake.py` | **Modify** — static `{"fake": true}` → generic `register()` + guard path | LLM-SEAM-004 |
| `services/api/app/shared/llm/providers/openai_compatible.py` | **Create** | LLM-SEAM-005, LLM-SEAM-008 |
| `services/api/app/shared/llm/providers/registry.py` | **Create** | LLM-SEAM-008 |
| `services/api/tests/dev_inference/` | **Create** (new directory + test module) | LLM-SEAM-010 |
| `services/api/tests/test_fake_llm.py` | **Modify** — update `complete()` calls to `complete_text()`/`complete_json()`; add guard-path test | LLM-SEAM-003, LLM-SEAM-004 |
| `services/api/pyproject.toml` | **Modify** — add `dev_inference` marker | LLM-SEAM-010 |
| `.env.example` | **Modify** — add Gemini/Groq/Cerebras key names + `LLM_PROVIDER` docs | LLM-SEAM-009 |
| `.github/workflows/ci.yml` | **Modify or create** — add `-m "not dev_inference"` | LLM-SEAM-010 (apply phase) |

**No files under `services/api/app/modules/` are touched.** ADR-05 boundary: kernel enriched, module zero-impact until blocks 5–9 consume it.

**No files under `docs/` are edited in this phase.** Documentation enrichment (proposal § Docs Enrichment Plan) is deferred to apply phase per Design Decision 6.

---

## Design Decision Cross-Reference

| Requirement | Design Decision | Rationale |
|-------------|----------------|-----------|
| LLM-SEAM-001 | Decision 1 | Single `parse_llm_json` — both fake and adapter converge here |
| LLM-SEAM-002 | Decision 2 | Typed `LlmOutputValidationError` gives frontend "clear retryable error" |
| LLM-SEAM-004 | Decision 3 | Generic `register()` — ADR-05-clean dependency direction |
| LLM-SEAM-005, LLM-SEAM-008 | Decision 4 | Single `httpx` adapter for all four OpenAI-compatible providers — seeds OpenRouter |
| LLM-SEAM-010 | Decision 5 | `@pytest.mark.dev_inference` + CI exclusion + skip-on-missing-key |
| LLM-SEAM-003 | ADR-03 / `docs/05` verbatim | Port catches up to documented signature — no architectural change |

---

## Testing Strategy (Strict TDD — red→green order)

| Order | Unit | Test-first (red) | Green |
|-------|------|------------------|-------|
| 1 | `parse_llm_json` | LLM-SEAM-001a–g scenarios | Implement `json_guard.py` + `errors.py` |
| 2 | Port signature | LLM-SEAM-003a–c — Protocol defines both methods, old `complete()` gone | Rename/extend `port.py` |
| 3 | Fixture fake | LLM-SEAM-004a–g scenarios (register, validate, detect unregistered) | Generic fake + `register()` routing through guard |
| 4 | OpenAI-compatible adapter | LLM-SEAM-005a–f mocked httpx tests — no network | `openai_compatible.py` + `registry.py` |
| 5 | Dev-inference lane | LLM-SEAM-010a–f — marker registered, skip-on-missing-key, CI exclusion | Lane + marker + updated CI |

All unit/CI tests are deterministic and network-free. Only the marked dev-inference lane touches
a real endpoint, and only when a key is present and the marker is explicitly selected.

---

## Acceptance Criteria (strategy + Track A)

- [ ] `parse_llm_json` strips fences/prose and validates through Pydantic for all scenarios (LLM-SEAM-001a–g).
- [ ] `LlmOutputValidationError` carries `schema_name`, `raw_output`, `retryable=True`, with `__cause__` preserved (LLM-SEAM-002a–e).
- [ ] `LlmProvider` Protocol exposes `complete_text` + `complete_json`; old `complete()` removed (LLM-SEAM-003a–e).
- [ ] `FakeLlmProvider.register()` populates a type→fixture map; `complete_json` routes through `parse_llm_json` (LLM-SEAM-004a–g).
- [ ] Fence-strip is proven on the fake path — at least one test wraps fixture in code fences (LLM-SEAM-004d).
- [ ] `OpenAiCompatibleProvider` + `build_provider()` implemented behind the port; mock-based unit tests pass (LLM-SEAM-005a–f, LLM-SEAM-008a–f).
- [ ] Provider registry contains all four entries; missing key fails loudly (LLM-SEAM-008c–e).
- [ ] Dev-inference lane is registered, excluded from default CI, and skip-on-missing-key works (LLM-SEAM-010a–f).
- [ ] No API key committed; `.env.example` documents the four key names (LLM-SEAM-009a–b).
- [ ] All existing tests pass after port enrichment (`test_fake_llm.py` updated for new signature).
- [ ] `ruff check` passes on all new and modified Python files.
- [ ] Dependency direction verified: no `shared/llm/` file imports from any `modules/*` package.
