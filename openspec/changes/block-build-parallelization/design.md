# Design: LLM Seam Enrichment (Block 5 prerequisite)

## Technical Approach

Track A enriches the existing `shared/llm/` kernel (ADR-05 rule 3) without touching any module
boundary. Four ordered, Strict-TDD (red→green) units, each additive:

1. **Shared JSON guard** — one `parse_llm_json(raw, schema) -> T` helper (fence-strip + Pydantic)
   that BOTH the fake and the real adapter call. This is the single "real validation path".
2. **Enriched port** — `complete(prompt) -> str` becomes `complete_text(prompt) -> str` +
   `complete_json(prompt, schema: type[T]) -> T`, matching ADR-03 / `docs/05` verbatim.
3. **Per-schema fixture fake** — generic fake with a registration API; emits its fixture as a
   JSON string and routes it through `parse_llm_json`, so use-case tests hit real validation.
4. **Single OpenAI-compatible adapter + provider registry** — one `httpx.AsyncClient` adapter
   configurable by `base_url`/`api_key`/`model`, selected via `LLM_PROVIDER`. It seeds the
   production `OpenRouterProvider`. Exercised only by the opt-in, non-CI dev-inference lane.

No production wiring is introduced. The fake stays the deterministic CI/unit oracle; the real
adapter runs only under an opt-in pytest marker excluded from the default CI run.

## Scope refinement (decide on the page, not implicit)

**Track A ships the seam, not the four domain schemas.** The four output schemas
(`ExtractCampaignOutput`, `CampaignSummaryOutput`, `MemorySuggestionsOutput`,
`GeneratedSessionOutput`) do **not** exist in code today (verified: no `BaseModel` subclass under
`services/api/app`), and no use case consumes them yet. Authoring all four now is Block 5–9 domain
work and would violate AGENTS.md's anti-speculation rule (build only current-spec features).

Therefore the proposal's "per-schema fixtures for all four output schemas" is refined to: **the
fixture mechanism supports all four; each owning block registers its real schema + fixture when it
lands.** Track A proves the mechanism with the guard's own tests plus one representative in-test
schema/fixture. This mirrors the proposal's own Ollama→registry refinement pattern and is carried
as an explicit risk line below — not a silent scope cut.

## Architecture Decisions

### Decision 1 — Where fence-strip + Pydantic validation lives (the "real path")

| Option | Tradeoff | Decision |
|--------|----------|----------|
| One shared helper `shared/llm/json_guard.py: parse_llm_json(raw, schema) -> T`, called by BOTH fake and adapter | Single source of truth; fake and prod validate identically; satisfies `docs/05` "JSON guard" + "JSON validation" in one place | **Chosen** |
| Validation in the Protocol default | `Protocol` cannot carry shared implementation cleanly; forces a base class | Rejected |
| Duplicated per adapter | Fake and real adapter drift; fake could pass what prod rejects | Rejected |

**Critical invariant:** the fake MUST serialize its fixture to a JSON string and pass it through
`parse_llm_json` — NOT return `schema.model_validate(dict)` directly. If it bypasses the guard,
the "use-case tests hit the real validation path" claim is false and the fixture-fake's entire
justification collapses. At least one fake test wraps the fixture in Markdown code fences to prove
the guard's fence-strip runs on the fake path too.

`parse_llm_json` responsibilities: strip ```` ```json ```` / ```` ``` ```` fences and surrounding
prose, `json.loads`, then `schema.model_validate(...)`. It never silently accepts semantically
invalid data (`docs/05` "JSON guard" rule).

### Decision 2 — Typed validation-error contract

| Option | Tradeoff | Decision |
|--------|----------|----------|
| `LlmOutputValidationError` in `shared/llm/errors.py`, carrying `schema_name`, `raw_output`, Pydantic `cause`, `retryable=True` | Gives the frontend the "clear retryable error" `docs/05` mandates; typed, catchable at the use-case boundary; keeps raw output for logging (never persisted) | **Chosen** |
| Let `pydantic.ValidationError` / `json.JSONDecodeError` propagate raw | Leaks parser internals; no retryable flag; each caller re-wraps | Rejected |

`parse_llm_json` catches `json.JSONDecodeError` and `pydantic.ValidationError` and re-raises
`LlmOutputValidationError`. Trace metadata (`docs/05` "Trace metadata": `schema_version`,
`error_code`, request id) is logged at the raise site; full campaign content is NOT logged
(AGENTS.md / `docs/05` production rule).

### Decision 3 — Fixture fake mechanism (ADR-05-clean)

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Generic fake + registration API: `register(schema, payload)` populates `dict[type[BaseModel], dict]`; `complete_json` looks up, dumps to JSON, routes through `parse_llm_json` | Call direction is module→shared (correct per ADR-05 rule 3); no shared→module import; app-wide default fake reusable across modules | **Chosen** |
| Hardcode the four schemas inside `shared/llm/providers/fake.py` | Forces `shared/` to import `modules/*/schemas.py` — **inverts** the dependency, violates ADR-05 rule 3 | Rejected |
| Per-test constructor injection only (`FakeLlmProvider({Schema: payload})`) | Stricter isolation but no shared default; more boilerplate per test | Rejected as primary (kept as allowed override) |

**Why this is the crux:** each output schema is module-owned (ADR-05 rule 2 —
`ExtractCampaignOutput`→campaigns, `CampaignSummaryOutput`→campaigns, `MemorySuggestionsOutput`→
memory, `GeneratedSessionOutput`→generation). The kernel must never import them. Registration
inverts the dependency the correct way: a module (or its conftest/fixtures) calls
`fake.register(MySchema, {...})`; the kernel stays schema-agnostic. `complete_text` returns a
static deterministic string; `complete_json` raises a clear error if a schema was never registered.

### Decision 4 — Single OpenAI-compatible adapter + provider registry

| Concern | Decision |
|---------|----------|
| HTTP client | Reuse **`httpx.AsyncClient`** (already a dependency, `httpx>=0.28.0`). Do NOT add the `openai` package. POST `{base_url}/chat/completions` with `Authorization: Bearer {key}`, OpenAI chat-completions body. |
| One adapter for all four providers | All of Gemini/Groq/Cerebras/OpenRouter expose OpenAI-compatible `/chat/completions`, so a single `OpenAiCompatibleProvider(base_url, api_key, model)` covers all. This class is the **seed of the production `OpenRouterProvider`** — not throwaway. |
| Provider registry | `PROVIDERS` dict keyed by name → `{base_url, api_key_env, model}` (Gemini/Groq/Cerebras/OpenRouter, values per proposal Approach §3). |
| Active provider selection | Resolved from `LLM_PROVIDER` env (ADR-03 already mandates this variable) → registry entry → `base_url`/`model` + key read from that entry's `api_key_env`. |
| Missing API key | **Fail loudly.** Production construction raises on a missing key. The dev-inference lane instead `pytest.skip`s when the key env is absent (see Decision 5) — a keyless dev or CI never errors on it. |
| `complete_json` on the adapter | Sends the prompt, receives text, routes the raw model output through the SAME `parse_llm_json(raw, schema)` helper — identical validation path to the fake. |

### Decision 5 — Dev-inference lane wiring (opt-in marker, excluded from CI)

| Concern | Decision |
|---------|----------|
| Marker home | `@pytest.mark.dev_inference`, registered in `services/api/pyproject.toml` `[tool.pytest.ini_options] markers = ["dev_inference: opt-in real-LLM prompt/JSON-contract validation; excluded from default CI"]` (prevents Ruff/pytest unknown-marker warnings). |
| CI exclusion | Change the backend test step in `.github/workflows/ci.yml` (currently `uv run pytest`) to **`uv run pytest -m "not dev_inference"`**. Edit lands in the apply phase; specified here. |
| Belt + suspenders | Even if the marker filter is dropped, each dev-inference test `pytest.skip`s when its provider's `api_key_env` is absent — CI (no keys) and keyless devs are safe two ways. |
| What it does | Iterates the four Jinja prompt templates against a real model via the adapter; asserts fence-strip, Pydantic success/failure paths, and Block 8's ~2,000-token context ceiling. Advisory, never blocking. |
| Secrets | Keys only in gitignored `.env`; `.env.example` documents the four key **names** only. No committed values; no key ever required in CI. |

### Decision 6 — ADR-03 amendment plan (edit deferred to apply phase)

Amend ADR-03 **in place** (question-round decision #2 — no new ADR). Add a **Supersession note**
under the existing Decision/Implementations list stating:

- The local-dev implementation changes from `OllamaProvider` to a **single OpenAI-compatible
  adapter driven by a free-tier provider registry** (`LLM_PROVIDER` selects Gemini/Groq/Cerebras/
  OpenRouter).
- The architectural decision itself (provider `Protocol` abstraction + `complete_text`/
  `complete_json` + Pydantic-validated outputs) is **unchanged**.
- This adapter **seeds the production `OpenRouterProvider`** — the seam Block 5 needs is built
  ahead, not rebuilt.
- `FakeLlmProvider` remains the deterministic test oracle; the real adapter runs only under the
  opt-in dev-inference lane.

The actual ADR-03 text edit and all `docs/*` enrichment happen in the apply phase, not now.

## Data Flow

    use case ──complete_json(prompt, schema)──┐
                                              ├─► FakeLlmProvider ─ register(schema)→dump JSON ─┐
                                              │                                                ├─► parse_llm_json(raw, schema) ─► T  (or LlmOutputValidationError)
                                              └─► OpenAiCompatibleProvider ─ httpx POST /chat/completions ─ raw text ─┘
                                                        ▲
                                              LLM_PROVIDER ─► PROVIDERS[name] ─► base_url/model + api_key_env

Both providers converge on the SINGLE `parse_llm_json` guard — that convergence is the design's
load-bearing property.

## File Changes (Track A)

| File | Action | Description |
|------|--------|-------------|
| `services/api/app/shared/llm/json_guard.py` | Create | `parse_llm_json(raw, schema) -> T` — fence-strip + Pydantic; the single validation path |
| `services/api/app/shared/llm/errors.py` | Create | `LlmOutputValidationError` (schema_name, raw_output, cause, retryable) |
| `services/api/app/shared/llm/port.py` | Modify | `complete` → `complete_text` + `complete_json(prompt, schema: type[T]) -> T` (TypeVar per ADR-03) |
| `services/api/app/shared/llm/providers/fake.py` | Modify | Generic fixture fake + `register(schema, payload)`; routes through `parse_llm_json` |
| `services/api/app/shared/llm/providers/openai_compatible.py` | Create | Single OpenAI-compatible adapter (httpx) — seeds `OpenRouterProvider` |
| `services/api/app/shared/llm/providers/registry.py` | Create | `PROVIDERS` dict + `LLM_PROVIDER`-based selection; fail-loud on missing key |
| `services/api/tests/dev_inference/` (new) | Create | Opt-in `@pytest.mark.dev_inference` lane; skip-on-missing-key |
| `services/api/pyproject.toml` | Modify | Register `dev_inference` marker under `[tool.pytest.ini_options]` |
| `.github/workflows/ci.yml` | Modify | Backend test step → `uv run pytest -m "not dev_inference"` |
| `.env.example` | Modify | Document `GEMINI_API_KEY` / `GROQ_API_KEY` / `CEREBRAS_API_KEY` / `OPENROUTER_API_KEY` (names only) + `LLM_PROVIDER` |
| `docs/*`, ADR-03 | Apply phase | Per proposal Docs Enrichment Plan (see mapping below) — not edited in this phase |

New file locations are all inside `shared/llm/`; no `modules/*` file changes — ADR-05 boundary
untouched.

## Interfaces / Contracts

```python
# app/shared/llm/port.py  (verbatim with ADR-03 / docs/05)
from typing import Protocol, TypeVar
from pydantic import BaseModel

T = TypeVar("T", bound=BaseModel)

class LlmProvider(Protocol):
    async def complete_text(self, prompt: str) -> str: ...
    async def complete_json(self, prompt: str, schema: type[T]) -> T: ...
```
```python
# app/shared/llm/json_guard.py
def parse_llm_json(raw: str, schema: type[T]) -> T: ...  # fence-strip + validate; raises LlmOutputValidationError

# app/shared/llm/errors.py
class LlmOutputValidationError(Exception):
    schema_name: str; raw_output: str; retryable: bool = True  # __cause__ = pydantic/json error

# app/shared/llm/providers/fake.py
class FakeLlmProvider:
    def register(self, schema: type[BaseModel], payload: dict) -> None: ...  # module→shared (ADR-05-clean)

# app/shared/llm/providers/registry.py
PROVIDERS: dict[str, dict]  # name -> {base_url, api_key_env, model}
def build_provider() -> LlmProvider: ...  # reads LLM_PROVIDER; fail-loud on missing key
```

## Docs Enrichment Mapping (design-level nature; edits in apply phase)

| Doc | Text-change nature (design-level) |
|-----|-----------------------------------|
| `docs/10-roadmap.md` | One clarifying note near line 3 separating **delivery order** from **build order**. Not a block rewrite. |
| `docs/04-architecture.md` (AI section) | Add `complete_text`/`complete_json(prompt, schema)` signature; replace "Optional Ollama provider" (line 44) with the OpenAI-compatible adapter + provider registry. |
| `docs/04-architecture.md` (frontend org) | **No touch** — container/presentational deferred (question-round decision #1). |
| `docs/05-ai-system.md` | Small note near JSON validation/guard documenting the opt-in non-CI prompt-validation lane. Signature already present — no signature edit. |
| `docs/08-quality-strategy.md` | Small note: `FakeLlmProvider` = deterministic CI oracle (per-schema fixtures) + opt-in non-CI lane excluded from default run. |
| ADR-03 | In-place supersession note (Decision 6 above). Not a new ADR. |
| ADR-05 | **No touch** — adapter slots into `shared/llm/`; no boundary change. |
| `docs/06-api-contracts.md` | **No touch** — internal seam, no endpoint contract changes. |

## Testing Strategy (Strict TDD — red→green order)

| Order | Unit | Test-first (red) | Green |
|-------|------|------------------|-------|
| 1 | `parse_llm_json` | fence-wrapped JSON validates; prose-wrapped validates; invalid JSON → `LlmOutputValidationError(retryable=True)`; schema mismatch → same | Implement guard + error |
| 2 | Port signature | use case calls `complete_json(prompt, TestSchema)` and gets a typed instance | Rename/extend port |
| 3 | Fixture fake | register `TestSchema`; `complete_json` returns validated instance; **fence-wrapped fixture** still passes (proves guard runs on fake path); unregistered schema raises | Generic fake + `register` |
| 4 | OpenAI-compatible adapter | httpx call mocked (`httpx.MockTransport`) — no network; raw model text routed through `parse_llm_json`; missing key → fail-loud | Adapter + registry |
| 5 | Dev-inference lane | `@pytest.mark.dev_inference`; asserts it is skipped when key env absent; excluded by `-m "not dev_inference"` | Lane + marker registration |

All unit/CI tests are deterministic and network-free. Only the marked dev-inference lane touches a
real endpoint, and only when a key is present and the marker is explicitly selected.

## Migration / Rollout

Additive to `shared/llm/` plus one opt-in lane. No production wiring, so zero runtime blast radius.
Rollback = git revert; reverting the adapter/lane leaves the enriched port + guard + fixture fake
intact (net improvements the delivery blocks need regardless).

## Open Questions

- Non-blocking: confirm each free-tier provider's exact `/chat/completions` request/response
  shape at apply time (Gemini's OpenAI-compat path differs slightly); the single-adapter design
  isolates any per-provider quirk to `PROVIDERS` config, not the port.
- Non-blocking: the representative in-test schema for Track A may be a throwaway `BaseModel`
  fixture; the four real schemas register when their blocks land (scope refinement above).
