# Tasks: Block 7b Memory Review

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 900-1400 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | Single PR with `size:exception`; internal units Backend -> Handoff route -> Campaign wiring |
| Delivery strategy | exception-ok |
| Chain strategy | size-exception |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: size-exception
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | MemoryFact API and RLS verification | PR 1 | Single `size:exception`; keep as one commit-ready unit with tests |
| 2 | Review route and log-session draft handoff | PR 1 | Depends on Unit 1 contracts; handoff self-review required |
| 3 | Campaign detail live memories and final gates | PR 1 | Depends on Unit 1 API client |

## Phase 1: Backend RED then GREEN

- [x] 1.1 RED: add `services/api/tests/memory/test_memory_routes.py` for create/list/patch, owner 404s, empty patch rejection, and archived exclusion.
- [x] 1.2 GREEN: create `services/api/app/modules/memory/**` with schemas, contracts, use cases, repository ports, Supabase repository, dependencies, and routes.
- [x] 1.3 RED: extend `services/api/tests/test_rls.py` for `memory_facts` owner CRUD denial and composite FK cross-campaign session rejection; no DDL changes.
- [x] 1.4 GREEN: mount the memory router in `services/api/app/main.py` and update `docs/06-api-contracts.md` with active list endpoint.

## Phase 2: Frontend RED then GREEN

- [x] 2.1 Preflight: fix `.agents/skills/frontend-handoff-contract/references/route-map.md` if it still points `MemoryReview` away from `handoff/app/views-sessions.jsx`.
- [x] 2.2 RED: add Vitest coverage for `apps/web/lib/sessions/memory-review-draft.ts`: scoped write/read, Zod validation, mismatch clearing, and completion clearing.
- [x] 2.3 GREEN: create `apps/web/lib/memory/{schemas,api}.ts` and `apps/web/lib/sessions/memory-review-draft.ts` with locale-safe contracts.
- [x] 2.4 RED: test `apps/web/components/sessions/log-session-form.tsx` stores valid suggestions and navigates to `/campaigns/{id}/memory/review`.
- [x] 2.5 GREEN: wire log-session success to scoped `sessionStorage` handoff and locale-aware navigation.
- [x] 2.6 RED: add route/component tests for loading, backend error/retry, empty pending, empty active, success feedback, busy controls, accept/edit/dismiss/retire.
- [x] 2.7 GREEN: create `apps/web/app/[locale]/campaigns/[id]/memory/review/page.tsx` and focused children using shared button, textarea, empty-state, loading-scribe, notice, origin-badge, AppHeader, and EntityNav.
- [x] 2.8 GREEN: add `.ll-stamp`, `.ll-strike`/slide-out hooks only where needed, preserving reduced-motion and `data-motion` behavior.

## Phase 3: Campaign Detail Integration

- [x] 3.1 RED: test `apps/web/components/campaigns/campaign-detail-view.tsx` renders only active MemoryFacts, empty state, retry error, and Memory navigation.
- [x] 3.2 GREEN: update `campaign-detail-view.tsx`, `entity-nav.tsx`, and memory API usage to replace placeholders with live active memories.
- [x] 3.3 GREEN: update `apps/web/messages/{en,es}.json`; remove hard-coded UI copy and UI em dashes.

## Phase 4: Verification and Handoff Review

- [x] 4.1 Run backend gates from `services/api/`: `uv run ruff check app/ tests/`, `uv run ruff format --check app/ tests/`, `uv run mypy app/ --ignore-missing-imports`, `uv run pytest -m "not dev_inference"`.
- [x] 4.2 Run frontend gates: `pnpm --filter web test`, relevant `pnpm --filter web lint`/typecheck or repo equivalents; scope formatting to touched files only, never `pnpm format`.
- [x] 4.3 Perform frontend-handoff adversarial self-review against `handoff/app/views-sessions.jsx`, `handoff/app/ui.jsx`, and `DESIGN.md`; record every state and fix gaps before completion.

## Verification Remediation

- [x] R1 Update `apply-progress.md` strict TDD evidence to include `SAFETY NET`, `RED`, `GREEN`, `TRIANGULATE`, and `REFACTOR` columns with verifier-compatible statuses.
- [x] R2 Add a RED route test for numeric session display and human-readable active-memory source labels, then remove hard-coded `VII` and raw `source_session_id` display for the current session.
- [x] R3 Add an explicit dismiss assertion proving `createMemoryFact` is not called.
