# Proposal: Block Build Parallelization — Front-load Blocks 5–9 Risk Off the Critical Path

> Formalizes the exploration `explore.md` (Engram #419) into an actionable change.
> **Refinement note:** the exploration's Phase 2 recommended an Ollama-based dev-inference
> lane. Per user direction this proposal **supersedes** that with an OpenAI-compatible
> free-tier provider registry behind a single adapter (see Approach, Track A). This is a
> deliberate refinement, not a silent swap.

## Intent

With ~15 days of runway (today 2026-07-02, internal target 2026-07-17, deadline 2026-07-20),
the riskiest remaining work — prompt tuning and JSON-shape reliability for the four AI schemas,
plus screen construction and the PDF pipeline — sits inside the sequential Block 5→6→7→8→9
delivery order. This change formalizes running **parallel build tracks ahead of their delivery
blocks** so that each future block's hardest subtask is already green before it reaches the
thinnest-slack part of the calendar. It bundles three user-approved goals:

1. **Formalize the parallelization strategy** — separate the *delivery/integration DAG*
   (unchanged, demo-driven, sequential) from the *build DAG* (parallel tracks A/B/C; D done).
2. **Documentation enrichment** — record this decision in the docs where it belongs, so the
   TFM defense can explain why build-ahead is coherent with the roadmap.
3. **Track A implementation approach** — enrich the `LlmProvider` seam so prompts can be
   validated against a **real** model early, without breaking Strict TDD or CI determinism.

**Track A is the first slice to implement.** This change proposes the strategy and Track A
scope; Tracks B and C are subsequent slices under the same strategy.

## Two DAGs (the core distinction)

- **Delivery / integration DAG (UNCHANGED):** Block 5 (campaign + extraction) → Block 6
  (campaign view) → Block 7 (session registration + memory suggestions) → Block 8 (generation,
  needs `accumulated_summary` + active `MemoryFacts`) → Block 9 (PDF export, needs a generated
  session). This is real, demo-driven, and cannot be reordered. The demo script in
  `docs/09-tfm-delivery.md` depends on it.
- **Build DAG (PARALLEL):** construction work that depends only on already-written specs
  (`03-domain-model`, `05-ai-system`, `06-api-contracts`, `07-data-security-and-rls`),
  independent of a live Supabase session or a merged auth PR. Empirically shallower than the
  delivery DAG — Track D already proved horizontal build-ahead happened once without incident.

## Scope

### In Scope

- **Strategy record** — formalize the two-DAG model and the track inventory (below) as the
  governing plan for pre-Block-5 work.
- **Track A (AI/domain core) — first slice, this change's implementation focus:**
  - Enrich the `LlmProvider` port: `complete(prompt) -> str` becomes `complete_text(prompt) -> str`
    plus `complete_json(prompt, schema: type[T]) -> T`. This matches the signature already
    documented in `docs/05-ai-system.md` and ADR-03 — the port is catching up to the docs.
  - Replace the static `FakeLlmProvider` (`{"fake": true}`) with a **per-schema fixture
    provider**: the deterministic unit/CI oracle for the four output schemas
    (`ExtractCampaignOutput`, `CampaignSummaryOutput`, `MemorySuggestionsOutput`,
    `GeneratedSessionOutput`).
  - Add an **opt-in, non-CI dev-inference lane** driving the real provider abstraction against
    free/cheap OpenAI-compatible endpoints, for prompt/JSON-contract validation only.
  - A **single OpenAI-compatible adapter** (configurable `base_url`/`api_key`/`model`) behind
    the existing `LlmProvider` port, driven by a provider registry (Gemini/Groq/Cerebras/
    OpenRouter free tiers). This adapter **seeds the production OpenRouter provider** Block 5
    needs — it is not throwaway.
- **Documentation enrichment (scoped here, edited in later phases):** the specific one-line-nature
  touches enumerated in *Docs Enrichment Plan* below.
- **Track B (frontend presentational components) — later slice:** build the pending screens
  against typed mock data (`handoff/app/views-*.jsx` as visual reference, typed against
  `docs/03` + `docs/06` schemas, not handoff markup). Whether to formalize container/presentational
  is an open decision carried in the question round.
- **Track C (PDF export pipeline) — later, opportunistic slice:** build+test
  `GET /sessions/{id}/export.pdf` against a hand-built `GeneratedSessionOutput` fixture,
  satisfying the quality bar ("returns `application/pdf`") without DB/auth.
- **Track D (Supabase schema + RLS) — DONE, no build:** migration
  `20260628101707_initial_schema.sql` already creates all 6 tables + 5 enums + RLS on all 6 +
  24 policies. **Only remaining action:** write the RLS test suite (can start now).

### Out of Scope

- **Manual production auth configuration** — hosted Supabase dashboard, domain, Railway/Vercel
  env vars, Block 4 production smoke test. That is the gated runbook
  `openspec/changes/block-4-auth/supabase-dashboard-setup.md` (`READY_TO_EXECUTE: false`),
  owned by the user, tracked separately (Engram #422). This change does not touch it.
- **The delivery/demo order** — not changed.
- **RAG, embeddings, billing, multi-user** (AGENTS.md MVP rules). The dev-inference lane is for
  prompt/JSON-contract validation only, never a product feature.
- **Actual doc edits** — this phase only scopes them; edits land in later phases.
- **Committing any API key or making the dev-inference lane a CI dependency** — keys live in
  `.env` (gitignored) / documented in `.env.example`; the lane is excluded from the default CI run.

## Docs Enrichment Plan

For each candidate: does it need a touch, and the one-line nature of the change. Enumeration is
driven by doc-by-doc judgment, not a keyword grep (e.g. `docs/08` needs a touch but contains
none of the obvious terms).

| Doc | Touch? | Nature (one line) |
|---|---|---|
| `docs/10-roadmap.md` | **Yes** | Add a short clarifying note near line 3 ("Each block unlocks the next…") distinguishing **delivery order** (that line's real meaning) from **build order** (parallel tracks allowed). NOT a block-by-block rewrite. |
| `docs/04-architecture.md` — AI section | **Yes** | Add the `complete_text` / `complete_json(prompt, schema)` signature (currently only names "LLM Provider abstraction") and note the dev-inference **OpenAI-compatible adapter + provider registry**, superseding the vague "Optional Ollama provider" line. |
| `docs/04-architecture.md` — frontend component org | **Maybe (question round)** | If approved: one-line note introducing the container/presentational split for feature screens, tied to when Track B starts. Today it is NOT enforced (`apps/web/app/login/page.tsx` couples fetch+form+JSX). |
| `docs/05-ai-system.md` | **Yes (small)** | Add a short note documenting the opt-in, non-CI **prompt-validation lane** near JSON validation/guard. The `complete_json` signature is already present — no signature edit needed. |
| `docs/08-quality-strategy.md` | **Yes (small)** | Under AI testing, record `FakeLlmProvider` as the **deterministic CI oracle** (per-schema fixtures) plus the **opt-in non-CI prompt-validation lane** excluded from the default CI run. |
| ADR-03 (LLM provider abstraction) | **Yes (question round: amend vs. new ADR)** | Record the dev-inference **provider registry + single OpenAI-compatible adapter**, superseding ADR-03's `OllamaProvider` as the local-dev implementation, and note the adapter seeds the production `OpenRouterProvider`. |
| ADR-05 (modular monolith) | **No** | Adapter slots into the existing `shared/llm/` kernel; no boundary change. |
| `docs/06-api-contracts.md` | **No** | Verified: the doc defines HTTP endpoint contracts only; the `LlmProvider` port is an internal backend seam and is not referenced there, and Track A changes no endpoint contract. |

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

### Track A — first slice (Strict TDD, red→green)

1. **Enrich the port** (`services/api/app/shared/llm/port.py`): add `complete_text` and
   `complete_json(prompt, schema: type[T]) -> T`. Failing test first.
2. **Per-schema fixture fake** (`services/api/app/shared/llm/fake.py`): return schema-shaped
   fixtures keyed by the requested schema; parse+validate through Pydantic so use-case tests
   exercise the real validation path. This stays the CI/unit oracle.
3. **Single OpenAI-compatible adapter** behind the port. Provider registry, keys from env:

   ```python
   PROVIDERS = {
       "gemini":     {"base_url": "https://generativelanguage.googleapis.com/v1beta/openai/", "api_key_env": "GEMINI_API_KEY",     "model": "gemini-2.5-flash"},
       "groq":       {"base_url": "https://api.groq.com/openai/v1",                            "api_key_env": "GROQ_API_KEY",       "model": "qwen/qwen3-32b"},
       "cerebras":   {"base_url": "https://api.cerebras.ai/v1",                                "api_key_env": "CEREBRAS_API_KEY",   "model": "gpt-oss-120b"},
       "openrouter": {"base_url": "https://openrouter.ai/api/v1",                              "api_key_env": "OPENROUTER_API_KEY", "model": "openrouter/free"},
   }
   ```

   Because all four are OpenAI-compatible, one adapter (configurable base_url/api_key/model)
   covers all of them. This adapter is the seed of the production `OpenRouterProvider`.
4. **Opt-in dev-inference lane**: a pytest suite marked to exclude from default CI (or a
   standalone script under `services/api/scripts/`). Iterates the four Jinja prompt templates
   against a real model; validates fence-stripping in the JSON guard, Pydantic failure paths,
   and Block 8's ~2,000-token context ceiling. Advisory, not blocking.
5. Keys in `.env` (gitignored), documented in `.env.example`. Never committed; never required
   in CI.

### Track B — later slice

Introduce the pending screens against typed mock data; swap mock source for a TanStack Query
call through the existing `apps/web/lib/api.ts` `apiFetch` at integration. Whether to formalize
container/presentational is decided in the question round.

### Track C — later, opportunistic slice

Build+test the PDF endpoint against a `GeneratedSessionOutput` fixture. No DB/auth dependency.

### Track D — no build

Write the RLS test suite for the 24 existing policies. Can start now.

## Affected Areas (Track A scope)

| Area | Impact | Description |
|------|--------|-------------|
| `services/api/app/shared/llm/port.py` | Modified | `complete` → `complete_text` + `complete_json` |
| `services/api/app/shared/llm/fake.py` | Modified | Static fake → per-schema fixture oracle |
| `services/api/app/shared/llm/` (new adapter) | New | Single OpenAI-compatible provider + registry (seeds OpenRouter) |
| `services/api/scripts/` or opt-in pytest marker | New | Non-CI dev-inference prompt-validation lane |
| `.env.example` | Modified | Document `GEMINI_API_KEY` / `GROQ_API_KEY` / `CEREBRAS_API_KEY` / `OPENROUTER_API_KEY` (values never committed) |
| CI config | Verified | Default CI run excludes the dev-inference lane |
| `docs/*`, ADR-03 | Later phases | Per the Docs Enrichment Plan (not edited in this phase) |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Reviewer reads Ollama→registry as scope drift from the exploration | Medium | Refinement note at top states it is a deliberate, user-directed supersession of the exploration's Phase 2 Ollama lane. |
| Dev-inference lane accidentally required in CI | Low | Marked excluded from default run; no key present in CI; lane is advisory-only. |
| Secret leakage | Low | Keys only in gitignored `.env`; `.env.example` documents names only; no committed values. |
| Track B mock/API drift causes rework | Medium | Type against `docs/03` + `docs/06` schemas, not handoff markup. |
| "Why build inference infra off the critical path?" objection | — | The single adapter seeds the production OpenRouter provider (Block 5 needs it) — sunk cost becomes risk front-loading. |
| Strict TDD compromised by non-determinism | Low | Fake stays the deterministic oracle for all unit/CI tests; the real lane is a separate, non-blocking category. |

## Rollback Plan

Git revert per track. Track A is additive to `shared/llm/` and a new opt-in lane; reverting the
adapter/lane leaves the enriched port + fixture fake intact (both are net improvements the delivery
blocks need anyway). No production wiring is introduced, so rollback has no runtime blast radius.

## Dependencies

- Already-written specs: `docs/03`, `05`, `06`, `07` (present).
- Four output schemas fully field-specified in `docs/05-ai-system.md` (present).
- Strict TDD active (`strict_tdd: true`) — all tracks remain red→green; only the *timing* changes.
- Free-tier API keys obtainable by the user for the dev-inference lane (optional; lane is opt-in).

## Success Criteria (strategy + Track A)

- [ ] Two-DAG model recorded; delivery order documented as unchanged.
- [ ] Track A named as the first slice; Track D recorded as done (RLS tests only remain).
- [ ] `LlmProvider` port exposes `complete_text` + `complete_json`; existing tests pass on the new signature.
- [ ] `FakeLlmProvider` returns per-schema fixtures for all four output schemas; use-case tests validate through Pydantic.
- [ ] Single OpenAI-compatible adapter + provider registry implemented behind the port.
- [ ] Dev-inference lane runs opt-in and is excluded from the default CI run; `ruff check` passes.
- [ ] No API key committed; `.env.example` documents the four key names.
- [ ] Docs Enrichment Plan enumerates each doc's touch/no-touch decision (edits deferred to later phases).

## Resolved decisions (question round)

These decision gaps were resolved by the user on 2026-07-02; they do not reopen the three
approved goals.

1. **Container/presentational (doc-04 frontend section):** **Defer to Track B.** Do NOT document
   the split in this change. It is not enforced today (`apps/web/app/login/page.tsx` couples
   fetch+form+JSX); the convention will be documented when Track B actually applies it, so the
   docs never describe an unenforced practice.
2. **ADR-03 vs. new ADR:** **Amend ADR-03 in place** with a supersession note. The architectural
   decision (LLM provider abstraction + JSON validation) is unchanged; only the suggested
   local-dev implementation changes (Ollama → free-tier OpenAI-compatible provider registry).
   This is an implementation refinement, not a new architectural decision — no separate ADR.
3. **Dev-inference lane home:** **Opt-in pytest marker** (e.g. `@pytest.mark.dev_inference`),
   excluded from the default CI run via `-m "not dev_inference"`. Fits Strict TDD, reuses
   existing fixtures, and gives a clean CI-exclusion path. A standalone iteration script may be
   added later if prompt-tuning ergonomics call for it, but the marker is the primary home.
