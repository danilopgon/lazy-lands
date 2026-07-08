# Block 7b — Memory Review (SDD kickoff context)

> **This is a handoff brief prepared by the previous session so a fresh agent can start Block 7b.**
> Read it fully, then run the SDD pipeline starting at `sdd-explore`. Mirror of this doc is in
> Engram at topic_key `sdd/block-7b-memory-review/context` (project `lazy-lands`).

## FIRST TASK (do this before anything else)

**Mark Block 7a as done in `docs/10-roadmap.md`.** Block 7 has two sub-sections. The
**"Session registration"** sub-section shipped (PR #36, merged to `main` 2026-07-08, commit
`312ba68`). Check off its checkboxes:
- [x] New session screen linked to a campaign.
- [x] Field: free-text summary of what happened.
- [x] Field: consequences and world state changes.
- [x] FastAPI endpoint `POST /campaigns/{campaign_id}/sessions` (persist + summarize + suggest, returns `memory_suggestions`).
- [x] RLS active on the `sessions` table.
- [x] Session history per campaign (chronological list).

Leave the **"Memory suggestions (MVP)"** sub-section UNCHECKED — that is exactly the scope of
THIS change (7b). Do not change the Block-level status line to `done` until 7b also ships.

## What 7b is

Block 7b is the **second half of Block 7**: the memory-suggestion review flow. The DM reviews the
0–5 transient `MemorySuggestion` objects the Scribe proposes after a session and decides which
become persisted `MemoryFact` records. This is the narrative memory layer (ADR-08:
suggestions → facts, validated by the DM).

### In scope
- Frontend **Memory Review** screen at `/campaigns/[id]/memory/review` (handoff `MemoryReview`).
- Render the `memory_suggestions` list; each shows content, type, importance, reason (`why`), related.
- **Accept** a suggestion → `POST /campaigns/{campaign_id}/memory-facts` creates a `MemoryFact` with `status=active`. Only the accepted (optionally edited) content is stored — never the raw suggestion automatically.
- **Reject/Dismiss** → no request is sent; the suggestion is discarded client-side.
- **Edit before accept** → the edited content is sent to `POST /memory-facts`; the original suggestion is never stored.
- Active-memories list on the review screen (and wire the campaign-detail "active memories" placeholder to live data). **Retire** a memory → `PATCH /memory-facts/{id}` with `status=archived` (or DELETE — decide in design; handoff calls it "Retire").
- Backend `memory` module: `POST /campaigns/{campaign_id}/memory-facts`, `PATCH /memory-facts/{memory_fact_id}`.
- **Verify (not build) RLS** on `memory_facts`.

### Out of scope
- Session generation / next-session briefing (Block 8).
- Any change to how suggestions are *generated* (that is 7a, already shipped).

## THE key design seam to resolve in `sdd-design`

`MemorySuggestion` is **transient** — never persisted. It is returned ONLY in the
`POST /campaigns/{id}/sessions` response (`RegisterSessionResponse.memory_suggestions`). But 7a's
Log Session screen currently **navigates to campaign detail on success**, NOT to
`/memory/review`, and the suggestions have no persistence. So 7b must decide **how the review
screen receives the transient suggestions**. Options to weigh in design:
1. Change 7a's Log Session success navigation to go to `/memory/review`, carrying the suggestions
   through client/router state (React Query cache, navigation state, or a client store). This
   matches the handoff (`submit → go(base + "/memory/review")`).
2. Since suggestions aren't persisted, a direct visit to `/memory/review` (e.g. refresh, deep
   link) has nothing to show — design the empty state for that case (handoff already has a
   "The margins are clean" empty state).
Pick one explicitly; it drives whether 7b edits the 7a `log-session-form.tsx` success handler.

## Confirmed contracts (from shipped 7a + existing schema)

### `MemorySuggestion` (7a, `services/api/app/modules/sessions/application/contracts.py`)
```
content: str (1..2000)
type: str (1..100)
importance: Importance  # enum: high | medium | low
reason: str (1..1000)   # handoff calls this "why"
related: list[str]      # handoff "Touches: …"
```
Returned as `RegisterSessionResponse.memory_suggestions: list[MemorySuggestion]`.

### `memory_facts` table — ALREADY EXISTS (verify-not-build)
`supabase/migrations/20260628101707_initial_schema.sql`:
```
id                uuid pk
campaign_id       uuid not null -> campaigns(id) on delete cascade
source_session_id uuid (nullable)
content           text not null
type              text
importance        importance      -- enum high|medium|low
status            memory_status    -- enum active|archived
created_at, updated_at timestamptz
-- composite FK (campaign_id, source_session_id) -> sessions(campaign_id, id)
-- RLS policies: memory_facts_select/insert/update/delete (all owner-scoped)
```
**No migration needed** for memory_facts. Enums `importance` and `memory_status` already exist.

### Endpoint contracts (`docs/06-api-contracts.md` lines 329–380)
- `POST /campaigns/{campaign_id}/memory-facts` — body `{ source_session_id, content, type, importance }` → `{ id, status: "active" }`.
- `PATCH /memory-facts/{memory_fact_id}` — body `{ content?, status? }` → update/archive.

### Handoff
- Component: **`MemoryReview`** in `handoff/app/views-sessions.jsx` (NOT `views-review.jsx`).
  **route-map.md BUG**: `.agents/skills/frontend-handoff-contract/references/route-map.md`
  misattributes `MemoryReview` to `views-review.jsx`. **Fix route-map.md before frontend work.**
- Route: `/campaigns/:id/memory/review`.
- Sub-components in the handoff: `SuggestionCard` (Accept / Edit & accept / Dismiss),
  `SuggestionEditor` (edit textarea before accepting), an "Active memories" list with Retire.
- Motion: accept = `.ll-stamp` ("★ Accepted" stamp drop); dismiss = `.ll-strike` + slide-out;
  respect `prefers-reduced-motion` / `data-motion`. Empty state: `EmptyState` "The margins are clean".
- Shared production components to reuse (do NOT recreate): `components/ui/{field,loading-scribe,notice,empty-state,modal,origin-badge,button,textarea}.tsx`, the authenticated `AppHeader` layout, `EntityNav`.

## Hard rules (ADRs — bake into spec/design)
- Only ACCEPTED (optionally edited) content becomes a `MemoryFact`; the raw AI suggestion is NEVER auto-persisted (ADR-08).
- All persisted content validated with Pydantic before write (ADR-09).
- RLS + app-layer ownership pre-check on every memory-facts op (mirror the sessions/campaigns pattern: `get_campaign` ownership guard → forged/foreign `campaign_id` → 404).
- NO RAG / embeddings.
- Backend follows the campaigns/sessions module template (modular monolith, hexagonal — ADR-05). The `sessions` module (shipped in 7a) is the freshest template to copy.
- Frontend: locale-aware nav (`@/i18n/navigation`), i18n EN+ES for all copy (no hard-coded literals), Spanish "Dungeon Master"/"DM", **NO em dashes** in UI copy. Follow the `frontend-handoff-contract` skill.

## SDD settings to reuse (cached from the 7a session)
- **Artifact store: `hybrid`** (openspec files + engram). **Strict TDD active** (`uv run pytest` backend from `services/api/`; `pnpm --filter web test` frontend; tests live in `tests/**` or `app/**/__tests__/**`).
- **Delivery: `ask-on-risk`**. This is again full-stack (backend memory module + 2 endpoints + review UI + i18n) → likely a chained-PR split (backend PR then frontend PR), same as 7a.
- **Mirror CI exactly** in the backend gate: `uv run ruff check app/ tests/` AND `uv run ruff format --check app/ tests/` (CI checks `tests/` too — a 7a gate that only ran `app/` failed CI), `uv run mypy app/ --ignore-missing-imports`, `uv run pytest -m "not dev_inference"`.
- **Do NOT let an apply agent run `pnpm format`** (it reformats the whole repo → EOL churn across unrelated files). Scope formatting to staged files.
- Conventional commits, **no AI attribution / no Co-Authored-By**.

## Engram context to pull (project `lazy-lands`)
- `sdd-init/lazy-lands` — project stack + testing capabilities (obs #208).
- `backlog/deferred-mvp-items` (obs #547) — includes the route-map.md fix and other debt.
- 7a artifacts: `sdd/block-7a-session-registration/{explore, proposal, design, spec, tasks, apply-progress}` (obs #539–543).
- `sdd/block-7b-memory-review/context` — this brief.
- Skill registry: `.atl/skill-registry.md` (frontend-handoff-contract, vercel-react-best-practices, etc.).

## Suggested first pipeline steps
1. Mark Block 7a done in `docs/10-roadmap.md` (see FIRST TASK).
2. `sdd-explore` — confirm the memory module stubs, re-read `memory_facts` DDL + RLS, the `sessions`/`campaigns` module template, the `MemoryReview` handoff, and resolve open questions (the transient-suggestions seam above; PATCH-vs-DELETE for Retire).
3. `sdd-propose` → `sdd-design` (resolve the seam) → `sdd-spec` (inject the MemoryReview handoff checklist) → `sdd-tasks` (Review Workload Forecast → likely chained PRs).
