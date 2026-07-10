# Tasks: Block 8 — Session Generation and Editing

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 1200–1700 |
| 800-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1: Backend (generation module + sessions extensions + tests) → PR 2: Frontend pages (prepare + generated view + i18n + tests) |
| Delivery strategy | chained (stacked-to-main) |
| Chain strategy | stacked-to-main |

Decision needed before apply: No (resolved: stacked-to-main chained PRs)
Chained PRs recommended: Yes
Chain strategy: stacked-to-main

The user chose **chained PRs with stacked-to-main strategy** (2026-07-09). PR 1 (backend) merges to main first, then PR 2 (frontend) merges to main. No `size:exception` needed since each PR stays within or near the 800-line budget.

### Work Units

| Unit | Goal | PR | Base | Est. lines |
|------|------|----|------|-----------|
| 1 | Backend: `generation/` module (ports, contracts, context builder, use case, prompt, routes, DI, schemas, errors) + session extensions (`UpdateSession`, `GetSession`, port additions, repository) + backend tests | PR 1 | main | ~600-800 |
| 2 | Frontend: Prepare page, Generated Session page, form/display components, API client, schemas, i18n, frontend tests | PR 2 | main | ~600-900 |

## Phase 1: Backend Foundation — Generation Module

- [x] 1.1 Write `generation/application/contracts.py`: `GeneratedSection` (id, label, body, origin as `"scribe"|"edited"`), `GeneratedContent` (sections), `GeneratedSessionOutput` (title, synopsis, main_objective, twist, encounters, faction_reactions, arc_progression, continuity_links), `Encounter`, `FactionReaction`, `ArcProgression`, `ContinuityLink`, `GenerationContext` dataclass. TDD: write `GeneratedSessionOutput` Pydantic validation tests first (valid full payload, missing fields, wrong origin values).
- [x] 1.2 Write `generation/domain/ports.py`: `GenerationRepository` protocol with `get_generation_context(campaign_id)` and `create_generated_session(campaign_id, session_data)`.
- [x] 1.3 Write `generation/application/errors.py`: `GenerationNotFoundError` (→404), `GenerationPersistenceError` (→500).
- [x] 1.4 Write `generation/application/context_builder.py`: assemble context dict from repository fetch, estimate tokens via `len(text)//4`, build prompt kwargs, exclude dismissed/unaccepted data (never RAG/embeddings). TDD: test token estimation, empty arcs/facts edge cases, excluded data never passed.
- [x] 1.5 Write `generation/prompts/generate_session_v1.jinja`: Jinja2 template with `StrictUndefined`, accepts campaign + NPCs + factions + arcs + MemoryFacts + direction params (goal, tone, pace, difficulty, additional_instructions).
- [x] 1.6 Write `generation/application/generate_session.py`: `GenerateNextSessionUseCase` — ownership check → context builder → `render_prompt` → `LlmProvider.complete_json(prompt, GeneratedSessionOutput)` → Pydantic validation → persist draft (via `insert_session_with_next_number`) with `generated_content` + `trace_json`. TDD: test with `FakeLlmProvider` (valid JSON → persist path; invalid → 422 path; token warning on oversized context).
- [x] 1.7 Write `generation/infrastructure/repository.py`: `SupabaseGenerationRepository` — 5 parallel Supabase SELECTs (campaign, NPCs, factions, arcs, active MemoryFacts) for context; `create_generated_session` calls existing `insert_session_with_next_number` pattern with `generated_content`, `trace_json`, auto-fills `summary` from synopsis.
- [x] 1.8 Write `generation/api/schemas.py`: `GenerateSessionRequest` (goal, tone, pace, difficulty, additional_instructions — all optional, defaults server-side), `GenerateSessionResponse` (id, session_number, title, synopsis, encounters, etc., trace_id).
- [x] 1.9 Write `generation/api/dependencies.py`: DI provider for `GenerateNextSessionUseCase` (wires `SupabaseGenerationRepository`, `LlmProvider` via shared dep).
- [x] 1.10 Write `generation/api/exception_handlers.py`: map `GenerationNotFoundError` → 404.
- [x] 1.11 Write `generation/api/routes.py`: `POST /campaigns/{campaign_id}/generate-session` with `get_current_user` auth, ownership validation, returns `GenerateSessionResponse`.

## Phase 2: Backend Foundation — Sessions Module Extensions

- [x] 2.1 Add `get_session(session_id) -> dict|None` and `update_session(session_id, data) -> dict` to `sessions/domain/ports.py` `SessionRepository` protocol. Add `get_campaign_owner(campaign_id) -> str|None` for ownership cascade.
- [x] 2.2 Implement `get_session` (SELECT with `generated_content`, `trace_json`, campaign join for ownership) and `update_session` (PATCH jsonb columns) in `sessions/infrastructure/repository.py`.
- [x] 2.3 Write `sessions/application/commands/update_session.py`: `UpdateSessionUseCase` with ownership check, accepts `UpdateSessionCommand(generated_content?, summary?, consequences?)`, validates at least one field present (→422 if empty). TDD: test partial-update semantics, ownership guard, empty-body rejection.
- [x] 2.4 Write `sessions/application/queries/get_session.py`: `GetSessionUseCase` with ownership check. TDD: test found/not-found paths.
- [x] 2.5 Write `sessions/application/read_models/session_detail.py`: `SessionDetailResponse` with `generated_content`, `trace_json`.
- [x] 2.6 Add `UpdateSessionRequest` to `sessions/api/schemas/session/requests.py`: all fields optional `(generated_content?, summary?, consequences?)`, at-least-one Pydantic validation.
- [x] 2.7 Add `detail_router` (prefix `/sessions`) to `sessions/api/routes.py` with `GET /sessions/{session_id}` and `PATCH /sessions/{session_id}`. Add providers in `sessions/api/dependencies.py` for both use cases.
- [x] 2.8 Wire everything in `app/main.py`: mount `generation` router, register `detail_router` from sessions, add exception handlers for `GenerationNotFoundError`.

## Phase 3: Frontend — API Client and Schemas

- [ ] 3.1 Add schemas to `apps/web/lib/sessions/schemas.ts`: `generateSessionRequestSchema`, `generateSessionResponseSchema`, `sessionDetailSchema` (with `generated_content`, `trace_json`), `updateSessionContentSchema`, `generatedSectionSchema`, `generatedContentSchema`.
- [ ] 3.2 Add to `apps/web/lib/sessions/api.ts`: `generateSession(campaignId, params)`, `getSession(sessionId)`, `updateSessionContent(sessionId, data)` — each with typed error classes. TDD: test success/404/422 paths with mock `apiFetch`.
- [ ] 3.3 Add i18n messages to `apps/web/messages/en.json` and `apps/web/messages/es.json` for: prepare page (breadcrumbs, kicker, h1, subtitle, context panel labels, direction field labels, privacy note, loading text, error text), generated session view (breadcrumbs, kicker, section labels, action buttons, memories sidebar headings, legend, private notes, toast messages).

## Phase 4: Frontend — Prepare Session Page

- [ ] 4.1 Create `apps/web/app/[locale]/campaigns/[id]/prepare/page.tsx`: thin server component that renders `<PrepareSessionView campaignId={id} />`.
- [ ] 4.2 Create `apps/web/components/sessions/prepare-session-form.tsx`: `PrepareSessionView` client component matching `PrepareSession` handoff — breadcrumb, kicker, h1, "What the Scribe will read" context panel (rows with `Included` flags), "Your direction" form fields (goal textarea, tone/pace/difficulty selects, extra textarea), privacy note, accent submit button. States: form (default), loading (`LoadingScribe` takeover with dynamic "Drafting Session {number}" title), error (`ErrorNotice` with retry, form state preserved). On success redirects to `/campaigns/[id]/sessions/{sessionId}`. Uses shared components: `LoadingScribe`, `Notice`, `Button`, `Field`. TDD: test form render, loading state render, error state render, redirect on success.
- [ ] 4.3 Verify `PrepareSessionView` against handoff contract: extract checklist from `handoff/app/views-prepare.jsx` (`PrepareSession`), confirm all fields, states (form, loading, error), tokens, and shared components match.

## Phase 5: Frontend — Generated Session View Page

- [ ] 5.1 Create `apps/web/app/[locale]/campaigns/[id]/sessions/[sessionId]/page.tsx`: thin server component that renders `<GeneratedSessionView campaignId={id} sessionId={sessionId} />`.
- [ ] 5.2 Create `apps/web/components/sessions/generated-session-view.tsx`: `GeneratedSessionView` client component matching `GeneratedSession` handoff — breadcrumb, kicker, h1, action buttons (← Campaign, Copy, Save changes, Export PDF →), sections list with mono index `/01`, label, `OriginBadge`, Edit/Regenerate links, section body. Inline editing: textarea replaces body on Edit, Save/Cancel buttons. Regeneration: quill loading placeholder (simulated, no real LLM call). Memories sidebar: "Memories woven in" with type pills, text, origin. Legend section. Private DM notes section (frontend-only, `Excluded from PDF` flag). Toast on save/copy. States: view (default), editing (per-section), regenerating (per-section), loading (`LoadingScribe` on initial fetch), error (`ErrorNotice` with retry). TDD: test section renders, edit mode, save flips origin badge, cancel reverts, copy-to-clipboard, PATCH failure preserves edits.
- [ ] 5.3 Verify `GeneratedSessionView` against handoff contract: extract checklist from `handoff/app/views-prepare.jsx` (`GeneratedSession`), confirm all fields, states (view, editing, loading, error, regenerating), tokens, shared components, and motion requirements match.

## Phase 6: Integration and Verification

- [x] 6.1 Backend integration tests: `POST /campaigns/{id}/generate-session` against real Supabase local stack + `FakeLlmProvider` — assert RLS enforcement, context assembly, persistence, trace metadata. `PATCH /sessions/{id}` — ownership guard, full-object persistence, timestamp. `GET /sessions/{id}` — `generated_content` and `trace_json` in response. Run via `pytest` from `services/api/`.
- [ ] 6.2 Frontend component tests: use Vitest + React Testing Library to render both pages in each state (loading, error, form/view, editing). Run via `pnpm --filter web test`.
- [x] 6.3 TypeScript type-check: `pnpm typecheck` passes. ESLint: `pnpm lint` passes. Ruff: `ruff check` passes. Prettier: `pnpm format:check` passes. PR 1 backend-only gates completed: `pytest`, `ruff check`, `ruff format --check`, and `mypy`; frontend gates deferred to PR 2.
- [ ] 6.4 Document prompt template in `docs/05-ai-system.md` under a new "Prompt: generate next session" section referencing `generate_session_v1.jinja`.
