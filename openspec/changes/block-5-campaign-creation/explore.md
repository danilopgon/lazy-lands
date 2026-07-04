# Exploration: Block 5 — Campaign creation and AI onboarding

## Current State

**Schema + RLS already exist — no migration needed.** `supabase/migrations/20260628101707_initial_schema.sql` already creates all 6 tables (`campaigns`, `sessions`, `npcs`, `factions`, `arcs`, `memory_facts`), enables RLS on all of them, and defines all 24 ownership policies (direct `user_id = auth.uid()` on campaigns; `EXISTS` sub-select via parent campaign on children). Grants: `authenticated` has full DML (narrowed by RLS), `anon` has none, `service_role` has SELECT/INSERT only on `campaigns`/`sessions` for local seeding — explicitly NOT for runtime app use. This fully answers the roadmap's "RLS active on campaigns/npcs/factions" checklist item: it's already true at the DB layer. `test_rls.py` verifies policies directly via `psycopg` + `SET LOCAL ROLE`, not through the app.

**Missing: a per-user (JWT-bound) Supabase client.** `services/api/app/shared/database.py` only exposes `get_supabase_client()` — a service-role singleton explicitly documented as "admin/seed only... feature modules MUST NOT use this for user-data reads or writes." No per-request client that authenticates as the calling user (so `auth.uid()` resolves inside Postgres) exists yet. Block 5 is the first block that needs the backend to write user-owned data (campaigns/npcs/factions) through RLS, so building this per-request client (using the caller's JWT + `supabase_publishable_key`/anon key, e.g. via `client.postgrest.auth(token)` or per-request `create_client` with the user's bearer token) is on this block's critical path — not optional plumbing.

**`campaigns` module is a stub.** `services/api/app/modules/campaigns/{domain,application,infrastructure}/__init__.py` exist but are empty. No `routes.py`, `schemas.py`, `prompts/` yet. `main.py` only wires the `health` router. No campaign endpoint exists at all yet.

**LLM seam is fully built (PR #20) and ready to reuse.** `app/shared/llm/port.py` defines `LlmProvider` Protocol with `complete_text(prompt) -> str` and `complete_json[T: BaseModel](prompt, schema) -> T`. `app/shared/llm/json_guard.py::parse_llm_json` strips code fences/prose and validates via Pydantic, raising `LlmOutputValidationError` (always `retryable=True`) on bad JSON or schema mismatch — the single validation path for both `FakeLlmProvider` and `OpenAiCompatibleProvider`. `providers/fake.py::FakeLlmProvider.register(schema, payload)` lets tests register per-schema fixtures (module → shared direction, per ADR-05 rule 3) and routes them through the same guard. `providers/registry.py::build_provider()` resolves `LLM_PROVIDER` env var (`fake`/`gemini`/`groq`) into a configured provider. Block 5 MUST call `complete_json(prompt, ExtractCampaignOutput)` through this seam — do not reinvent JSON parsing/validation.

**Frontend has no campaign screens or client yet.** `apps/web/app/` only has landing, login, register, forgot-password, auth/confirm, auth/reset, dashboard (placeholder), cookies, privacy. No `/campaigns`, `/campaigns/new`, or `/campaigns/new/review` routes exist. `apps/web/lib/api.ts::apiFetch(path, init)` is the existing pattern: injects the Supabase JWT as `Authorization: Bearer <token>`, prefixes `NEXT_PUBLIC_API_URL`, and expects the caller to check `response.ok` (used with TanStack Query). Block 5 frontend work should reuse `apiFetch`, not build a new client.

**Handoff prototypes exist** for both screens: `handoff/app/views-review.jsx` (the extraction review screen, referred to in PRODUCT.md as `/campaigns/new/review`) and campaign-creation form fields appear across `views-dashboard.jsx`/`data.js`/`views-landing.jsx`. The review screen shows summary, world state, NPCs, factions, AND arcs, each editable/removable, each carrying an origin badge (`✦ Scribe` / `✎ Edited`) — the visual embodiment of P1 (DM has the last word) and `content_source` in the domain model.

**`get_current_user`** (in `app/shared/security.py`) already validates the Supabase ES256 JWT via JWKS and returns the `sub` claim (user UUID) as a plain string. This is what any new campaign use case will depend on for ownership — but note it returns only the user id, not the raw token, so the route/use case will also need access to the raw bearer token to construct the per-user Supabase client (or `get_current_user` needs to be extended to return both).

**Testing patterns**: strict TDD is active project-wide. Backend tests are pytest (asyncio mode), organized as flat files under `services/api/tests/` (not yet nested per-module — `test_rls.py`, `test_jwt_auth.py`, `test_fake_llm.py`, etc.). No existing use-case test file to mirror yet since no module has application-layer code; Block 5 will establish the first "use case + FakeLlmProvider fixture" test pattern for the `campaigns` module — this is a precedent-setting block.

## End-to-End Flow (target)

1. DM opens `/campaigns/new` (new Next.js route) → free-text textarea (100-char min per PRODUCT.md; errors must preserve typed text).
2. Frontend calls `apiFetch('/campaigns/extract', { method: 'POST', body: { raw_text } })`.
3. FastAPI `campaigns/routes.py` → `get_current_user` dependency (JWT validated) → `application/extract_campaign.py` use case.
4. Use case renders `prompts/extract_campaign_v1.jinja` with the raw text, calls `llm_provider.complete_json(prompt, ExtractCampaignOutput)`.
5. `parse_llm_json` guard validates the LLM's JSON against `ExtractCampaignOutput` (Pydantic) — invalid output surfaces as a retryable error, never persisted.
6. Response returned to frontend — **stateless, nothing persisted** (per `docs/06-api-contracts.md`: "This endpoint does not persist data. It returns data for DM review").
7. Frontend renders `/campaigns/new/review` (confirmation screen) using the extracted payload as local component state — DM edits/removes/adds NPCs, factions, world state; each item flips `content_source` from `llm` to `edited` on touch.
8. DM clicks "Confirm & create campaign" → frontend calls `apiFetch('/campaigns', { method: 'POST', body: reviewedPayload })`.
9. FastAPI `campaigns/routes.py` → `application/create_campaign.py` use case → `infrastructure/repository.py` (`SupabaseCampaignRepository`) — writes campaign row, then NPC rows, then faction rows, using a **per-user Supabase client** so `auth.uid()` matches `user_id` under RLS.
10. Response returns `{ id }`; frontend redirects to campaign detail (Block 6 — out of scope here, just the redirect target).

## Affected Areas

- `services/api/app/modules/campaigns/domain/models.py` — new: `Campaign`, `NPC`, `Faction` domain models (per ADR-05, `Campaign` is owned here).
- `services/api/app/modules/campaigns/domain/ports.py` — new: `CampaignRepository` Protocol.
- `services/api/app/modules/campaigns/application/extract_campaign.py` — new: orchestrates prompt render + `complete_json`.
- `services/api/app/modules/campaigns/application/create_campaign.py` — new: persists campaign + NPCs + factions via repository.
- `services/api/app/modules/campaigns/infrastructure/repository.py` — new: `SupabaseCampaignRepository`, depends on the per-user Supabase client (not yet built).
- `services/api/app/modules/campaigns/routes.py`, `schemas.py` — new: FastAPI router + `ExtractCampaignOutput`/request-response schemas.
- `services/api/app/modules/campaigns/prompts/extract_campaign_v1.jinja` — new: extraction prompt template (first Jinja prompt in the codebase — confirm/introduce a Jinja render helper in `shared/`, e.g. `shared/prompts.py`, since none exists yet).
- `services/api/app/shared/database.py` — extend: add a per-request/JWT-bound Supabase client factory (the central missing piece for RLS-safe writes).
- `services/api/app/shared/security.py` or `dependencies.py` — possibly extend `get_current_user` (or add a sibling dependency) to also expose the raw bearer token for the per-user client.
- `services/api/app/main.py` — wire the new `campaigns` router.
- `services/api/tests/` (or new `services/api/tests/modules/campaigns/`) — new use-case tests using `FakeLlmProvider.register(ExtractCampaignOutput, ...)`, new repository/RLS-integration tests, new route tests.
- `apps/web/app/campaigns/new/page.tsx` — new: free-text form screen.
- `apps/web/app/campaigns/new/review/page.tsx` — new: confirmation/edit screen.
- `apps/web/lib/api.ts` — reused as-is (`apiFetch`).
- Possibly `apps/web/lib/campaigns/` — new: types/schemas for the extract/save payloads (Zod, matching frontend conventions).
- `docs/10-roadmap.md` — update Block 5 checklist on completion.

## Open Questions / Decisions for the Proposal

1. **Arcs in Block 5 — RESOLVED: arcs ARE in scope.** The Block 5 roadmap checklist initially listed only NPCs, factions, and world state, but `docs/06-api-contracts.md`'s `/campaigns/extract` and `POST /campaigns` payloads include `arcs`, and PRODUCT.md's `/campaigns/new/review` screen (and the `views-review.jsx` prototype) show arcs as a first-class editable section. **Decision (2026-07-04): the roadmap checklist is NOT authoritative over PRODUCT.md/api-contracts — arcs are first-class in Block 5.** `ExtractCampaignOutput` includes `arcs[]` ({title, description, priority}); the review UI and save path handle arcs alongside npcs/factions. The `arcs` table lacks a `content_source` column (npcs/factions have it), which contradicts PRODUCT.md's Arc `origin` field — resolved by adding an additive migration (`alter table arcs add column content_source content_source;`). `docs/10-roadmap.md` Block 5 checklist updated to list arcs for coherence.
2. **Per-user Supabase client design.** Needs a proposal-level decision: extend `get_current_user` to return `(user_id, raw_token)`, or add a separate dependency; how the per-user client is constructed and cached (per-request, not a process singleton, since it carries a scoped token).
3. **`ExtractCampaignOutput` schema placement.** Recommend: one Pydantic model in `modules/campaigns/schemas.py` serving both as the `complete_json` target and the FastAPI response model (ADR-05-aligned). Note the alternative (split LLM-output schema vs. HTTP schema) if constraints diverge later.
4. **Multi-table save atomicity.** `POST /campaigns` writes campaign + N NPCs + M factions across separate PostgREST calls with no built-in cross-table transaction. Partial-failure handling needs an explicit strategy — accept eventual-consistency risk for MVP, or wrap in a Postgres function/RPC for atomicity.
5. **Jinja prompt rendering infra.** No `shared/prompts.py` or render helper exists yet — this block introduces prompt templating for the first time; confirm whether to add a minimal Jinja `Environment` loader to `shared/` now (reusable by `sessions`/`memory`/`generation` later) or inline-render for Block 5 only.
6. **Input validation boundary.** PRODUCT.md requires ≥100-char premise text and that write/generation errors never lose the DM's typed input. Decide whether the 100-char minimum is enforced frontend-only, backend-only (Pydantic `Field(min_length=100)`), or both (recommend both — backend is the trust boundary, frontend is UX).

## Approaches

1. **Single extract-then-save round trip (recommended, matches existing docs)** — `/campaigns/extract` is stateless (no persistence, no draft table); `/campaigns` persists the reviewed payload in one POST.
   - Pros: Matches `06-api-contracts.md` exactly; simplest mental model; no orphaned draft rows to clean up; DM can abandon mid-review with zero backend state.
   - Cons: If the DM's browser session drops between extract and save, all extracted data is lost (no server-side draft to recover) — acceptable for MVP per PRODUCT.md's "errors preserve text" principle, which is a frontend concern.
   - Effort: Medium.

2. **Persist a draft campaign row after extract** — `/campaigns/extract` creates a `campaigns` row with `status: draft`, then `/campaigns/{id}/confirm` finalizes it.
   - Pros: Survives browser refresh/session loss between screens; opens the door to "resume editing later."
   - Cons: Contradicts `06-api-contracts.md`'s explicit "does not persist data" note; adds a `status` column not in the current schema; adds a second migration; scope creep beyond the Block 5 checklist.
   - Effort: High.

Recommendation: **Approach 1** — it is what the existing docs already specify, requires no schema change, and matches the MVP/TFM deadline pressure.

## Risks

- **RLS-safe write path is unbuilt** — the per-user Supabase client is the riskiest new piece; a mistake here (e.g., accidentally using the service-role client for campaign writes) would silently bypass RLS. Needs an explicit test asserting User A cannot write into User B's campaign via the app layer (not just the raw-SQL RLS tests that already exist).
- **LLM output validation failures** are user-facing (DM pastes ambiguous/short text) — must map `LlmOutputValidationError` to a clear retryable HTTP error without leaking raw LLM output or full prompts (per `docs/05-ai-system.md` trace-metadata rules).
- **Review workload / PR size**: this block spans a new backend module (domain+application+infrastructure+routes+schemas+prompt), a new per-user Supabase client, two new frontend screens, and their test suites. Very likely exceeds the 400-changed-line PR budget — `sdd-tasks` should plan chained/stacked PR slices.
- **First migration beyond base schema** — the arcs `content_source` column is the first schema change after `20260628101707_initial_schema.sql`. There is no automated cloud migration deploy yet (`ci.yml` runs against a local fake; `CLOUD.md` documents only a manual controlled `db push`). Deployment path must be decided before the block closes (manual controlled push now + automated pipeline as a separate infra PR).
- **Prompt versioning precedent** — this is the first Jinja prompt in the codebase; getting the loader/convention right here affects `sessions`, `memory`, `generation` modules later (per ADR-05's per-module `prompts/` convention).

## Ready for Proposal

Yes. Scope is well-understood, the base schema/RLS foundation already exists (this block adds one additive migration: `arcs.content_source`), the LLM seam is ready to reuse, and the main open decisions (arcs inclusion — resolved IN scope, per-user Supabase client shape, atomicity strategy, migration deployment) are concrete enough to resolve in `sdd-propose`.
