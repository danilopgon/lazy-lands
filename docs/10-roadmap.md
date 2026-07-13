# Implementation Roadmap

Each block unlocks the next. Do not start a block until the previous one is working end-to-end.

> **LLM seam enrichment** (done ahead of Block 5): the `LlmProvider` Protocol was enriched with
> `complete_json(prompt, schema)`, a shared JSON guard (`parse_llm_json`), per-schema fixture
> fake, and an OpenAI-compatible adapter (Gemini + Groq). This work was done before Block 5
> because the extraction pipeline depends on it. See `block-build-parallelization`.

## Scope cut

New persistent entities added in the MVP: `Arc`, `MemoryFact`.

`MemorySuggestion` is part of the MVP as the narrative memory layer validated by the DM.
It is a transient API response (not a database table) — suggestions are proposed by the AI
after a session and the DM decides which become active `MemoryFact` records.

Out of scope for the TFM: `WorldFact`, `Relationship`, RAG, embeddings, vector databases,
complex relationship graphs, visual timeline, and advanced memory compiler.

## Block overview

| Block | Name | Status |
|---|---|---|
| 0 | Infra and repo | done |
| 1 | Design prototype | done |
| 3 | Landing page | done |
| 4 | Auth | done |
| 5 | Campaign creation and AI onboarding | done |
| 6 | Campaign view | done |
| 7 | Sessions: post-session registration and memory review | done |
| 8 | Session generation and editing | done |
| 9 | PDF export | done |
| 10 | Testing and quality | done |
| 11 | Handoff cleanup and docs update | done |

---

## Block 0 — Infra and repo

Status: **done**

- [x] Next.js with App Router configured.
- [x] TailwindCSS and shadcn/ui configured.
- [x] FastAPI service with basic Clean Architecture structure.
- [x] Pydantic, pytest, Ruff and mypy configured.
- [x] Docker Compose for local development (Next.js + FastAPI; Supabase runs separately via `pnpm supabase start`).
- [x] Basic CI in GitHub Actions: lint, typecheck, tests, build.
- [x] Initial empty deployment: Next.js on Vercel, FastAPI on Railway.

Note: Supabase schema, migrations and auth configuration are set up in Block 4, where they are first needed.

---

## Block 1 — Design prototype

Status: **done**

Screens prototyped:

- [x] Landing page — hero, how it works, CTA to registration.
- [x] Register and login — minimal forms.
- [x] Campaign list — post-login home screen.
- [x] Campaign onboarding — free-text input and confirmation of extracted data (NPCs, factions, world state).
- [x] Campaign view — detail with NPCs, factions and world state.
- [x] New session — post-session registration (summary and consequences).
- [x] Session history — chronological list per campaign.
- [x] Next session generation — structured output screen (encounters, twists, arcs, faction reactions).
- [x] PDF export — preview before download.

Quality criteria met:

- [x] End-to-end navigable flow.
- [x] Visual identity defined: palette, typography, aesthetic tone.
- [x] Responsive design considered (mobile and desktop).
- [x] Loading and error states prototyped for critical screens.
- [x] Full flow reviewed before moving to code.

---

## Block 3 — Landing page

Status: **done**

- [x] Hero: main headline and subtitle with the value proposition.
- [x] Minimal navigation: logo, login button, register button.
- [x] Primary CTA: "Start free" button pointing to registration.
- [x] "How it works" section — 3 to 4 visual steps of the flow.
- [x] Differentiator section — why this is not another one-shot generator.
- [x] Minimal footer.
- [x] Privacy and cookies.
- [x] Basic responsive review (mobile-first).

---

## Block 4 — Auth

Status: **done** (pending production smoke test)

Architecture refinement (before first endpoints):

- [x] Review backend architecture: confirm modular monolith with nested layer structure per module (ADR-05 refined). Update `docs/04-architecture.md` and ADR-05 with the concrete folder structure and module rules.

Dev environment setup (first block where frontend calls FastAPI):

- [x] Add `package.json` to `services/api` with a `dev` script (`uv run uvicorn app.main:app --reload --port 8000`) so `pnpm dev` launches both Next.js and FastAPI in parallel via Turborepo.

Supabase setup (moved here from Block 0 — first needed in this block):

- [x] Create Supabase project with email auth enabled.
- [x] Run initial schema migration: users table and RLS baseline.
- [x] Configure Supabase environment variables in Next.js and FastAPI.
- [x] Configure Supabase Auth client in Next.js (SSR cookie handling).

Auth screens and logic:

- [x] Registration screen: email, password and confirmation.
- [x] Login screen: email and password.
- [x] Client-side form validation.
- [x] Supabase Auth integration.
- [x] Error handling: email already registered, wrong password, etc.
- [x] Post-login redirect to campaign list.
- [x] Post-registration redirect to first campaign onboarding.
- [x] Logout accessible from navigation.
- [x] Protected routes.
- [x] HTTP interceptor that injects the Supabase JWT in every request to FastAPI.
- [x] `get_current_user` dependency in FastAPI to validate the Supabase JWT.
- [x] Tests for protected routes in FastAPI.
- [x] End-of-block production smoke test: a real user can register, log in, log out and log back
  in against the deployed frontend/backend using the hosted Supabase project.

---

## Block 5 — Campaign creation and AI onboarding

Status: **done**

- [x] New campaign screen: free-text textarea, premise bounded 100–8000 characters
  (backend `Field` + frontend counter).
- [x] FastAPI endpoint `POST /campaigns/extract` — calls the LLM with the extraction prompt.
- [x] Pydantic validates the extracted JSON against `ExtractCampaignOutput`.
- [x] The LLM returns JSON with NPCs, factions, arcs and initial world state.
- [x] Save campaign, NPCs, factions and arcs to Supabase.
- [x] RLS active on `campaigns`, `npcs`, `factions` and `arcs` tables.
- [x] Confirmation screen: the DM reviews the extracted NPCs, factions and arcs before saving.
- [x] Additive migration: add `content_source` to `arcs` (nullable, no backfill) so arcs carry
  the same persisted provenance column as NPCs and factions. Deployed this block via the
  automated `deploy-migrations.yml` pipeline on merge to main.
- [x] Per-user Supabase client injection — FastAPI routes get user-scoped database clients
  via `AuthContext`; the `get_user_supabase_client` dependency ensures tenant isolation.
- [x] Jinja prompt-render helper — shared `render_prompt` with `StrictUndefined`,
  autoescape off, trim/lstrip blocks.
- [x] Error mapping — `LlmOutputValidationError` mapped to retryable HTTP without raw LLM
  output leak.
- [x] App-layer ownership guard — User A's token cannot write a campaign attributed to
  User B; `user_id` always equals the caller `auth.uid()` (CP-004, NFR-PU-2).
- [x] Frontend Zod schemas mirror backend contracts (`content_source`, arcs, priority).
- [x] Frontend `/campaigns/new/review` with provenance badges (`✦ Scribe` / `✎ Edited`),
  editable entities, and add/remove support.
- [x] Full suite green: backend 98 passed + frontend 175 passed; `ruff`/`mypy`/`tsc`/`eslint` clean.

---

## Block 6 — Campaign view

Status: **done**

- [x] Campaign list for the logged-in user (`/dashboard`).
- [x] Campaign detail view: title, description, world state, system/tone, stat bar.
- [x] NPC list with name, description, current status and motivation.
- [x] Faction list with name, description and current stance.
- [x] Arc list with title, description, priority and status (`active/dormant/resolved/discarded`).
- [x] Manual editing of world state (free-text field), wired to `PATCH /campaigns/{id}`.
- [x] Full NPC / faction / arc create, edit and delete via modals (`POST/PATCH/DELETE`).
- [x] Docs sweep, `sdd-verify`, and archive to close the change.

---

## Block 7 — Sessions: post-session registration and memory review

Status: **done**

### Session registration

- [x] New session screen linked to a campaign.
- [x] Field: free-text summary of what happened.
- [x] Field: consequences and world state changes.
- [x] FastAPI endpoint `POST /campaigns/{campaign_id}/sessions` — single endpoint that:
  1. Persists the session with a sequential number.
  2. Calls `SummarizeCampaignUseCase` to update `accumulated_summary` (previous summary + new session → compressed summary now including session N). Sets `summarized_up_to_session = N`.
  3. Calls `SuggestMemoriesUseCase` to generate 0–5 `MemorySuggestion` objects validated with Pydantic.
  4. Returns `session_id`, `session_number` and `memory_suggestions` in the response.
  Suggestions are returned as part of the response — they are **not persisted** until the DM accepts.
- [x] RLS active on the `sessions` table.
- [x] Session history per campaign (chronological list).

### Memory suggestions (MVP — part of the core DM flow)

- [x] Frontend renders the `memory_suggestions` list returned by the session save endpoint.
- [x] Each suggestion shows: content, type, importance and reason.
- [x] DM can **accept** a suggestion → `POST /campaigns/{campaign_id}/memory-facts` creates a
  `MemoryFact` with `status=active`. Only the accepted (and optionally edited) content is
  stored — never the raw suggestion automatically.
- [x] DM can **reject** a suggestion → no request is sent; the suggestion is discarded.
- [x] DM can **edit** a suggestion before accepting → the edited content is sent to
  `POST /campaigns/{campaign_id}/memory-facts`; the original suggestion is not stored.
- [x] RLS active on the `memory_facts` table.

---

## Block 8 — Session generation and editing

Status: **SHIPPED** (backend PR #49 merged; frontend PR #51 merged; per-section
regeneration + sections-only contract alignment shipped in the
`per-section-regeneration` change)

### Generation

- [x] FastAPI endpoint `POST /campaigns/{campaign_id}/generate-session` — receives `campaign_id` + optional direction params.
- [x] `GenerateNextSessionUseCase` builds compressed context: `accumulated_summary` (covers all
  sessions up to and including the last played one) + NPCs + factions + open arcs +
  **active `MemoryFacts`** (~2,000 tokens maximum). Unaccepted suggestions are excluded
  from context. The last session is already part of the summary — it is not provided
  separately to avoid double-counting.
- [x] LLM call with the contextualised generation prompt.
- [x] The LLM returns structured JSON validated against `GeneratedSessionOutput`.
- [x] Save `trace_json` with provider, prompt version, context summary and any errors.
- [x] Render of the structured output, with visible continuity links to accepted memories.

### Editing

- [x] The generated output is presented as an editable draft.
- [x] Inline editing of main fields.
- [x] Manually edited fields are saved with `ContentSource.EDITED`.

### Per-section regeneration (shipped in `per-section-regeneration`)

- [x] Aligned the generated-session contract with the seven editable handoff sections:
  `synopsis`, `goal`, `opening`, `beats`, `encounters`, `factions`, and `arcs`. The same
  canonical section IDs and provenance rules now flow through the LLM prompt
  (`generate_session_v2.jinja`), the Pydantic output contract (`GeneratedSessionOutput`,
  sections-only, `extra="forbid"`), `generated_content` persistence, the session-detail
  API, localized frontend labels, and the editable draft UI. No read-compat shim was
  needed — no persisted drafts existed yet.
  - Fixed the Block 8 gap where `generate_session_v1.jinja`'s derive-fallback only
    persisted 3 sections (`synopsis`, `main_objective`, `twist`), dropping `encounters`,
    `faction_reactions`, and `arc_progression` after redirect/reload (flagged by Codex
    review on PR #51). The sections-only contract removes the fallback entirely — LLM
    output now maps 1:1 onto all 7 persisted sections.
- [x] DM can regenerate individual sections with a fresh, pure (no steering input) LLM
  call that preserves the rest of the draft. `POST /sessions/{id}/regenerate-section`
  plus 7 per-section prompt templates sharing a `_regenerate_context.jinja` macro. The
  frontend's "Coming later" disabled affordance was replaced with a working per-section
  Regenerate control (quill loading affordance, origin reset to `scribe`, success toast,
  error state that preserves the prior body/origin).

---

## Block 9 — PDF export

Status: **done** (backend PR #59, UI PR #61 merged)

- [x] FastAPI endpoint `GET /sessions/{id}/export.pdf`.
- [x] HTML render of the generated session.
- [x] PDF conversion with WeasyPrint or Playwright.
- [x] Clean layout, readable at the table.
- [x] Basic test: the endpoint returns `application/pdf` (`tests/sessions/test_pdf_export.py`).

---

## Block 10 — Testing and quality (if needed)

Status: **done** — most criteria were satisfied incrementally during Blocks 5–9.
Audit on 2026-07-13 against the live suite covered 12 of 14 criteria; the 2 residual
gaps (prompt snapshots, `npcs`/`factions` RLS) were closed in the
`chore/close-testing-gaps` change and verified green (prompt snapshots + RLS run against
local Supabase).

### AI and prompt tests

- [x] Unit tests for prompt builders (`tests/generation/test_prompts.py`,
  `tests/generation/test_regenerate_prompts.py`, `tests/sessions/test_prompts_language.py`).
- [x] Unit tests for Pydantic schemas (`tests/generation/test_contracts.py`,
  `tests/sessions/test_contracts.py`, `tests/campaigns/test_schema.py`, `tests/test_schema.py`).
- [x] Tests for `GenerateNextSessionUseCase` with `FakeLlmProvider`
  (`tests/generation/test_generate_session.py`).
- [x] LLM JSON validation: valid case, invalid case and fallback (`tests/test_json_guard.py`,
  `tests/test_fallback.py`, `tests/test_llm_errors.py`; valid/invalid persistence covered in
  `tests/generation/test_generate_session.py`).
- [x] Snapshot tests for main prompts (`tests/test_prompt_snapshots.py`, syrupy) — frozen
  snapshots of the four core prompts (`extract_campaign_v1`, `generate_session_v2`,
  `suggest_memory_facts_v1`, `summarize_campaign_v1`). The per-section regenerate prompts stay
  covered by `tests/generation/test_regenerate_prompts.py`.

### Memory layer tests (required — ADR-08)

- [x] A `MemorySuggestion` is not auto-saved as a `MemoryFact` — the suggestion endpoint
  returns suggestions without writing to `memory_facts` (`tests/sessions/test_suggest_memories.py`;
  frontend "dismisses a suggestion without creating a memory fact").
- [x] Accept suggestion → `POST /campaigns/{id}/memory-facts` creates an active `MemoryFact`
  (`tests/memory/test_memory_routes.py::test_create_memory_fact_persists_active_fact`).
- [x] Reject suggestion → no `MemoryFact` is created (no request is sent) — memory-review page
  test "dismisses a suggestion without creating a memory fact".
- [x] Edit suggestion before accept → the edited content is saved as the `MemoryFact`,
  not the original AI suggestion — memory-review page test "accepts, edits, dismisses, and
  retires with busy-safe calls".
- [x] Generation context includes active `MemoryFacts` and excludes unaccepted suggestions
  (`tests/generation/test_context_builder.py::test_build_prompt_context_excludes_suggestions_and_private_notes`).

### Infrastructure tests

- [x] Repository tests against local Supabase or mocks (`tests/campaigns/test_repository.py`,
  `tests/sessions/test_repository.py`, `tests/generation/test_repository.py`).
- [x] Auth dependency tests with valid and invalid JWTs (`tests/test_jwt_auth.py`,
  `tests/test_security.py`).
- [x] Minimal RLS tests in Supabase (`campaigns`, `npcs`, `factions`, `sessions`,
  `memory_facts`) — `tests/test_rls.py` now covers all five tables (owner CRUD + non-owner
  select/insert/update denial for `npcs` and `factions`), verified against local Supabase.
- [x] Basic PDF export test (`tests/sessions/test_pdf_export.py`).

### Block 11 - Handoff cleanup and docs update

Status: **done**

- [x] Pruned the `handoff` prototype directory to zero physical files (17 prototype files removed and the brand PNG
  relocated to `docs/assets/brand/`). Reference value is preserved in `DESIGN.md`, the
  `frontend-handoff-contract` skill's `route-map.md`, and the shipped `apps/web/` app itself —
  nothing was lost, only repointed onto the real implementation.
- [x] Updated the docs to reflect the final architecture and flow (AGENTS.md, DESIGN.md,
  README.md, docs/README.md, PRODUCT.md, `docs/conventions/**`, `.prettierignore`) now that
  every MVP screen has shipped under `apps/web/`.
- [x] Reviewed README and other main documentation for stale handoff references and corrected
  them to point at the shipped app and design system.
