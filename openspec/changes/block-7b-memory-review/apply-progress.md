# Apply Progress: block-7b-memory-review

## Status

- Mode: Strict TDD
- Delivery strategy: `size:exception` single PR, pre-approved by maintainer
- Completed: Phases 1-4 plus PR #44 Codex review remediation
- Remaining: None in apply phase
- Remediation: Verification report findings addressed for strict TDD evidence, dynamic session display, active-memory source labels, explicit dismiss non-persistence assertion, scoped draft rewrite after partial processing, and mount-safe draft loading.

## TDD Cycle Evidence

| Task | Test File | Layer | SAFETY NET | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|------------|-----|-------|-------------|----------|
| 1.1-1.2 MemoryFact API | `services/api/tests/memory/test_memory_routes.py` | Integration | ✅ Backend route suite baseline captured during full backend gate: 267 passed, 1 deselected | ✅ Written | ✅ Passed: `uv run pytest tests/memory/test_memory_routes.py` (6 passed) | ✅ 6 cases: create, list, patch, owner 404s, empty patch, archived exclusion | ✅ Clean Architecture module mirrors sessions/campaigns patterns |
| 1.3-1.4 RLS and docs | `services/api/tests/test_rls.py` | Integration | ✅ Backend RLS suite baseline captured during full backend gate: 267 passed, 1 deselected | ✅ Written | ✅ Passed: `uv run pytest tests/test_rls.py` (9 passed) | ✅ 2 memory-specific paths: owner CRUD denial and composite FK rejection | ✅ No new DDL; docs clarify active list and PATCH retire |
| 2.2-2.3 Draft handoff/API | `apps/web/tests/sessions/memory-review-draft.test.ts`, `apps/web/tests/memory/api.test.ts` | Unit | ✅ Frontend targeted baseline captured before final full gate: related route/API suites passing | ✅ Written | ✅ Passed: `pnpm --filter web test tests/sessions/memory-review-draft.test.ts tests/memory/api.test.ts` (8 passed) | ✅ 8 cases: scoped draft, invalid clearing, mismatch, completion clearing, create/list/patch, 404/generic errors | ✅ Zod validation protects sessionStorage draft and API payload boundaries |
| 2.4-2.5 Log-session handoff | `apps/web/app/[locale]/campaigns/[id]/sessions/new/__tests__/page.test.tsx` | Integration | ✅ Existing log-session tests run in targeted frontend suite before wiring changes | ✅ Written | ✅ Passed: `pnpm --filter web test app/[locale]/campaigns/[id]/sessions/new/__tests__/page.test.tsx` (5 passed) | ✅ 5 cases including valid suggestion storage and review-route navigation | ✅ Success path writes scoped draft and locale-aware review route |
| 2.6-2.8 Memory Review route | `apps/web/app/[locale]/campaigns/[id]/memory/review/__tests__/page.test.tsx` | Integration | ✅ Existing review-route tests run before remediation: 5 passed; RED remediation added before behavior changes | ✅ Written | ✅ Passed: `pnpm --filter web test app/[locale]/campaigns/[id]/memory/review/__tests__/page.test.tsx` (6 passed) | ✅ 6 cases: loading, error/retry, pending+active rows, empty states, accept/edit/retire, dismiss without create | ✅ Session display/source-label helpers remove hard-coded `VII` and raw source IDs |
| PR #44 P1-P2 review remediation | `apps/web/tests/sessions/memory-review-draft.test.ts`, `apps/web/app/[locale]/campaigns/[id]/memory/review/__tests__/page.test.tsx` | Unit + Integration | ✅ Targeted baseline before new RED: `pnpm --filter web test tests/sessions/memory-review-draft.test.ts app/[locale]/campaigns/[id]/memory/review/__tests__/page.test.tsx` (10 passed) | ✅ Written first: draft rewrite/clear tests plus initial-render no-storage-read and partial-accept rewrite route tests failed before implementation | ✅ Passed: targeted suite now 14 passed | ✅ 4 added cases: rewrite remaining, clear empty remaining, no initial render storage read, partial accept rewrites remaining only | ✅ Draft rewrite helper strips render-only IDs and route defers storage read until after mount |
| 3.1-3.3 Campaign detail active memories | `apps/web/app/[locale]/campaigns/[id]/__tests__/page.test.tsx` | Integration | ✅ Existing campaign-detail suite run in targeted frontend suite before final full gate | ✅ Written | ✅ Passed: `pnpm --filter web test app/[locale]/campaigns/[id]/__tests__/page.test.tsx` (13 passed) | ✅ 13 cases cover detail success, not-found, active memory rows, empty state, retry/error, navigation | ✅ Active memories load via API; EN/ES Campaigns messages added |

## Targeted Verification Completed

- `uv run pytest tests/memory/test_memory_routes.py` — 6 passed
- `uv run pytest tests/test_rls.py` — 9 passed
- `pnpm --filter web test tests/sessions/memory-review-draft.test.ts tests/memory/api.test.ts` — 8 passed
- `pnpm --filter web test app/[locale]/campaigns/[id]/sessions/new/__tests__/page.test.tsx` — 5 passed
- `pnpm --filter web test app/[locale]/campaigns/[id]/memory/review/__tests__/page.test.tsx` — 5 passed
- Remediation RED: `pnpm --filter web test app/[locale]/campaigns/[id]/memory/review/__tests__/page.test.tsx` failed before implementation because the UI still rendered `Session VII` and `Accepted · sess-1`.
- Remediation GREEN: `pnpm --filter web test app/[locale]/campaigns/[id]/memory/review/__tests__/page.test.tsx` — 6 passed after dynamic session display, source labels, and explicit dismiss non-create assertion.
- PR #44 RED: `pnpm --filter web test tests/sessions/memory-review-draft.test.ts app/[locale]/campaigns/[id]/memory/review/__tests__/page.test.tsx` failed before implementation because `rewriteMemoryReviewDraftSuggestions` did not exist and the route still read the draft during initial render.
- PR #44 GREEN: `pnpm --filter web test tests/sessions/memory-review-draft.test.ts app/[locale]/campaigns/[id]/memory/review/__tests__/page.test.tsx` — 14 passed after scoped draft rewrite and mount-safe loading.
- PR #44 frontend gates: `pnpm --filter web lint`, `pnpm --filter web typecheck`, and `pnpm --filter web test` passed: 51 files, 375 tests.
- `pnpm --filter web test app/[locale]/campaigns/[id]/__tests__/page.test.tsx` — 13 passed
- Combined targeted frontend suite — 31 passed
- Backend full gate — `ruff check`, `ruff format --check`, `mypy`, and `pytest -m "not dev_inference"` passed: 267 passed, 1 deselected
- Frontend full gate — `pnpm --filter web test` passed: 371 passed
- Frontend lint/typecheck — `pnpm --filter web lint` passed with 0 warnings and 0 errors; `pnpm --filter web typecheck` passed

## Handoff Self-Review

- Memory Review route matches `handoff/app/views-sessions.jsx`: pending suggestions, accept, edit and accept, dismiss, active memories, retire, back-to-campaign navigation, loading, error, empty pending, and empty active states are implemented.
- Shared production components are used instead of prototype markup: `Button`, `Textarea`, `EmptyState`, `LoadingScribe`, `Notice`, `OriginBadge`, `AppHeader`, and `EntityNav`.
- Motion hooks preserve the prototype semantics: accepted proposals show `.ll-stamp`, dismissed proposals use `.ll-strike` and `.ll-discarding`, and CSS respects `data-motion` plus `prefers-reduced-motion`.
- Product constraint preserved: only accepted or edited content is persisted as `MemoryFact`; raw Scribe suggestions remain transient.

## Notes

- `memory_facts` schema and RLS were verified in the existing initial migration; this change intentionally adds no migration.
- Retire/archive uses `PATCH /memory-facts/{id}` with `status=archived`, not DELETE.
- Direct visits to Memory Review show an empty pending-suggestions state because suggestions remain transient and are only handed off through scoped `sessionStorage` after log-session success.
- Memory Review now uses the stored `session_number` for the header and matching active-memory source labels instead of hard-coded roman numerals or raw `source_session_id` values. Unmatched source sessions intentionally render as a generic linked-session label because the current MemoryFact API does not expose session numbers for arbitrary source sessions.
- PR #44 Codex review remediation: accepting or dismissing one of multiple pending suggestions now rewrites the scoped `sessionStorage` draft to the remaining suggestions, and the draft is cleared when none remain. The review page now starts with empty draft state and reads `sessionStorage` after mount so pre-hydration render does not depend on browser storage.
