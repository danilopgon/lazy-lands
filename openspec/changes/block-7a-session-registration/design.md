# Design: Block 7a — Session Registration + Rolling Summarization

## Technical Approach

Add a `sessions` module mirroring the `campaigns` hexagonal template (ADR-05):
`domain / application / infrastructure / api`, plus `prompts/`. `POST /campaigns/{campaign_id}/sessions`
persists a session (server-assigned `session_number`), then runs summarize and suggest use cases
synchronously in the same request, reusing the existing LLM seam (`complete_json` + `parse_llm_json`,
ADR-09). `GET /campaigns/{campaign_id}/sessions` returns chronological history. No migration: the
schema and RLS have existed since the initial migration. Auth/ownership copies the campaigns pattern
(`get_user_supabase_client` + app-layer `get_campaign` pre-check → forged id = 404).

## Confirmed `sessions` DDL (source of the field-mapping decision)

From `supabase/migrations/20260628101707_initial_schema.sql` (lines 51-63), verbatim columns:
`id uuid pk`, `campaign_id uuid fk`, `session_number integer not null`, `summary text`,
`consequences text`, `generated_content jsonb`, `trace_json jsonb`, `created_at`, `updated_at`.
The ONLY session unique constraint is `sessions_campaign_id_id_key unique (campaign_id, id)`.
**There is NO `unique (campaign_id, session_number)` constraint** — this corrects an upstream
assumption and drives Decision 3 below.

## Architecture Decisions

### Decision 1 — Two-field contract (summary + consequences)
**Choice**: Persist `summary` (required) + `consequences` (optional) only, 1:1 to columns; request
body `{summary, consequences}` (docs/06). **Alternatives**: concatenate the extra handoff textareas
into `consequences`; add columns via migration. **Rationale**: Block 7 roadmap contract is exactly
two free-text fields (world-state folded into "consequences" by the roadmap's own wording); no
migration in 7a; concatenation is lossy and hard to reverse. One summary textarea, one consequences
textarea, verbatim.

### Decision 2 — `session_number` server-assigned via MAX+1
**Choice**: Repository computes `MAX(session_number)+1` (scoped by `campaign_id` under RLS) and
inserts. **Alternatives**: DB sequence/default; unique-constraint + insert-retry. **Rationale**: no
`unique(campaign_id, session_number)` exists, so there is nothing to conflict-retry on without a
migration (out of scope). Single-DM-per-campaign MVP makes concurrent same-campaign inserts
negligible. Documented race + hardening path (add the unique constraint + retry) recorded as an Open
Question; the handoff's editable "Session #" input is a deviation — the number is backend-assigned.

### Decision 3 — Campaign summary state at the repository boundary
**Choice**: Do NOT extend the frozen `Campaign` domain entity. Read/update `accumulated_summary` and
`summarized_up_to_session` as dict fields at the repository boundary (Block 6 `system`/`tone`
precedent). **Rationale**: consistency with the established pattern; keeps a sessions-module concern
off a shared frozen aggregate.

### Decision 4 — Persistence-first ordering, LLM steps degrade gracefully
**Choice**: (1) ownership pre-check → 404; (2) MAX+1; (3) INSERT session row; (4) summarize → update
campaign summary; (5) suggest → transient; (6) return. If step 4/5 raises `LlmOutputValidationError`,
the session row is already durable ("Your text is safe; nothing you wrote was lost"). `summarize`
input is `previous accumulated_summary + all sessions with number > summarized_up_to_session`, so a
failed/skipped summary self-heals on the next session. `summarized_up_to_session` is set app-side to
`session_number` (deterministic, not LLM-emitted). **Rationale**: recording a session must never be
blocked by Scribe availability (PRODUCT: the DM always records). On LLM failure the endpoint reuses
the Block 5 `LlmOutputValidationError` → retryable 422 mapping, raw output never leaked; the frontend
shows the handoff error state and retry is safe (see Open Questions on retry idempotency).

## Data Flow

    POST /campaigns/{id}/sessions
      route → RegisterSession use case
        repo.get_campaign(id) ─ None → CampaignNotFoundError(404)
        repo.next_session_number(id)  (MAX+1)
        repo.insert_session(id, n, summary, consequences) ─→ session_id
        SummarizeCampaign(prev_summary, unsummarized_sessions) ─ LLM → repo.update_campaign_summary
        SuggestMemories(session, campaign_state, npcs, factions, open_arcs, active_facts) ─ LLM
      → { session_id, session_number, memory_suggestions[] }   # suggestions transient (ADR-08)

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `modules/sessions/domain/ports.py` | Create | `SessionRepository` Protocol |
| `modules/sessions/application/contracts.py` | Create | `CampaignSummaryOutput`, `MemorySuggestionsOutput`, `MemorySuggestion` |
| `modules/sessions/application/commands/register_session.py` | Create | Orchestrates persist → summarize → suggest |
| `modules/sessions/application/commands/summarize_campaign.py` | Create | LLM-only rolling summary use case |
| `modules/sessions/application/commands/suggest_memories.py` | Create | LLM-only transient suggestions |
| `modules/sessions/application/queries/get_sessions.py` | Create | Chronological history |
| `modules/sessions/application/read_models/session.py` | Create | `SessionResponse`, `RegisterSessionResponse` |
| `modules/sessions/application/errors.py` | Create | `SessionNotFoundError`, `SessionPersistenceError` |
| `modules/sessions/infrastructure/repository.py` | Create | `SupabaseSessionRepository` (per-user client) |
| `modules/sessions/api/{routes,dependencies,exception_handlers}.py` | Create | Router + providers + handlers |
| `modules/sessions/api/schemas/session/requests.py` | Create | `RegisterSessionRequest {summary, consequences?}` |
| `modules/sessions/prompts/summarize_campaign_v1.jinja` | Create | Summarize template |
| `modules/sessions/prompts/suggest_memory_facts_v1.jinja` | Create | Suggest template |
| `app/main.py` | Modify | Mount sessions router + exception handlers |
| `apps/web/lib/sessions/{api.ts,schemas}` | Create | Client + Zod schemas |
| `apps/web/.../campaigns/[id]/sessions/new/page.tsx` + `LogSessionView` | Create | Log Session route |
| `apps/web/components/campaigns/campaign-detail-view.tsx` | Modify | Wire "/02 Recent sessions" live + "Log session" CTA |
| `apps/web/messages/{en,es}.json` | Modify | `Sessions` namespace copy |

## Interfaces / Contracts

```python
class MemorySuggestion(BaseModel):        # transient (ADR-08); never a table
    content: str; type: str
    importance: Importance                # low|medium|high enum (reuse domain)
    reason: str
    related: list[str] = Field(default_factory=list, max_length=20)  # optional, for 7b

class MemorySuggestionsOutput(BaseModel):  # LLM target
    suggestions: list[MemorySuggestion] = Field(default_factory=list, max_length=5)

class CampaignSummaryOutput(BaseModel):    # LLM target; app sets summarized_up_to_session
    accumulated_summary: str = Field(min_length=1, max_length=6000)

class SessionResponse(BaseModel):          # GET history row
    id: str; session_number: int; summary: str | None; consequences: str | None; created_at: str

class RegisterSessionResponse(BaseModel):
    session_id: str; session_number: int; memory_suggestions: list[MemorySuggestion]
```
Suggest input built by DIRECT relational fetch by `campaign_id` (accumulated_summary, world_state,
NPCs, factions, open arcs, new session, active memory_facts) — **NOT RAG/embeddings/vector search
(explicit non-goal)**. FakeLlmProvider registrations (sessions `conftest`):
`register(CampaignSummaryOutput, {...})`, `register(MemorySuggestionsOutput, {"suggestions": [...]})`.

## Handoff deviations (forced by schema + MVP scope)

`handoff/` is a visual reference, not a production contract. Deferred beyond 7a:

| Handoff field | Disposition | Reason |
|---------------|-------------|--------|
| `title` (session title) | Dropped | No column; sessions identified by `session_number`; future migration |
| editable `Session #` | Dropped as input | `session_number` is backend-assigned (Decision 2) |
| `world` (world changes) | Folded conceptually into `consequences` | Roadmap folds world-state into the consequences field; single textarea |
| `npcs` / `factions` changes | Dropped | No columns; structured entity-diff is post-MVP |
| `arcs touched` (multi-select) | Dropped | Needs a session↔arc join table (migration); belongs to memory linking (7b+) |
| `Private DM notes` | Dropped | No column, no migration; the "never-to-LLM/never-exported" boundary is out of 7a |

## 7a→7b seam

Suggest-memories runs INSIDE the 7a endpoint and returns 0–5 transient suggestions (roadmap's single
endpoint does persist→summarize→suggest). On successful save the frontend navigates to CAMPAIGN
DETAIL (`/campaigns/:id`), NOT `/memory/review` (which does not exist until 7b). The returned
`memory_suggestions` have NO UI consumer in 7a — they are backend-tested only; 7b builds the review
screen that consumes this exact response shape.

## UI Section (handoff checklist)

Route `/campaigns/:id/sessions/new` → `LogSessionView`. Chrome: breadcrumb "Campaigns / {name} / Log
session"; Kicker "After the table clears"; H1 "Log what happened"; sub as specified; accent submit
"Save session & review memories". Shared components: `Shell`, `Kicker`, `Field` (label/optional/help/
error), `Loading`, `ErrorNotice`. Fields (7a): `summary` textarea (required) + `consequences`
textarea (optional). States: **form / saving** (full `Loading` — "Chronicling the session" / "Saving
your record and asking the Scribe what's worth remembering", quill motion) / **error** (`ErrorNotice`
+ retry, text preserved) / **summary-required** ("The summary is the one thing the Scribe can't work
without."). Motion: route enter `fadeInRise`, button press physics, quill loading. Data fetching per
`vercel-react-best-practices`: server-fetch campaign name in the page (RSC), client form island for
state; `useTransition` for the saving state. All copy localized EN + ES (`Sessions` namespace); ES
uses "Dungeon Master"/"DM"; NO em dashes. Campaign detail "/02 Recent sessions" slot replaces the
"coming soon" placeholder with the live `GET` list + a "Log session" CTA.

## Testing Strategy

| Layer | What | Approach |
|-------|------|----------|
| Unit | summarize/suggest use cases; MAX+1; ownership 404; Pydantic validation; persistence-first degrade | pytest + FakeLlmProvider registrations |
| Integration | `POST`/`GET` routes; RLS (forged id → 404; non-owner isolation); LLM fail → 422 no raw leak | pytest + per-user client / `SET ROLE` |
| E2E | Log Session form/saving/error/summary-required; navigate to campaign detail; history renders | Playwright |

Strict TDD: failing test first.

## Migration / Rollout

No DB migration (schema + RLS pre-exist; verify-only). Rollback: unmount router in `main.py`, remove
`modules/sessions/**` + frontend route; session inserts are the only new writes.

## Open Questions

- [ ] Retry idempotency: persistence-first means a client retry after an LLM failure could insert a
  duplicate session. 7a mitigation = degrade gracefully (LLM failure does not surface the full error
  state; only session-insert failure does). Confirm in tasks whether summarize/suggest failures are
  swallowed (session saved, empty suggestions) vs surfaced as retryable 422.
- [ ] Hardening: add `unique(campaign_id, session_number)` + insert-retry in a future migration.
