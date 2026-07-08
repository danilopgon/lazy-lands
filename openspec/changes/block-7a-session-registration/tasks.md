# Tasks: Block 7a — Session Registration + Rolling Summarization

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 900-1200 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1: backend module + endpoints + tests -> PR 2: frontend screen + i18n + wiring + e2e |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Backend `sessions` module: register/summarize/suggest, both endpoints, unit+integration tests | PR 1 | Independent; base = main (or tracker branch if feature-branch-chain). ~500-650 lines. |
| 2 | Frontend Log Session screen, campaign detail wiring, i18n, e2e | PR 2 | Depends on PR 1 contract (response shape). Base = PR 1 branch or main once merged. ~400-550 lines. |

## Phase 1: Backend Foundation

- [x] 1.1 Scaffold `services/api/app/modules/sessions/` package mirroring campaigns (`domain/`, `application/{commands,queries,read_models}`, `infrastructure/`, `api/schemas/session/`, `prompts/`).
- [x] 1.2 Write `sessions/application/contracts.py`: `MemorySuggestion`, `MemorySuggestionsOutput` (max 5), `CampaignSummaryOutput` (1-6000 chars), `SessionResponse`, `RegisterSessionResponse`.
- [x] 1.3 Write `sessions/domain/ports.py` (repository protocol: `get_next_session_number`, `insert_session`, `list_sessions`, `update_campaign_summary`).
- [x] 1.4 RED: write failing unit test for `infrastructure/repository.py` `MAX(session_number)+1` numbering (first session=1, sequential=2).
- [x] 1.5 GREEN: implement `sessions/infrastructure/repository.py` (Supabase repo: numbering, insert, list, campaign-summary update at repo boundary).

## Phase 2: Register Session Use Case (TDD)

- [x] 2.1 RED: failing unit test — ownership pre-check via `get_campaign`, forged `campaign_id` -> `SessionNotFoundError`/404.
- [x] 2.2 GREEN: implement `sessions/application/commands/register_session.py` persistence-first flow (pre-check -> MAX+1 -> insert -> summarize -> suggest -> return), define `sessions/application/errors.py`.
- [x] 2.3 RED: failing unit test — empty/missing `summary` rejected before persistence (422, no row).
- [x] 2.4 GREEN: enforce required `summary` in `api/schemas/session/requests.py` (`RegisterSessionRequest`).
- [x] 2.5 RED: failing unit test — LLM failure (summarize or suggest) after successful insert still returns persisted session with `memory_suggestions=[]`, no rollback.
- [x] 2.6 GREEN: wrap summarize/suggest calls in `register_session.py` with degrade-to-empty on `LlmOutputValidationError`/provider error; session insert result never rolled back. **Acceptance: LLM-step failure after a successful insert always returns 2xx with the persisted session and `memory_suggestions=[]`; only insert failure surfaces an error response.**

## Phase 3: Summarize Use Case (TDD)

- [x] 3.1 Write `sessions/prompts/summarize_campaign_v1.jinja` (previous `accumulated_summary` + delta sessions since `summarized_up_to_session`).
- [x] 3.2 RED: failing unit test — first session establishes summary, `summarized_up_to_session=1`.
- [x] 3.3 RED: failing unit test — later session folds only the new session into existing summary (delta-only input).
- [x] 3.4 RED: failing unit test — previously skipped sessions self-heal together with the new one.
- [x] 3.5 GREEN: implement `sessions/application/commands/summarize_campaign.py` using `complete_json` + `parse_llm_json` (ADR-09); app sets `summarized_up_to_session`, never LLM-emitted; update via repository dict boundary (Campaign entity untouched).
- [x] 3.6 Register `CampaignSummaryOutput` fixture in `FakeLlmProvider` (sessions conftest — inline per-test registration; no shared sessions conftest was needed).

## Phase 4: Suggest-Memories Use Case (TDD)

- [x] 4.1 Write `sessions/prompts/suggest_memory_facts_v1.jinja` (accumulated_summary, world_state, NPCs, factions, open arcs, new session, active memory facts).
- [x] 4.2 RED: failing unit test — suggest input built via direct relational fetch by `campaign_id` only, no embeddings/vector calls.
- [x] 4.3 RED: failing unit test — 0-5 valid `MemorySuggestion` items returned, never persisted as a side effect (no `memory_facts` row created).
- [x] 4.4 GREEN: implement `sessions/application/queries/get_sessions.py` support data fetch + `sessions/application/commands/suggest_memories.py`.
- [x] 4.5 Register `MemorySuggestionsOutput` fixture in `FakeLlmProvider` (sessions conftest — inline per-test registration; no shared sessions conftest was needed).

## Phase 5: API Endpoints (TDD)

- [x] 5.1 RED: integration test — `POST /campaigns/{id}/sessions` happy path returns `{session_id, session_number, memory_suggestions}`.
- [x] 5.2 RED: integration test — forged `campaign_id` on POST/GET -> 404; unauthenticated -> 401.
- [x] 5.3 RED: integration test — invalid/malformed LLM output on summarize or suggest maps to retryable path without leaking raw output (only when it causes a genuine request failure, i.e. insert itself fails). Covered at the use-case level (`test_register_session.py`'s degrade-to-empty tests) since the persistence-first design means summarize/suggest failures never surface as an HTTP error in 7a — there is no route-level "invalid LLM output -> request failure" path to test.
- [x] 5.4 GREEN: implement `sessions/api/routes.py` (`POST`/`GET /campaigns/{id}/sessions`), `api/dependencies.py`, `api/exception_handlers.py`.
- [x] 5.5 RED: integration test — `GET /campaigns/{id}/sessions` returns chronological ascending order; empty campaign -> `[]`.
- [x] 5.6 GREEN: implement `queries/get_sessions.py` read path + `read_models/session.py`.
- [x] 5.7 Mount sessions router and exception handlers in `services/api/app/main.py`.
- [x] 5.8 Run `uv run ruff check app/`, `uv run ruff format --check app/`, `uv run mypy`, `uv run pytest` from `services/api/` — all green.

## Phase 6: Frontend Log Session Screen (TDD)

- [x] 6.1-6.11 Implemented in PR2. `lib/sessions/{schemas.ts,api.ts}` mirror the backend contract (`RegisterSessionRequest`, `RegisterSessionResponse`, `SessionResponse`, `MemorySuggestion`/`Importance`). `components/sessions/log-session-form.tsx` + `app/[locale]/campaigns/[id]/sessions/new/page.tsx` implement the two in-scope fields (summary required, consequences optional), the `summary-required`/`saving`/`error`/`success` states (react-hook-form + zodResolver + TanStack `useMutation`), the full `LoadingScribe` takeover while saving, and navigation to `/campaigns/:id` on success. Copy localized in `Sessions` namespace (en/es), no em dashes. Tests: `tests/sessions/{schemas,api}.test.ts` + `app/[locale]/campaigns/[id]/sessions/new/__tests__/page.test.tsx` (RED before each component/page existed, GREEN after).

## Phase 7: Campaign Detail Session History Wiring (TDD)

- [x] 7.1-7.3 Implemented in PR2. `components/campaigns/recent-sessions.tsx` wired into `campaign-detail-view.tsx`'s "/02 Recent sessions" section via `useQuery(['campaign', id, 'sessions'], () => getSessions(id))`: empty state (`EmptyState` + "Log session" CTA) when no sessions exist, live list (most recent first, capped at 3) otherwise, replacing the static "Coming in a later chapter" placeholder. A header-level "Log session →" link was added alongside the section heading. Test: `app/[locale]/campaigns/[id]/__tests__/page.test.tsx` updated (existing "2 placeholders" assertion changed to 1 — memories only — plus new empty/list-state tests; RED before the wiring existed, GREEN after).

## Phase 8: Verification & Docs

- [x] 8.1 Verify (do not build) RLS policy exists on `sessions` table in `supabase/migrations/`; document confirmation in the module's test suite or a short comment referencing the migration file. Confirmed 4 policies (`sessions_select/insert/update/delete`) in `supabase/migrations/20260628101707_initial_schema.sql`; added `tests/sessions/test_ownership.py` (mirrors campaigns' `test_ownership.py`) which ran live against the local Supabase stack and passed — a foreign user cannot read another user's session nor insert one under a campaign they don't own.
- [x] 8.2 Add the 7 deferred handoff fields (title, editable session #, world-state/NPC/faction change fields, arcs-touched, private DM notes) to `docs/conventions/handoff-deviations.md`, each with its schema/MVP-scope reason from `design.md`.
- [x] 8.3 Frontend gate run for PR2: `pnpm --filter web test` (343 passed), `pnpm --filter web typecheck` (clean), `pnpm --filter web lint` (0 errors, 1 pre-existing unrelated warning), `pnpm format` applied.
- [x] 8.4 Manual smoke deferred to the user (dev server not started per this batch's instructions); automated coverage (RTL) exercises form/saving/error/summary-required/success-navigation end to end against a mocked API client.

## Design Open Question — Resolved

**Swallow-vs-surface decision (retry after LLM failure):** Persistence-first + degrade-to-empty (already encoded in Phase 2.6). Client retry after an LLM-step failure is a non-issue for 7a: the session was already saved and returned successfully with `memory_suggestions=[]`, so there is nothing to retry — the client has no failure signal to react to. No idempotency-key system is introduced. Only a genuine insert failure (before persistence) surfaces an error to the client, and that failure is naturally retry-safe because no row was created. **Acceptance:** a client that resubmits after seeing a real (pre-insert) error response never produces two rows, because those errors occur before any insert.

**Known limitation (deferred, not request idempotency):** the `unique(campaign_id, session_number)` constraint + retry only prevents `session_number` *collisions* between concurrent inserts. It does NOT provide request-level idempotency: if the insert succeeds but the response is lost (client timeout / dropped connection) and the client retries the same payload, a second distinct session (next `session_number`, same content) is created. In practice the Log Session UI replaces the form with a loader during submit and navigates away on success, so there is no resubmit affordance; true idempotency (e.g. a client-supplied idempotency key deduped server-side) is out of 7a scope and tracked in the backlog (`backlog/deferred-mvp-items`).
