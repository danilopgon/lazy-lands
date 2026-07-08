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

- [ ] 1.1 Scaffold `services/api/app/modules/sessions/` package mirroring campaigns (`domain/`, `application/{commands,queries,read_models}`, `infrastructure/`, `api/schemas/session/`, `prompts/`).
- [ ] 1.2 Write `sessions/application/contracts.py`: `MemorySuggestion`, `MemorySuggestionsOutput` (max 5), `CampaignSummaryOutput` (1-6000 chars), `SessionResponse`, `RegisterSessionResponse`.
- [ ] 1.3 Write `sessions/domain/ports.py` (repository protocol: `get_next_session_number`, `insert_session`, `list_sessions`, `update_campaign_summary`).
- [ ] 1.4 RED: write failing unit test for `infrastructure/repository.py` `MAX(session_number)+1` numbering (first session=1, sequential=2).
- [ ] 1.5 GREEN: implement `sessions/infrastructure/repository.py` (Supabase repo: numbering, insert, list, campaign-summary update at repo boundary).

## Phase 2: Register Session Use Case (TDD)

- [ ] 2.1 RED: failing unit test — ownership pre-check via `get_campaign`, forged `campaign_id` -> `SessionNotFoundError`/404.
- [ ] 2.2 GREEN: implement `sessions/application/commands/register_session.py` persistence-first flow (pre-check -> MAX+1 -> insert -> summarize -> suggest -> return), define `sessions/application/errors.py`.
- [ ] 2.3 RED: failing unit test — empty/missing `summary` rejected before persistence (422, no row).
- [ ] 2.4 GREEN: enforce required `summary` in `api/schemas/session/requests.py` (`RegisterSessionRequest`).
- [ ] 2.5 RED: failing unit test — LLM failure (summarize or suggest) after successful insert still returns persisted session with `memory_suggestions=[]`, no rollback.
- [ ] 2.6 GREEN: wrap summarize/suggest calls in `register_session.py` with degrade-to-empty on `LlmOutputValidationError`/provider error; session insert result never rolled back. **Acceptance: LLM-step failure after a successful insert always returns 2xx with the persisted session and `memory_suggestions=[]`; only insert failure surfaces an error response.**

## Phase 3: Summarize Use Case (TDD)

- [ ] 3.1 Write `sessions/prompts/summarize_campaign_v1.jinja` (previous `accumulated_summary` + delta sessions since `summarized_up_to_session`).
- [ ] 3.2 RED: failing unit test — first session establishes summary, `summarized_up_to_session=1`.
- [ ] 3.3 RED: failing unit test — later session folds only the new session into existing summary (delta-only input).
- [ ] 3.4 RED: failing unit test — previously skipped sessions self-heal together with the new one.
- [ ] 3.5 GREEN: implement `sessions/application/commands/summarize_campaign.py` using `complete_json` + `parse_llm_json` (ADR-09); app sets `summarized_up_to_session`, never LLM-emitted; update via repository dict boundary (Campaign entity untouched).
- [ ] 3.6 Register `CampaignSummaryOutput` fixture in `FakeLlmProvider` (sessions conftest).

## Phase 4: Suggest-Memories Use Case (TDD)

- [ ] 4.1 Write `sessions/prompts/suggest_memory_facts_v1.jinja` (accumulated_summary, world_state, NPCs, factions, open arcs, new session, active memory facts).
- [ ] 4.2 RED: failing unit test — suggest input built via direct relational fetch by `campaign_id` only, no embeddings/vector calls.
- [ ] 4.3 RED: failing unit test — 0-5 valid `MemorySuggestion` items returned, never persisted as a side effect (no `memory_facts` row created).
- [ ] 4.4 GREEN: implement `sessions/application/queries/get_sessions.py` support data fetch + `sessions/application/commands/suggest_memories.py`.
- [ ] 4.5 Register `MemorySuggestionsOutput` fixture in `FakeLlmProvider` (sessions conftest).

## Phase 5: API Endpoints (TDD)

- [ ] 5.1 RED: integration test — `POST /campaigns/{id}/sessions` happy path returns `{session_id, session_number, memory_suggestions}`.
- [ ] 5.2 RED: integration test — forged `campaign_id` on POST/GET -> 404; unauthenticated -> 401.
- [ ] 5.3 RED: integration test — invalid/malformed LLM output on summarize or suggest maps to retryable path without leaking raw output (only when it causes a genuine request failure, i.e. insert itself fails).
- [ ] 5.4 GREEN: implement `sessions/api/routes.py` (`POST`/`GET /campaigns/{id}/sessions`), `api/dependencies.py`, `api/exception_handlers.py`.
- [ ] 5.5 RED: integration test — `GET /campaigns/{id}/sessions` returns chronological ascending order; empty campaign -> `[]`.
- [ ] 5.6 GREEN: implement `queries/get_sessions.py` read path + `read_models/session.py`.
- [ ] 5.7 Mount sessions router and exception handlers in `services/api/app/main.py`.
- [ ] 5.8 Run `uv run ruff check app/`, `uv run ruff format --check app/`, `uv run mypy`, `uv run pytest` from `services/api/` — all green.

## Phase 6: Frontend Log Session Screen (TDD)

- [ ] 6.1 Write Zod schemas mirroring `RegisterSessionRequest`/`RegisterSessionResponse` in `apps/web/lib/sessions/schemas.ts`.
- [ ] 6.2 Write `apps/web/lib/sessions/api.ts` (POST/GET client calls).
- [ ] 6.3 Add `Sessions` namespace copy (EN) to `apps/web/messages/en.json`: breadcrumb, kicker "After the table clears", H1 "Log what happened", subtitle, field labels, submit "Save session & review memories", validation error, saving copy "Chronicling the session", error-state copy "Your text is safe; nothing you wrote was lost. Try again."
- [ ] 6.4 Add matching ES copy to `apps/web/messages/es.json` (use "Dungeon Master"/"DM", no em dashes).
- [ ] 6.5 RED: failing component test — form renders only `summary` (required) + `consequences` (optional) fields, no Session title/# input.
- [ ] 6.6 RED: failing component test — empty summary submit shows field error and blocks request (summary-required state).
- [ ] 6.7 RED: failing component test — saving state shows `Loading` (quill) and disables fields.
- [ ] 6.8 RED: failing component test — failure state shows `ErrorNotice` with retry, typed summary/consequences preserved.
- [ ] 6.9 RED: failing component test — success navigates to `/campaigns/[locale?]/campaigns/:id` (not `/memory/review`).
- [ ] 6.10 GREEN: implement `apps/web/app/campaigns/[locale?]/campaigns/[id]/sessions/new/page.tsx` (RSC fetch campaign name) + `LogSessionView` client island using `Shell`, `Kicker`, `Field`, `Loading`, `ErrorNotice`, `useTransition`.
- [ ] 6.11 Apply `fadeInRise` entrance, standard button press physics, quill loading motion; verify `prefers-reduced-motion`/`data-motion` suppression.

## Phase 7: Campaign Detail Session History Wiring (TDD)

- [ ] 7.1 RED: failing component test — "Recent sessions" section renders live sessions from `GET /campaigns/{id}/sessions` (placeholder removed).
- [ ] 7.2 RED: failing component test — 0 sessions renders empty state + "Log session" CTA linking to `sessions/new`.
- [ ] 7.3 GREEN: wire `campaign-detail-view.tsx` to `apps/web/lib/sessions/api.ts`, replacing the static placeholder.

## Phase 8: Verification & Docs

- [ ] 8.1 Verify (do not build) RLS policy exists on `sessions` table in `supabase/migrations/`; document confirmation in the module's test suite or a short comment referencing the migration file.
- [ ] 8.2 Add the 7 deferred handoff fields (title, editable session #, world-state/NPC/faction change fields, arcs-touched, private DM notes) to `docs/conventions/handoff-deviations.md`, each with its schema/MVP-scope reason from `design.md`.
- [ ] 8.3 Run `pnpm --filter web typecheck`, `pnpm --filter web lint`, `pnpm test`, `pnpm format:check` — all green.
- [ ] 8.4 Full-stack manual smoke: register a session end-to-end (form -> API -> DB -> detail view refresh) against local Supabase.

## Design Open Question — Resolved

**Swallow-vs-surface decision (retry after LLM failure):** Persistence-first + degrade-to-empty (already encoded in Phase 2.6). Client retry after an LLM-step failure is a non-issue for 7a: the session was already saved and returned successfully with `memory_suggestions=[]`, so there is nothing to retry — the client has no failure signal to react to. No idempotency-key system is introduced. Only a genuine insert failure (before persistence) surfaces an error to the client, and that failure is naturally retry-safe because no row was created. **Acceptance: a client that resubmits after seeing a real error response never produces two rows for what the user intended as one session, because the only surfaced errors occur before any insert.**
