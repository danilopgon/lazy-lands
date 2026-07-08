# Proposal: Block 7a — Session Registration + Rolling Summarization

## Intent

Deliver the **Session** step of the critical path (Login → Campaign → **Session** → Memory → Generate). Today the campaign detail page shows dimmed "coming later" slots for sessions; DMs cannot record what happened. This change lets a DM log a played session, keeps the campaign's rolling `accumulated_summary` current (ADR-01), and returns 0–5 transient `MemorySuggestion` objects for later DM review (ADR-08). Docs: `docs/10-roadmap.md` (Block 7), `docs/05-ai-system.md`, `docs/06-api-contracts.md`.

## Scope

### In Scope
- `POST /campaigns/{campaign_id}/sessions`: persist session with sequential `session_number`; run `SummarizeCampaignUseCase` (updates `accumulated_summary`, sets `summarized_up_to_session = N`); run `SuggestMemoriesUseCase`; return `{session_id, session_number, memory_suggestions}`.
- `GET /campaigns/{campaign_id}/sessions`: chronological history.
- Two Pydantic contracts (`CampaignSummaryOutput`, `MemorySuggestionsOutput`) + two Jinja prompts under `sessions/prompts/`.
- Frontend Log Session screen (`handoff/app/views-sessions.jsx` → `LogSession`) + session-history wiring on campaign detail.
- Verify (not build) RLS on `sessions`.

### Out of Scope (→ block-7b-memory-review)
- Accepting/rejecting/editing suggestions; `POST /campaigns/{id}/memory-facts`; `PATCH /memory-facts/{id}`; Memory Review UI; wiring "active memories" slot.

## Non-Goals (hard)
- **NO RAG, embeddings, or vector DB.** Suggestion prompt input is built by DIRECT relational fetch by `campaign_id` (existing state + new session), never semantic retrieval (ADR-01/08).
- `MemorySuggestion` is TRANSIENT — never a table, never persisted by this endpoint.
- No new migration for schema/RLS (already live since initial migration).

## Capabilities

### New Capabilities
- `session-registration`: sessions POST/GET, sequential numbering, ownership pre-check, RLS verification.
- `campaign-summarization`: rolling accumulated-summary use case (ADR-01).
- `memory-suggestions`: transient suggest-memories use case (ADR-08), returned not stored.
- `session-log-ui`: Log Session form + session-history rendering.

### Modified Capabilities
- None.

## Approach
Follow the campaigns-module hexagonal template (ADR-05): domain/application/infrastructure/api split under `modules/sessions/`. Reuse the existing LLM seam (`complete_json` + `parse_llm_json`) — zero new LLM infra. Every LLM output validated via Pydantic before store/return (ADR-09); raw output never leaked. Auth/RLS via `get_user_supabase_client` + app-layer ownership pre-check (forged `campaign_id` → 404), copied exactly from campaigns.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `services/api/app/modules/sessions/**` | New | Domain, use cases, repository, routes, schemas, prompts |
| `services/api/app/main.py` | Modified | Mount sessions router |
| `apps/web/app/[locale]/campaigns/[id]/sessions/new` | New | Log Session route |
| campaign detail | Modified | Wire session-history slot |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Implementer reaches for embeddings for "existing campaign state" | Med | Non-goal stated explicitly; design must name direct relational fetch |
| Concurrent writes duplicate `session_number` | Low | Flag for design (DB-side sequencing vs. count) |
| Summarize latency added to save flow | Med | Bounded ~300–400 tokens; async deferral noted post-MVP (ADR-01) |

## Open Questions (for design phase)
- Extend frozen `Campaign` domain entity with `accumulated_summary`/`summarized_up_to_session`, or continue the dict-at-repository-boundary pattern (Block 6 `system`/`tone` precedent)?
- `session_number` assignment under concurrency.
- Contract is `{summary, consequences}`; handoff form has richer fields (world/NPC/faction/arc/notes) — fold into `consequences` vs. defer.
- Where returned `memory_suggestions` land in 7a (review UI is 7b) — 7a/7b seam.

## Rollback Plan
Unmount sessions router in `main.py` and remove `modules/sessions/**` + frontend route; no schema/data migration to revert (schema pre-exists, no writes to new tables beyond `sessions` inserts).

## Success Criteria
- [ ] `POST` persists a session, updates `accumulated_summary` + `summarized_up_to_session`, returns 0–5 suggestions; no `memory_facts` row created.
- [ ] `GET` returns chronological sessions for owner only; forged `campaign_id` → 404.
- [ ] All LLM outputs Pydantic-validated; invalid output → retryable error, raw output not leaked.
- [ ] Log Session screen matches handoff; history slot renders live.
