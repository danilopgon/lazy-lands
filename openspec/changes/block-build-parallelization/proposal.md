# Proposal: LLM Seam Enrichment — Prerequisite for Block 5

> Formalizes the exploration `explore.md` (Engram #419) into an actionable change.
> **Refinement note:** the exploration's Phase 2 recommended an Ollama-based dev-inference
> lane. Per user direction this proposal **supersedes** that with an OpenAI-compatible
> free-tier provider registry behind a single adapter. This is a deliberate refinement,
> not a silent swap.

## Intent

Block 5 (campaign creation + AI onboarding) needs a working LLM pipeline with
`complete_json(prompt, schema)` and JSON output validation. Rather than building the
seam inside Block 5, this change delivers it ahead of time so Block 5 starts with a
tested, deterministic foundation.

This change enriches the `LlmProvider` Protocol, adds a shared JSON guard, replaces the
static fake with a per-schema fixture provider, and adds an OpenAI-compatible adapter
for prompt validation against real models — all without touching domain modules or
production wiring.

## Why before Block 5

Block 5's extraction pipeline needs `complete_json(prompt, schema) -> T` with reliable JSON
validation. Building the seam inside Block 5 would mix infrastructure work with domain logic.
Delivering it separately keeps Block 5 focused on the extraction prompt, use case, and endpoint.

## Scope

### In Scope

- **Enriched `LlmProvider` port** — `complete_text(prompt) -> str` plus
  `complete_json(prompt, schema: type[T]) -> T`. Matches the signature already documented
  in `docs/05-ai-system.md` and ADR-03.
- **Shared JSON guard** — `parse_llm_json(raw, schema) -> T` with fence-strip + Pydantic
  validation. Single validation path for all providers (fake and real).
- **Typed validation-error contract** — `LlmOutputValidationError` carrying `schema_name`,
  `raw_output`, Pydantic `cause`, `retryable=True`.
- **Per-schema fixture fake** — generic `register(schema, payload)` API replacing the static
  `{"fake": true}` response. Routes fixtures through `parse_llm_json` so tests hit the real
  validation path.
- **OpenAI-compatible adapter + provider registry** — single `httpx` adapter configurable
  by `base_url`/`api_key`/`model`. Gemini + Groq free tiers. Seeds the production
  `OpenRouterProvider` Block 5 will need.
- **Opt-in dev-inference lane** — `@pytest.mark.dev_inference` for prompt validation against
  real providers. Excluded from CI, auto-skips without API key.
- **Documentation** — ADR-03 amendment, architecture docs enrichment.

### Out of Scope

- **Domain output schemas** (`ExtractCampaignOutput`, etc.) — authored in their owning blocks.
- **Use cases, FastAPI routes, Supabase integration, production wiring** — Block 5 delivers these.
- **Manual production auth configuration** — owned by the user, tracked in
  `block-4-auth/supabase-dashboard-setup.md`.
- **RAG, embeddings, billing, multi-user** (AGENTS.md MVP rules).

## Capabilities

### New Capabilities

- `dev-inference-lane`: opt-in, non-CI pytest lane (or `services/api/scripts/`) driving the real
  provider abstraction against free OpenAI-compatible endpoints, for prompt/JSON-contract
  validation only. Excluded from the default CI run. No committed secrets.
- `openai-compatible-provider`: a single `LlmProvider` adapter with configurable
  `base_url`/`api_key`/`model`, driven by a provider registry (Gemini/Groq/Cerebras/OpenRouter).
  Seeds the production OpenRouter provider.

### Modified Capabilities

- `llm-port`: `complete(prompt) -> str` → `complete_text(prompt) -> str` +
  `complete_json(prompt, schema) -> T` (code catches up to ADR-03 / `docs/05`).
- `fake-llm-oracle`: static `{"fake": true}` → per-schema deterministic fixtures for the four
  output schemas.

## Approach

1. **Enrich the port** (`services/api/app/shared/llm/port.py`): add `complete_text` and
   `complete_json(prompt, schema: type[T]) -> T`. Failing test first.
2. **Per-schema fixture fake** (`services/api/app/shared/llm/providers/fake.py`): return
   schema-shaped fixtures keyed by the requested schema; parse+validate through Pydantic so
   use-case tests exercise the real validation path. This stays the CI/unit oracle.
3. **Single OpenAI-compatible adapter** behind the port. Provider registry, keys from env:

   ```python
   PROVIDERS = {
       "gemini": {"base_url": "https://generativelanguage.googleapis.com/v1beta/openai/", "api_key_env": "GEMINI_API_KEY", "model": "gemini-2.5-flash"},
       "groq":   {"base_url": "https://api.groq.com/openai/v1",                            "api_key_env": "GROQ_API_KEY",   "model": "qwen/qwen3-32b"},
   }
   ```

   Because both are OpenAI-compatible, one adapter (configurable base_url/api_key/model)
   covers both. This adapter seeds the production `OpenRouterProvider`.
4. **Opt-in dev-inference lane**: a pytest marker (`@pytest.mark.dev_inference`) excluded from
   CI. Validates prompts against a real model; auto-skips when API key is absent.
5. Keys in `.env` (gitignored), documented in `.env.example`. Never committed; never required
   in CI.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `services/api/app/shared/llm/port.py` | Modified | `complete` → `complete_text` + `complete_json` |
| `services/api/app/shared/llm/providers/fake.py` | Modified | Static fake → per-schema fixture oracle |
| `services/api/app/shared/llm/providers/openai_compatible.py` | New | Single OpenAI-compatible adapter (seeds OpenRouter) |
| `services/api/app/shared/llm/providers/registry.py` | New | Provider registry + `build_provider()` factory |
| `services/api/app/shared/llm/json_guard.py` | New | `parse_llm_json()` — fence-strip + Pydantic |
| `services/api/app/shared/llm/errors.py` | New | `LlmOutputValidationError` typed contract |
| `services/api/tests/dev_inference/` | New | Non-CI dev-inference prompt-validation lane |
| `.env.example` | Modified | Document `GEMINI_API_KEY` / `GROQ_API_KEY` |
| CI config | Modified | Default CI run excludes `dev_inference` marker |
| `docs/*`, ADR-03 | Modified | Enriched with new signatures and provider details |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Secret leakage | Low | Keys only in gitignored `.env`; `.env.example` documents names only. |
| Dev-inference lane accidentally required in CI | Low | Excluded from default run; no key present in CI. |
| "Why build inference infra off the critical path?" objection | — | The single adapter seeds the production OpenRouter provider (Block 5 needs it) — sunk cost becomes risk front-loading. |
| Strict TDD compromised by non-determinism | Low | Fake stays the deterministic oracle for all unit/CI tests; the real lane is a separate, non-blocking category. |

## Rollback Plan

Git revert. The change is additive to `shared/llm/` and a new opt-in lane; reverting the
adapter/lane leaves the enriched port + fixture fake intact (both are net improvements the
delivery blocks need anyway). No production wiring is introduced.

## Dependencies

- Already-written specs: `docs/03`, `05`, `06`, `07` (present).
- Strict TDD active (`strict_tdd: true`).
- Free-tier API keys obtainable by the user for the dev-inference lane (optional; lane is opt-in).

## Success Criteria

- [x] `LlmProvider` port exposes `complete_text` + `complete_json`; existing tests pass.
- [x] `FakeLlmProvider` with per-schema `register()` API; use-case tests validate through `parse_llm_json`.
- [x] Single OpenAI-compatible adapter + provider registry (Gemini + Groq) behind the port.
- [x] `build_provider()` returns `FakeLlmProvider` when `LLM_PROVIDER=fake`.
- [x] Dev-inference lane runs opt-in and is excluded from default CI; `ruff check` passes.
- [x] No API key committed; `.env.example` documents key names.
- [x] ADR-03 amended; architecture docs enriched.

## Resolved decisions (question round)

These decision gaps were resolved by the user on 2026-07-02.

1. **Container/presentational (doc-04 frontend section):** **Defer.** Do NOT document
   the split in this change. It is not enforced today (`apps/web/app/login/page.tsx` couples
   fetch+form+JSX); the convention will be documented when actually applied.
2. **ADR-03 vs. new ADR:** **Amend ADR-03 in place** with a supersession note. The architectural
   decision (LLM provider abstraction + JSON validation) is unchanged; only the suggested
   local-dev implementation changes (Ollama → free-tier OpenAI-compatible provider registry).
3. **Dev-inference lane home:** **Opt-in pytest marker** (`@pytest.mark.dev_inference`),
   excluded from default CI run via `-m "not dev_inference"`.
