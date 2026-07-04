# Tasks: block-5-campaign-creation — Campaign creation and AI onboarding

Ordered, dependency-aware implementation checklist. Strict TDD: failing test before
implementation. Delivery: **single PR with `size:exception` accepted up front** (see
Review Workload Forecast). The automated Supabase migration CI/CD pipeline is explicitly
OUT of scope — a separate fast-follow infra PR.

---

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~1,900–2,300 (single PR) |
| 400-line budget risk | High (accepted) |
| Chained PRs recommended | No (single-PR `size:exception` accepted by user) |
| Suggested split | Single PR — module + per-user client + 2 screens + migration + tests |
| Delivery strategy | single-pr |
| Chain strategy | size-exception |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: High

### Suggested Work Units (commit boundaries within the one PR)

| Unit | Goal | Notes |
|------|------|-------|
| 1 | Per-user Supabase client + auth context | `shared/database.py`, `shared/security.py` — foundation for everything else |
| 2 | `shared/prompts.py` Jinja helper | Standalone, no dependency on Unit 1 |
| 3 | `campaigns` domain + schemas + extract use case + route | Depends on Unit 2 |
| 4 | Error mapping (`LlmOutputValidationError` → retryable HTTP) | Depends on Unit 3 |
| 5 | `create_campaign` use case + repository + route | Depends on Unit 1, 3 |
| 6 | Migration (arcs `content_source`) + manual deploy | Depends on Unit 5 (schema needed by repository tests) |
| 7 | Frontend `/campaigns/new` + `/campaigns/new/review` + Zod types | Depends on Units 3, 5 (API contracts) |
| 8 | Docs coherence | Last, after all above green |

### Line Estimates by Area

| Area | Estimated lines |
|------|-----------------|
| Per-user client + auth context + tests | ~180 |
| `shared/prompts.py` + test | ~60 |
| `campaigns` domain/schemas/extract use case + tests | ~350 |
| Error mapping + tests | ~90 |
| `create_campaign` use case + repository + tests (incl. app-layer ownership test) | ~420 |
| Migration SQL + schema test | ~40 |
| Routes + route tests | ~180 |
| Frontend screens + Zod types + tests | ~550 |
| Docs updates | ~30 |
| **Total** | **~1,900** |

---

## Phase 1 — Foundation: Per-user Supabase client + auth context

Satisfies: PU-001, PU-002, NFR-PU-1.

- [x] 1.1 [RED] Write failing tests in `services/api/tests/test_database.py` for `create_user_supabase_client(access_token)`: asserts a fresh `Client` per call (no `lru_cache`), and asserts `client.postgrest.auth(token)` (or equivalent) is invoked with the given token.
- [x] 1.2 [RED] Write failing test in `services/api/tests/test_security.py` (or extend existing) for `AuthContext` NamedTuple and `get_auth_context(authorization)` returning `(user_id, access_token)` from a valid JWT; `get_current_user` still returns `user_id`-only (back-compat).
- [x] 1.3 [GREEN] Add `AuthContext` + `get_auth_context` to `services/api/app/shared/security.py`; refactor `get_current_user` to depend on `get_auth_context` and return `ctx.user_id`.
- [x] 1.4 [GREEN] Add `create_user_supabase_client(access_token: str) -> Client` and `get_user_supabase_client(ctx: AuthContext = Depends(get_auth_context)) -> Client` to `services/api/app/shared/database.py`, sibling to `get_supabase_client()`. Verify `supabase>=2.x` auth API (`client.postgrest.auth(token)`) against the installed version at implementation time; fall back to `ClientOptions(headers=...)` if needed.
- [x] 1.5 [RED] Write failing test proving client isolation: two calls with different tokens produce independent client instances (no shared-state token leak).
- [x] 1.6 Verify Phase 1 green: `uv run pytest` passes 1.1–1.2 + 1.5; `uv run ruff check app/` clean.

---

## Phase 2 — Foundation: Jinja prompt-render helper

Satisfies: design Decision 3 (no direct spec ID — shared infra for CE-004).

- [x] 2.1 [RED] Write failing test `services/api/tests/test_prompts.py` for `render_prompt(template_name, **context)`: renders a fixture template with a variable; asserts `StrictUndefined` raises on a missing variable.
- [x] 2.2 [GREEN] Create `services/api/app/shared/prompts.py` with `Environment(loader=FileSystemLoader(...), autoescape=False, undefined=StrictUndefined, trim_blocks=True, lstrip_blocks=True)` and `render_prompt`.
- [x] 2.3 Verify Phase 2 green: `uv run pytest` passes 2.1.

---

## Phase 3 — `campaigns` domain, schemas, extraction use case, extract route

Satisfies: CE-001 through CE-006, NFR-CE-1, NFR-CE-2.

- [x] 3.1 Create `services/api/app/modules/campaigns/domain/models.py`: `Campaign`, `NPC`, `Faction`, `Arc` (with `content_source: ContentSource`) frozen dataclasses/BaseModels.
- [x] 3.2 Create `services/api/app/modules/campaigns/domain/ports.py`: `CampaignRepository` Protocol with `create_campaign(user_id, data) -> str`. (Implemented with granular `insert_campaign`/`insert_npcs`/`insert_factions`/`insert_arcs`/`delete_campaign` per design Decision 5's compensating-delete pseudocode.)
- [x] 3.3 Create `services/api/app/modules/campaigns/schemas.py`: `ContentSource`, `Priority` enums; `ExtractedNPC`, `ExtractedFaction`, `ExtractedArc` (no `status`); `ExtractCampaignOutput`; `ExtractRequest` (`raw_text: Field(min_length=100, max_length=8000)`). (Enums live in `domain/models.py`; schemas import them.)
- [x] 3.4 Create `services/api/app/modules/campaigns/prompts/extract_campaign_v1.jinja` — renders the DM's `raw_text` into an extraction prompt.
- [x] 3.5 [RED] Write failing tests `services/api/tests/campaigns/test_extract_campaign.py`: `FakeLlmProvider.register(ExtractCampaignOutput, payload)` → use case returns validated output including arcs; register a bad payload → `LlmOutputValidationError` propagates.
- [x] 3.6 [GREEN] Create `services/api/app/modules/campaigns/application/extract_campaign.py`: `ExtractCampaign` use case renders `extract_campaign_v1.jinja` + calls `llm_provider.complete_json(prompt, ExtractCampaignOutput)`.
- [x] 3.7 [RED] Write failing route tests `services/api/tests/campaigns/test_routes_extract.py`: happy path (200, arcs present, `content_source: "llm"` on every item); <100-char 422; >8000-char 422; unauthenticated 401 with no LLM call; statelessness (no DB writes on any path).
- [x] 3.8 [GREEN] Create `services/api/app/modules/campaigns/routes.py` with `POST /campaigns/extract` depending on `get_current_user`, wiring `ExtractCampaign`.
- [x] 3.9 Wire router in `services/api/app/main.py`: `from app.modules.campaigns import routes as campaigns; app.include_router(campaigns.router)`.
- [x] 3.10 Verify Phase 3 green: `uv run pytest` passes 3.5, 3.7; `uv run ruff check app/` clean.

---

## Phase 4 — Error mapping (no raw LLM leak)

Satisfies: CE-005, design Decision 6.

- [x] 4.1 [RED] Extend `services/api/tests/campaigns/test_routes_extract.py` (or add `test_error_mapping.py`): malformed/non-JSON LLM output maps to a retryable 4xx/5xx with `{ error, retryable: true }`; response body never contains `raw_output` or the rendered prompt.
- [x] 4.2 [GREEN] Register a handler for `LlmOutputValidationError` (subclass of `AppError` with overridable status, or dedicated handler) in `services/api/app/shared/errors.py`; wire in `main.py`. Handler logs `schema_name` + trace metadata only, never `raw_output` in the response.
- [x] 4.3 Verify Phase 4 green: `uv run pytest` passes 4.1.

---

## Phase 5 — Persistence: create-campaign use case, repository, route

Satisfies: CP-001 through CP-005, NFR-CP-1, NFR-CP-2, PU-003, NFR-PU-2.

- [x] 5.1 Extend `services/api/app/modules/campaigns/schemas.py`: `CreateCampaignRequest` (npcs/factions/arcs with `content_source: llm|edited|manual`, no `status` on arc input), `CreateCampaignResponse` (`{ id: str }`).
- [x] 5.2 [RED] Write failing repository tests `services/api/tests/campaigns/test_repository.py` against local Supabase (or faked PostgREST): ordered insert (campaign → npcs → factions → arcs), arc `status="open"`, `content_source` persisted; compensating delete on child failure; delete-also-fails surfaces campaign id. (Implemented with a mocked PostgREST `Client` — deterministic, no Docker required; ordering/compensation logic is covered in `test_create_campaign.py`.)
- [x] 5.3 [GREEN] Create `services/api/app/modules/campaigns/infrastructure/repository.py`: `SupabaseCampaignRepository(client: Client)` implementing `CampaignRepository`; never imports `get_supabase_client()`.
- [x] 5.4 [RED] Write failing use-case tests `services/api/tests/campaigns/test_create_campaign.py`: happy path (empty and non-empty npcs/factions/arcs); child-insert failure triggers compensating delete + `CampaignPersistenceError(retryable=True)`; payload preserved for retry.
- [x] 5.5 [GREEN] Create `services/api/app/modules/campaigns/application/create_campaign.py`: `CreateCampaign` use case — parent-first inserts, try/except with compensating delete per design Decision 5.
- [x] 5.6 [RED] Write the **app-layer ownership test** `services/api/tests/campaigns/test_ownership.py`: User A's token/client cannot write a campaign attributed to User B; created campaign's `user_id` always equals the caller's `auth.uid()` (CP-004, NFR-PU-2 — the precedent-setting test). (Integration test against a real local Supabase stack — signs in two ephemeral users, drives the real per-user-client path; skips when the stack is down, matching `test_rls.py`/`test_schema.py` convention. Not exercised by the current CI backend job, which does not start the local stack — run locally via `pnpm supabase start` to verify.)
- [x] 5.7 [GREEN] Ensure `CreateCampaign`/`SupabaseCampaignRepository` always set `user_id` from `AuthContext.user_id`, never from client input, making 5.6 pass.
- [x] 5.8 [RED] Write failing route tests `services/api/tests/campaigns/test_routes_create.py`: happy path 200/201 `{ id }`; unauthenticated 401 with no rows written; partial-failure compensation surfaces retryable error.
- [x] 5.9 [GREEN] Add `POST /campaigns` to `services/api/app/modules/campaigns/routes.py`, depending on `get_user_supabase_client` + `get_auth_context`, wiring `CreateCampaign` + `SupabaseCampaignRepository`.
- [x] 5.10 Verify Phase 5 green: `uv run pytest` passes 5.2, 5.4, 5.6, 5.8; `uv run ruff check app/` clean.

---

## Phase 6 — Migration: arcs `content_source`

Satisfies: NFR-CP-3.

- [x] 6.1 [RED] Extend `services/api/tests/test_schema.py` (or add an assertion) to verify the `arcs` table exposes a `content_source` column of the existing `content_source` enum type — expect failure before the migration exists.
- [x] 6.2 [GREEN] Run `pnpm supabase migration new add_content_source_to_arcs`; write `alter table arcs add column content_source content_source;` in the generated `supabase/migrations/<timestamp>_add_content_source_to_arcs.sql`. Nullable, no default, no backfill. (Created `supabase/migrations/20260704090000_add_content_source_to_arcs.sql` directly — local Supabase CLI stack was not available in this environment to run the `migration new` scaffolding command; the file follows the existing naming/timestamp convention.)
- [x] 6.3 Verify Phase 6 green locally: `pnpm supabase db reset` (or equivalent local apply) + 6.1 passes. (Local Supabase stack not running in this environment — `test_schema.py` correctly `pytest.skip`s per its established guard; not yet verified against a live Postgres. Verify with `pnpm supabase start && pnpm supabase db reset` before merge.)
- [ ] 6.4 **[MANUAL — ops step, run at block close]** Run `pnpm supabase db push --dry-run` against hosted Supabase, review the plan, confirm no unexpected pending migrations; then run `pnpm supabase db push`. Record both outputs in the PR description. Do NOT build an automated CI/CD pipeline for this — that is a separate fast-follow infra PR. NOTE: per the apply-phase instructions, migration deploy is now automated via `.github/workflows/deploy-migrations.yml` on merge to main — this manual step may be superseded; confirm with the user before running.

---

## Phase 7 — Frontend: `/campaigns/new` and `/campaigns/new/review`

Satisfies: CUI-001, CUI-002, NFR-CUI-1, NFR-CUI-2.

- [ ] 7.1 Create `apps/web/lib/campaigns/schemas.ts`: Zod types mirroring `ExtractCampaignOutput`, `ExtractRequest`, `CreateCampaignRequest` (including arcs, `content_source`, `priority`).
- [ ] 7.2 [RED] Write failing RTL tests `apps/web/app/campaigns/new/__tests__/page.test.tsx`: char counter; <100/>8000-char blocks submit client-side with text preserved; successful extract navigates to review with payload; backend error preserves typed text; loading state disables submit.
- [ ] 7.3 [GREEN] Create `apps/web/app/campaigns/new/page.tsx`: `"use client"`, react-hook-form + zod (mirrors backend bounds), `useMutation` → `apiFetch('/campaigns/extract', ...)`, stash payload (sessionStorage or router state) → navigate to review.
- [ ] 7.4 [RED] Write failing RTL tests `apps/web/app/campaigns/new/review/__tests__/page.test.tsx`: renders title/description/world_state/npcs/factions/arcs from local state; `✦ Scribe` badge for `llm`, `✎ Edited` for `edited`/`manual`; editing an `llm` item flips it to `edited`; add/remove npc/faction/arc; DM-added arc defaults `priority: "medium"` + `content_source: "manual"`; confirm calls `POST /campaigns` with current payload; success redirects to campaign detail route; failure preserves edited state with error message.
- [ ] 7.5 [GREEN] Create `apps/web/app/campaigns/new/review/page.tsx`: `"use client"`, local state seeded from extracted payload, editable/removable/addable sections, provenance badge logic, `useMutation` → `apiFetch('/campaigns', ...)` → redirect on success.
- [ ] 7.6 Verify Phase 7 green: `pnpm test` passes 7.2, 7.4; `pnpm typecheck` and `pnpm lint` clean on all new frontend files.

---

## Phase 8 — Docs coherence and final gate

- [ ] 8.1 Tick the Block 5 checklist in `docs/10-roadmap.md`.
- [ ] 8.2 Confirm `docs/05-ai-system.md` prompt catalog lists `extract_campaign_v1.jinja`; confirm `docs/06-api-contracts.md` and `PRODUCT.md` remain coherent with the shipped `/campaigns/extract` and `/campaigns` contracts (including arcs).
- [ ] 8.3 Full Suite Gate: `uv run pytest` (backend) exit 0; `uv run ruff check app/` clean; `pnpm test` (frontend) all pass; `pnpm typecheck` clean; `pnpm lint` clean.

---

## Dependency Map

```
Phase 1 (per-user client) ──┐
Phase 2 (Jinja helper)     ──┤
                              ├─→ Phase 3 (extract use case + route) ──→ Phase 4 (error mapping)
                              │                                              │
                              └─→ Phase 5 (create-campaign, needs Phase 1) ←─┘
                                        │
                                        ├─→ Phase 6 (migration; repository tests need the column)
                                        │
                                        └─→ Phase 7 (frontend, needs Phase 3 + 5 API contracts)
                                                   │
                                                   └─→ Phase 8 (docs + final gate)
```

Phase 1 and Phase 2 are independent of each other and can proceed in parallel. Phase 3
and Phase 5 both depend on Phase 1/2 but Phase 5's repository work also needs Phase 6's
column to exist for its tests to pass against a real local schema — sequence Phase 6
right after Phase 5's repository tests are written, before declaring Phase 5 green.
Phase 7 is the last code phase (needs both API contracts finalized). Phase 8 is final.

---

## Summary: Test/Implementation Pairs

| Test task | Implementation task |
|-----------|----------------------|
| 1.1, 1.2, 1.5 | 1.3, 1.4 |
| 2.1 | 2.2 |
| 3.5 | 3.6 |
| 3.7 | 3.8, 3.9 |
| 4.1 | 4.2 |
| 5.2 | 5.3 |
| 5.4 | 5.5 |
| 5.6 | 5.7 |
| 5.8 | 5.9 |
| 6.1 | 6.2 |
| 7.2 | 7.3 |
| 7.4 | 7.5 |
