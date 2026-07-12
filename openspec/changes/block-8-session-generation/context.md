# Block 8 — Session Generation and Editing (SDD kickoff context)

> **This is a handoff brief prepared by the orchestrator so a fresh agent can start `sdd-apply`.**
> Read it fully, then run `sdd-apply` for the first work unit (PR 1: backend). Mirror of this doc
> is in Engram at topic_key `sdd/block-8-session-generation/context` (project `lazy-lands`).

## What Block 8 is

Block 8 lets the DM request a structured **next-session proposal** from the Scribe (LLM), preview
the generated draft, edit any section inline with provenance tracking (`✦ Scribe` / `✎ Edited by
you`), and save the finalised version. This completes the **Generate** step of the DM's critical
path: Log session → Review memories → **Generate next session** → Edit → Export PDF (Block 9).

### In scope
- **Backend `generation/` module**: `GenerateNextSessionUseCase` builds prompt context
  (accumulated_summary + NPCs + factions + open arcs + active MemoryFacts), estimates token count,
  warns when the configured budget is exceeded,
  calls the LLM with a contextualised generation prompt, validates JSON against
  `GeneratedSessionOutput`, persists as a session draft with `generated_content` + `trace_json`.
- **`POST /campaigns/{campaign_id}/generate-session`**: receives optional direction params
  (goal, tone, pace, difficulty, extra instructions).
- **Session read/update endpoints**: `GET /sessions/{session_id}` (with `generated_content`),
  `PATCH /sessions/{session_id}` (full-object replace of `generated_content` with updated origins).
- **Frontend Prepare page** (`/campaigns/[id]/prepare`): context panel + direction form + loading
  state + error state. Handoff: `handoff/app/views-prepare.jsx` → `PrepareSession`.
- **Frontend Generated Session page** (`/campaigns/[id]/sessions/[sessionId]`): editable draft with
  per-section view/edit/regenerate modes, `OriginBadge`, memories sidebar, private DM notes
  (frontend-only), copy-all, save, export-PDF-link. Handoff: `handoff/app/views-prepare.jsx`
  → `GeneratedSession`.

### Out of scope
- PDF export generation (Block 9 — only the Export PDF **button** is wired as a link).
- Per-section regeneration with real LLM calls (UI placeholder only in MVP).
- Multi-session comparison or timeline view.

## SDD artifacts (all complete, ready for apply)

| Artifact | File | Engram topic |
|----------|------|-------------|
| Proposal | `openspec/changes/block-8-session-generation/proposal.md` | `sdd/block-8-session-generation/proposal` |
| Spec: generation | `openspec/changes/block-8-session-generation/specs/generation/spec.md` | `sdd/block-8-session-generation/specs/generation` |
| Spec: editing | `openspec/changes/block-8-session-generation/specs/editing/spec.md` | `sdd/block-8-session-generation/specs/editing` |
| Spec: context-builder | `openspec/changes/block-8-session-generation/specs/context-builder/spec.md` | `sdd/block-8-session-generation/specs/context-builder` |
| Design | `openspec/changes/block-8-session-generation/design.md` | `sdd/block-8-session-generation/design` |
| Tasks | `openspec/changes/block-8-session-generation/tasks.md` | `sdd/block-8-session-generation/tasks` |

## Delivery strategy (RESOLVED)

- **Chained PRs** with **stacked-to-main** strategy (user chose this on 2026-07-09).
- **PR 1 (backend)**: `generation/` module + sessions extensions + backend tests → merges to `main`.
- **PR 2 (frontend)**: Prepare page + Generated Session page + frontend tests + i18n → merges to `main`.
- **No `size:exception` needed**: each PR is within or near the 800-line budget.
- Branch: `feat/block-8-session-generation` (created from `main`, which includes Blocks 0–7).

## Tasks breakdown

### PR 1 — Backend (~600–800 lines, base: main)

| # | Task | Files |
|---|------|-------|
| 1.1 | `generation/application/contracts.py` — `GeneratedSection`, `GeneratedContent`, `GeneratedSessionOutput`, `Encounter`, `FactionReaction`, `ArcProgression`, `ContinuityLink`, `GenerationContext` | **Create**: `services/api/app/modules/generation/application/contracts.py` |
| 1.2 | `generation/domain/ports.py` — `GenerationRepository` protocol | **Create**: `services/api/app/modules/generation/domain/ports.py` |
| 1.3 | `generation/application/errors.py` — `GenerationNotFoundError`, `GenerationPersistenceError` | **Create**: `services/api/app/modules/generation/application/errors.py` |
| 1.4 | `generation/application/context_builder.py` — context assembly + token estimation | **Create**: `services/api/app/modules/generation/application/context_builder.py` |
| 1.5 | `generation/prompts/generate_session_v1.jinja` — Jinja2 prompt template | **Create**: `services/api/app/modules/generation/prompts/generate_session_v1.jinja` |
| 1.6 | `generation/application/generate_session.py` — `GenerateNextSessionUseCase` | **Create**: `services/api/app/modules/generation/application/generate_session.py` |
| 1.7 | `generation/infrastructure/repository.py` — `SupabaseGenerationRepository` | **Create**: `services/api/app/modules/generation/infrastructure/repository.py` |
| 1.8 | `generation/api/schemas.py` — request/response Pydantic models | **Create**: `services/api/app/modules/generation/api/schemas.py` |
| 1.9 | `generation/api/dependencies.py` — DI wiring | **Create**: `services/api/app/modules/generation/api/dependencies.py` |
| 1.10 | `generation/api/exception_handlers.py` — error → HTTP mapping | **Create**: `services/api/app/modules/generation/api/exception_handlers.py` |
| 1.11 | `generation/api/routes.py` — `POST /campaigns/{id}/generate-session` | **Create**: `services/api/app/modules/generation/api/routes.py` |
| 2.1–2.7 | Sessions module extensions: `get_session`, `update_session` port + repo + use cases + routes + schemas | **Modify**: `sessions/domain/ports.py`, `sessions/infrastructure/repository.py`; **Create**: `sessions/application/commands/update_session.py`, `sessions/application/queries/get_session.py`, `sessions/application/read_models/session_detail.py` |
| 2.8 | Wire in `app/main.py` — mount generation router + detail router + exception handlers | **Modify**: `services/api/app/main.py` |
| 6.1, 6.3 | Backend tests + lint/typecheck | **Create**: `services/api/tests/generation/`; verify lint/typecheck passes |

### PR 2 — Frontend (~600–900 lines, base: main after PR 1 merges)

| # | Task | Files |
|---|------|-------|
| 3.1–3.3 | Frontend API client + Zod schemas + i18n messages | **Modify**: `web/lib/sessions/api.ts`, `web/lib/sessions/schemas.ts`, `web/messages/en.json`, `web/messages/es.json` |
| 4.1–4.3 | Prepare page: `/campaigns/[id]/prepare` with handoff contract | **Create**: `web/app/[locale]/campaigns/[id]/prepare/page.tsx`, `web/components/sessions/prepare-session-form.tsx` |
| 5.1–5.3 | Generated session view: `/campaigns/[id]/sessions/[sessionId]` with handoff contract | **Create**: `web/app/[locale]/campaigns/[id]/sessions/[sessionId]/page.tsx`, `web/components/sessions/generated-session-view.tsx` |
| 6.2–6.4 | Frontend tests + lint/typecheck + docs | **Create**: test files; update `docs/05-ai-system.md` |

## Key design decisions (baked into specs and design)

1. **`generation/` as a new module** (not in `sessions/`) per ADR-05 bounded contexts.
2. **Full-object PATCH** for `generated_content` — no server-side diffing. Frontend pushes the
   complete sections array with updated origins.
3. **Token estimation**: `len(text)//4` heuristic — trace-only, no hard truncation. If rendered context
   exceeds the configured budget the trace warns but the call proceeds.
4. **Per-section regeneration**: UI placeholder only in MVP (simulated delay, no real LLM call).
5. **No DDL changes**: existing `sessions.generated_content` (jsonb) and `sessions.trace_json` (jsonb)
   columns suffice. Private DM notes are frontend-only state.
6. **Trace on failure, not session**: if LLM fails validation, trace data is logged but no session
   is created (no orphan rows).
7. **`OriginBadge` uses string literals**: `"scribe"` vs `"edited"` — no `ContentSource` enum change.

## Strict TDD mode active

- Backend: `uv run pytest` from `services/api/` (asyncio mode, FakeLlmProvider for LLM tests).
- Frontend: `pnpm --filter web test` (Vitest + React Testing Library).
- All: `pnpm typecheck`, `pnpm lint`, `ruff check app/ tests/`, `ruff format --check app/ tests/`.
- Tests live in `tests/` or `app/**/__tests__/` directories.

## Hard rules (ADRs — enforce in apply)

- All LLM output validated with Pydantic before write (ADR-09).
- RLS + app-layer ownership pre-check on every session/generation op (user-scoped Supabase client).
- Only **accepted** (active) MemoryFacts enter generation context — dismissed suggestions never
  leak into the prompt (ADR-08).
- No RAG/embeddings.
- Frontend: locale-aware nav (`@/i18n/navigation`), i18n EN+ES for all copy (no hard-coded literals),
  Spanish "Dungeon Master"/"DM", no em dashes in UI copy.
- Follow `frontend-handoff-contract` skill for every frontend page.
- Conventional commits, no AI attribution / no Co-Authored-By.
- Do NOT let an apply agent run `pnpm format` (reformats the whole repo → EOL churn). Scope
  formatting to staged files.

## Engram context to pull (project `lazy-lands`)

- `sdd-init/lazy-lands` — project stack + testing capabilities.
- `sdd/block-8-session-generation/proposal` — proposal with scope and risk assessment.
- `sdd/block-8-session-generation/specs/{generation,editing,context-builder}` — detailed specs.
- `sdd/block-8-session-generation/design` — technical design and architecture.
- `sdd/block-8-session-generation/tasks` — full task breakdown.
- `sdd/block-8-session-generation/apply-progress` — apply progress (will be created after first apply run).

## Suggested first pipeline steps

1. **Preflight**: Session has an SDD preflight block? If not, ask the user (interactive mode).
2. **Branch**: already on `feat/block-8-session-generation` (from `main`, up to date).
3. **Run `sdd-apply`** for PR 1 work units: tasks 1.1–1.11, 2.1–2.8, 6.1, 6.3 (backend module + tests).
4. After PR 1 merges to main, rebase branch and run `sdd-apply` for PR 2 work units (frontend).
5. Run `sdd-verify` after each PR, then `sdd-archive` after both PRs ship.
