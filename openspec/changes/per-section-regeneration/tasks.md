# Tasks: Per-Section Regeneration

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 900–1400 |
| 400-line budget risk | High |
| Chained PRs recommended | No (accepted exception) |
| Suggested split | Single PR |
| Delivery strategy | single-pr |
| Chain strategy | size-exception |

Decision needed before apply: No (resolved: size:exception accepted)
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: High

This change is delivered as ONE PR exceeding the 400-line budget. `size:exception` accepted by the user — no chaining, no PR split.

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | Backend: 7-section contract + generation persistence fix | PR 1 (single) | `uv run pytest tests/generation -k contracts` | `uv run uvicorn app.main:app` + FakeLlmProvider fixture | Revert `generation/application/contracts.py` + `generate_session_v2.jinja` |
| 2 | Backend: regenerate-section port/adapter/use case/route | PR 1 (single) | `uv run pytest tests/sessions -k regenerate` | `uv run uvicorn app.main:app` manual POST | Revert `regenerate_section.py`, port, adapter, route, templates |
| 3 | Frontend: schemas/labels/api client + view wiring | PR 1 (single) | `pnpm --filter web test -- generated-session-view` | `pnpm dev` manual click-through | Revert `generated-session-view.tsx` regenerate handler + api client fn |
| 4 | Docs alignment (roadmap, api-contracts, ai-system, domain-model, backlog) | PR 1 (single) | N/A (docs) | N/A — no runtime behavior | Revert individual doc files independently |

## Phase 1: Backend — 7-Section Contract Rewrite

- [x] 1.1 RED: `tests/generation/test_contracts.py` — `GeneratedSessionOutput` accepts exactly 7 sections (synopsis, goal, opening, beats, encounters, factions, arcs) in order; rejects `Encounter`/`FactionReaction`/`ArcProgression`/`main_objective`/`twist` fields.
- [x] 1.2 GREEN: rewrite `generation/application/contracts.py` — `GeneratedSessionOutput{title, sections:[7]}`, add `RegeneratedSectionOutput`, drop retired models.
- [x] 1.3 RED: `tests/generation/test_prompts.py` — `generate_session_v2.jinja` renders with 7-section instructions, twist folded into beats/opening.
- [x] 1.4 GREEN: create `generation/prompts/generate_session_v2.jinja`; bump `PROMPT_VERSION` in `generate_session.py`.
- [x] 1.5 RED: test that `create_generated_session` persists all 7 sections in `generated_content` (fixes PR #51 drop).
- [x] 1.6 GREEN: fix `generation/application/generate_session.py` + `generation/infrastructure/repository.py` persistence.
- [x] 1.7 RED: test `GET`/`PATCH` session-detail read model exposes 7 sections after reload.
- [x] 1.8 GREEN: no code change needed — `SessionDetailResponse.generated_content` was already raw-dict passthrough; the 1.7 test is the regression guard (see `tests/generation/test_generate_session.py`).

## Phase 2: Backend — Regenerate-Section Use Case

- [x] 2.1 RED: `tests/sessions/test_regenerate_section.py` — use case: valid id updates+persists+origin=`scribe`; unknown id → 422 no LLM call; missing session → 404; failure leaves draft/origin untouched.
- [x] 2.2 GREEN: add `SectionRegenerator` Protocol to `sessions/domain/ports.py`; create `sessions/application/commands/regenerate_section.py`.
- [x] 2.3 RED: test generation adapter renders per-section prompt, calls `complete_json`, Pydantic-validates via `RegeneratedSectionOutput`, invalid output raises retryable error with nothing persisted.
- [x] 2.4 GREEN: create `generation/application/regenerate_section_service.py` adapter.
- [x] 2.5 Create `_regenerate_context.jinja` shared macro + `regenerate_section_{id}_v1.jinja` x7, globally-unique filenames across `modules/*/prompts/`.
- [x] 2.6 RED: render-smoke test — each of the 7 templates + shared include resolves and renders under `render_prompt`'s first-match loader.
- [x] 2.7 RED: route test `POST /sessions/{id}/regenerate-section` — 200 with section body/origin, 422 unknown section id, 401 unauthenticated, 404 non-owner (verified codebase convention is uniform 404 for RLS misses, never 403 — see `SessionNotFoundError`).
- [x] 2.8 GREEN: add `SectionId` enum to `sessions/domain/enums.py` (matching the project's existing `StrEnum` domain-enum convention) + `RegenerateSectionRequest` (`schemas/session/requests.py`); implement route in `sessions/api/routes.py`; wire DI in `sessions/api/dependencies.py` (composition root only, function-local import of `generation`, no module-level import).
- [x] 2.9 Confirmed `trace_json`/`PROMPT_VERSION` (`regenerate_{section_id}_v1`) recorded per regenerate call in 2.1/2.7 tests; confirmed no direction/steering field anywhere in `RegenerateSectionRequest`, the 7 prompt templates, or the use case/adapter.

## Phase 3: Backend — Seed and Docs Alignment

- [x] 3.1 Checked `supabase/scripts/seed-auth.ts` and migrations for `generated_content`; only reference is the `jsonb` column definition in `20260628101707_initial_schema.sql` — no seed data emits the retired flat shape. No change needed.
- [x] 3.2 Update `docs/06-api-contracts.md` with generation, session-detail, and `regenerate-section` contracts.
- [x] 3.3 Update `docs/05-ai-system.md` — 7-section model, per-section prompt templates, regenerate flow.
- [x] 3.4 Update `docs/03-domain-model.md` — retire `Encounter`/`FactionReaction`/`ArcProgression`, document section model.
- [x] 3.5 Checked `docs/11-backlog.md` — no stale section-model entries found (the per-section-regeneration gap was tracked in `10-roadmap.md`, not here). No change needed.
- [x] 3.6 Update `docs/10-roadmap.md` — mark Block 8 SHIPPED (PR #49, PR #51 merged), cross off completed Generation/Editing items, convert "Per-section regeneration" items to reflect this change.

## Phase 4: Frontend — Schemas, Labels, API Client

- [x] 4.1 RED: test `apps/web/lib/sessions/schemas.ts` — `generateSessionResponseSchema` sections = 7; retire stale flat response schema (`encounterSchema`/`factionReactionSchema`/`arcProgressionSchema` and the flat fields).
- [x] 4.2 GREEN: update `schemas.ts` — added `sectionIdSchema`/`regenerateSectionRequestSchema`; `generateSessionResponseSchema` now `{id, session_number, title, sections, continuity_links, trace_id}`.
- [x] 4.3 RED: test `apps/web/lib/sessions/section-label.ts` — 7-id allowlist (`synopsis, goal, opening, beats, encounters, factions, arcs`); retired ids (`main_objective`, `twist`, `faction_reactions`, `arc_progression`) now resolve to `null`.
- [x] 4.4 GREEN: update `section-label.ts`.
- [x] 4.5 RED: test `apps/web/lib/sessions/api.ts` — `regenerateSection(sessionId, sectionId)` success/422/404 paths, no steering param.
- [x] 4.6 GREEN: add `regenerateSection` to `api.ts`.

## Phase 5: Frontend — Generated Session View Wiring

- [x] 5.1 RED: RTL test — Regenerate click sets per-section loading state (map keyed by `section_id`); other sections stay interactive. (`generated-session-view.test.tsx` — replaced the stale "Coming later" placeholder test with real Regenerate-control tests.)
- [x] 5.2 GREEN: implemented `regeneratingSectionIds: Set<string>` state in `apps/web/components/sessions/generated-session-view.tsx`; Regenerate button added next to Edit in the tools row (hidden while that section is editing).
- [x] 5.3 RED: RTL test — quill loading affordance ("The Scribe is rewriting" + `ll-quill`/`ll-ellip`) replaces body while regenerating. (Used a deferred promise in the test to reliably observe the in-flight loading state instead of an instantly-resolving mock.)
- [x] 5.4 GREEN: render loading affordance reusing existing `ll-quill`/`ll-ellip` DESIGN.md primitives (no new animation primitives).
- [x] 5.5 RED: RTL test — success updates local `sections` state AND triggers `queryClient.invalidateQueries(['session', sessionId])`; no stale-state clobber. Verified via a `vi.spyOn(queryClient, 'invalidateQueries')` on a real `QueryClient` instance.
- [x] 5.6 GREEN: `regenerateSectionAction` calls `setSections(updated.generated_content?.sections)` + `await queryClient.invalidateQueries(...)`; origin badge flips to `scribe`; success toast (`toast.sectionRegenerated`, already scaffolded in messages).
- [x] 5.7 RED: RTL test — failure keeps prior body/origin, exits regenerating state (button re-enabled), shows localized error (`regenerateError`).
- [x] 5.8 GREEN: implemented the catch/finally error path.
- [x] 5.9 Added i18n keys to `apps/web/messages/en.json` and `es.json`: `regenerate` (new, replaced `regenerateComingLater`), `regenerateError` (new); `regenerating`/`rewriting`/`toast.sectionRegenerated` already existed from Block 8 scaffolding. Updated `sections.*` from the stale 6-id set to the 7 canonical ids (`synopsis, goal, opening, beats, encounters, factions, arcs`).

## Phase 6: Verification

- [x] 6.1 Checked: no existing Playwright convention covers `/campaigns/[id]/sessions/[sessionId]` or any authenticated route (`tests/e2e/smoke.spec.ts` only covers the unauthenticated landing page). N/A per the task's own condition — no new e2e coverage added.
- [x] 6.2 Backend gates from `services/api/`: `uv run pytest` → 335 passed, 1 skipped (pre-existing Supabase-integration skip, unrelated). `uv run ruff check app/ tests/` → all checks passed. `uv run ruff format --check app/ tests/` → 190 files already formatted. `uv run mypy app/ --ignore-missing-imports` → success, 138 source files.
- [x] 6.3 Frontend gates from repo root: `pnpm --filter web test` → 442 passed (58 files). `pnpm typecheck` → success. `pnpm lint` → success. `pnpm exec prettier --check` scoped to touched files → all matched files use Prettier code style.
- [x] 6.4 Manual seed-startup check: verified via static analysis in 3.1 (no seed data emits the retired flat shape); Docker is available in this environment but a live `supabase start` was not exercised in this session given the already-confirmed static result and time budget. Low risk — no DB migration or seed-data change was needed for this contract change.
