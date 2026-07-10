# Proposal: Block 8 — Session Generation and Editing

## Intent

Deliver the **Generate** step of the critical path (Login → Campaign → Session → Memory → **Generate → Export**). The DM can request a structured next-session proposal from the Scribe (the LLM), preview the draft, edit any section inline, and save the finalised version. Per `docs/10-roadmap.md` (Block 8), `docs/05-ai-system.md`, `docs/06-api-contracts.md`, and the `handoff/app/views-prepare.jsx` prototypes.

Generation context includes `accumulated_summary`, NPCs, factions, open arcs, and active `MemoryFacts` — a direct relational fetch with token estimation and oversized-context warning, never RAG/embeddings.

## Scope

### In Scope
- `POST /campaigns/{campaign_id}/generate-session` — validates ownership, builds prompt context, calls LLM via `complete_json`, validates output against `GeneratedSessionOutput` Pydantic model, persists draft session with `generated_content` + `trace_json`.
- `GenerateNextSessionUseCase` — in the existing `generation/` module (ADR-05). Builds context from campaign + NPCs + factions + open arcs + active MemoryFacts.
- `PATCH /sessions/{session_id}` — persisted section-level edits with serialized `"edited"` provenance.
- `GET /sessions/{session_id}` — fetch a single session with full `generated_content` for the editing view.
- Trace metadata per generation call: provider, model, prompt_version, context_size, duration_ms, error code — stored in `sessions.trace_json`.
- Frontend Prepare page (`/campaigns/[id]/prepare`) matching the `PrepareSession` handoff.
- Frontend Generated Session view (`/campaigns/[id]/sessions/[sessionId]`) matching the `GeneratedSession` handoff, with inline editing, per-section origin badges (`✦ Scribe` / `✎ Edited by you`), continuity links to active memories, and save/copy actions.
- Prompt template `generate_session_v1.jinja` under `generation/prompts/`.

### Out of Scope (→ Block 9)
- PDF export (`GET /sessions/{id}/export.pdf`).
- Copy-to-clipboard is a frontend-only concern (solved in-handoff with `navigator.clipboard`).

### Non-Goals (hard)
- **NO RAG, embeddings, or vector DB.** Context is built by direct relational fetch only.
- **NO per-section regeneration** from the LLM (handoff prototype shows UI for it; deferred as post-MVP enhancement).
- **NO private DM notes persistence** on the session model — notes are frontend-only (handoff shows them excluded from PDF). If stored later, a new column with separate RLS is needed.
- **NO new migration for schema** — `sessions` table already has `generated_content` (jsonb) and `trace_json` (jsonb) columns from the initial migration. No DDL changes.
- **NO changes to how `accumulated_summary` is maintained** (that is Block 7/RegisterSession's responsibility).

## Capabilities

### New Capabilities
- `session-generation`: Generate endpoint, use case, context builder, prompt, Pydantic validation, trace persistence, and draft session creation.
- `session-editing`: PATCH endpoint, per-section serialized origin provenance (`"scribe"`/`"edited"`), inline editing UI, origin badges.
- `session-read`: GET single session (by id) with full generated_content for the editing view.
- `session-generation-ui`: Prepare page form (direction params, context preview, loading/error states).
- `generated-session-ui`: Generated session view with inline editing, origin badges, memories sidebar, save/copy actions.

### Modified Capabilities
- None.

## Approach

### Module placement: `generation/` (new module)

The existing `generation/` module skeleton under `services/api/app/modules/generation/` is the correct home per ADR-05. It owns the generation domain (prompt, output model, use case) separately from `sessions/` which owns registration and summarization. Cross-module dependency rules (ADR-05 rule 1) mean `generation/` defines its own `GenerationRepository` port in `domain/ports.py` with a `get_generation_context()` method. The infrastructure implementation queries Supabase directly (five SELECTs: campaign, NPCs, factions, open arcs, active MemoryFacts) — minimal duplication of the existing `sessions/infrastructure/repository.py` `get_suggestion_context()` pattern, which is acceptable for bounded-context separation.

### Context building strategy

The `GenerateNextSessionUseCase` calls `GenerationRepository.get_generation_context(campaign_id)` which returns:
- Campaign: `accumulated_summary`, `world_state`, `title`, `description`, `summarized_up_to_session`
- NPCs: `name`, `description`, `current_state`, `motivation`
- Factions: `name`, `description`, `current_stance`, `goals`
- Open arcs (status=`active`): `title`, `description`, `priority`
- Active MemoryFacts (status=`active`): `content`, `type`, `importance`

The use case renders these into a prompt via `render_prompt("generate_session_v1.jinja", ...)`, estimates token count with a lightweight heuristic, and logs an oversized-context warning when the estimate exceeds the configured budget. The last session is already included in `accumulated_summary` — not provided separately to avoid double-counting. Unaccepted suggestions are excluded. The prompt is not hard-truncated to 2,000 tokens.

### Token estimation guard

The use case estimates token count using a simple heuristic (`len(text) // 4`) and logs a warning if the estimate exceeds a configurable `MAX_GENERATION_TOKENS` (default 2,000). The prompt is still sent to the LLM (no hard truncation — the DM's full context is valuable), but an oversized-context warning is included in trace metadata.

### Trace persistence

After the LLM call, the use case builds a trace dict with: `provider`, `model`, `prompt_version`, `estimated_context_size`, `duration_ms`, `error_code` (null on success). This is stored alongside `generated_content` on the session row in the `trace_json` column. The route returns a `trace_id` (= session id) to the frontend.

### Draft vs final lifecycle

1. `POST /campaigns/{id}/generate-session` creates a **draft session** with `generated_content` populated, `trace_json` populated, `summary` = synopsis (auto-filled from the generated content), `consequences` = null. A sequential `session_number` is assigned (reusing `insert_session_with_next_number` from the sessions repo — the generation module calls it through its own repo protocol). The DM can later edit and add consequences.
2. Frontend renders the draft via `GET /sessions/{session_id}`.
3. `PATCH /sessions/{session_id}` updates the `generated_content` with edited sections (origin badge flips to serialized `"edited"` for edited sections). Can also update `summary`, `consequences`.

### Frontend routing

| Route | Component | Handoff |
|-------|-----------|---------|
| `/campaigns/[id]/prepare` | `PrepareSessionPage` | `PrepareSession` |
| `/campaigns/[id]/sessions/[sessionId]` | `GeneratedSessionPage` | `GeneratedSession` |

The Prepare page calls `POST /campaigns/{id}/generate-session` with optional direction params (tone, pace, difficulty, additional_instructions). On success, it redirects to the Generated Session view. The Generated Session view fetches via `GET /sessions/{sessionId}`, renders sections with `OriginBadge`, supports inline editing with save via `PATCH /sessions/{sessionId}`, and shows continuity links to active memories.

### Error handling during generation

If the LLM output fails Pydantic validation (`LlmOutputValidationError`), the error propagates to the existing 422 handler (retryable). The session is NOT persisted — no invalid data is stored. The frontend shows `ErrorNotice` with a retry button (matching the handoff prototype). If the session insert fails (race condition, DB error), a retryable 409 is returned.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `services/api/app/modules/generation/domain/` | New | `GeneratedSessionOutput`, sub-models with serialized origin strings, `GenerationRepository` port |
| `services/api/app/modules/generation/application/generate_session.py` | New | `GenerateNextSessionUseCase` |
| `services/api/app/modules/generation/infrastructure/repository.py` | New | Supabase implementation of `GenerationRepository` |
| `services/api/app/modules/generation/api/routes.py` | New | `POST /campaigns/{id}/generate-session` |
| `services/api/app/modules/generation/api/schemas.py` | New | Request/response schemas |
| `services/api/app/modules/generation/api/dependencies.py` | New | DI wiring |
| `services/api/app/modules/generation/prompts/generate_session_v1.jinja` | New | Generation prompt template |
| `services/api/app/modules/sessions/api/routes.py` | Modified | Add `PATCH /sessions/{id}`, `GET /sessions/{id}` |
| `services/api/app/modules/sessions/domain/ports.py` | Modified | Add `update_session` method to `SessionRepository` |
| `services/api/app/modules/sessions/infrastructure/repository.py` | Modified | Implement `update_session` |
| `services/api/app/modules/sessions/api/schemas/session/requests.py` | Modified | Add update request schema |
| `services/api/app/main.py` | Modified | Mount `generation` router |
| `apps/web/app/[locale]/campaigns/[id]/prepare/page.tsx` | New | Prepare next-session page |
| `apps/web/app/[locale]/campaigns/[id]/sessions/[sessionId]/page.tsx` | New | Generated session view page |
| `apps/web/components/sessions/prepare-session-form.tsx` | New | Prepare form component |
| `apps/web/components/sessions/generated-session-view.tsx` | New | Generated session view component |
| `apps/web/lib/sessions/api.ts` | New | API client for generate, get, update session |
| `apps/web/messages/*.json` | Modified | i18n for new screens |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Generation prompt exceeds 2,000 tokens with large campaigns | Medium | Estimate tokens pre-call; log warning in trace; prompt is still sent (no hard truncation); document guideline in the template comment |
| LLM output fails Pydantic validation on complex nested structures (encounters, faction_reactions) | Medium | `LlmOutputValidationError` already returns retryable 422; frontend shows retry notice matching handoff |
| Race condition on session_number for generated vs played sessions | Low | Reuse `insert_session_with_next_number` pattern with retry (existing hardening from 7a) |
| Per-section origin tracking adds complexity to the PATCH contract | Medium | Origin is pushed from the frontend (the UI knows what was edited); backend stores the full `generated_content` object as-is — no server-side diffing |
| Large PR (full-stack: backend module + routes + frontend 2 pages) | High | Split into chained PRs: (1) backend generation module + routes, (2) frontend prepare + generated session pages + existing session PATCH |

## Rollback Plan

Unmount the `generation` router in `main.py`, revert `PATCH /sessions/{id}` and `GET /sessions/{id}` additions, and remove frontend routes (`/campaigns/[id]/prepare/`, `/campaigns/[id]/sessions/[sessionId]/`). No schema migration to revert (no DDL changes). Any generated draft sessions remain in the `sessions` table as orphans — can be cleaned up manually or left (they have `generated_content` populated but no impact on existing flows).

## Dependencies

- Existing `sessions` table with `generated_content` (jsonb) and `trace_json` (jsonb) columns — already present in the initial migration.
- Existing `SessionRepository.get_suggestion_context()` pattern as a reference for `GenerationRepository.get_generation_context()`.
- Existing `LlmProvider` port + `complete_json` + `parse_llm_json` guard + `render_prompt` — no new LLM infrastructure.
- Handoff prototypes: `handoff/app/views-prepare.jsx` (`PrepareSession`, `GeneratedSession`), `handoff/app/ui.jsx` (shared components: `OriginBadge`, `Loading`, `ErrorNotice`, `Field`).
- No external API keys or services beyond the existing LLM provider.

## Success Criteria

- [ ] `POST /campaigns/{id}/generate-session` validates ownership, builds context from campaign + NPCs + factions + arcs + memory_facts, calls LLM, validates output, persists draft session with `generated_content` + `trace_json`, returns session_id.
- [ ] Generation context NEVER includes unaccepted MemorySuggestions (only active MemoryFacts).
- [ ] Session is created with sequential `session_number` that does not conflict with played sessions.
- [ ] Invalid LLM output returns retryable 422; no draft session persisted on failure; frontend shows retry notice.
- [ ] `PATCH /sessions/{id}` accepts partial updates to `generated_content`, `summary`, `consequences`; edited sections carry serialized `"edited"` origin.
- [ ] `GET /sessions/{id}` returns a single session with full `generated_content`.
- [ ] Generate-prompt template documented in `docs/05-ai-system.md` under "Prompt: generate next session".
- [ ] Prepare page matches `PrepareSession` handoff (direction form fields, context preview panel, loading/error states).
- [ ] Generated Session view matches `GeneratedSession` handoff (inline editing, per-section origin badges, memories sidebar, copy all, save).
- [ ] All LLM outputs Pydantic-validated; raw output never leaked.
- [ ] Existing test suite remains green; new tests cover generation use case with `FakeLlmProvider`, validation edge cases, and PATCH ownership guard.
