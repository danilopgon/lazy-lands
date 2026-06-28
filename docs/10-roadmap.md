# Implementation Roadmap

Each block unlocks the next. Do not start a block until the previous one is working end-to-end.

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
| 4 | Auth | pending |
| 5 | Campaign creation and AI onboarding | pending |
| 6 | Campaign view | pending |
| 7 | Sessions: post-session registration | pending |
| 8 | Session generation and editing | pending |
| 9 | PDF export | pending |
| 10 | Testing and quality | pending |

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

Status: **pending**

Supabase setup (moved here from Block 0 — first needed in this block):

- [ ] Create Supabase project with email auth enabled.
- [ ] Run initial schema migration: users table and RLS baseline.
- [ ] Configure Supabase environment variables in Next.js and FastAPI.
- [ ] Configure Supabase Auth client in Next.js (SSR cookie handling).

Auth screens and logic:

- [ ] Registration screen: email, password and confirmation.
- [ ] Login screen: email and password.
- [ ] Client-side form validation.
- [ ] Supabase Auth integration.
- [ ] Error handling: email already registered, wrong password, etc.
- [ ] Post-login redirect to campaign list.
- [ ] Post-registration redirect to first campaign onboarding.
- [ ] Logout accessible from navigation.
- [ ] Protected routes.
- [ ] HTTP interceptor that injects the Supabase JWT in every request to FastAPI.
- [ ] `get_current_user` dependency in FastAPI to validate the Supabase JWT.
- [ ] Tests for protected routes in FastAPI.

---

## Block 5 — Campaign creation and AI onboarding

Status: **pending**

- [ ] New campaign screen: free-text textarea.
- [ ] FastAPI endpoint `POST /campaigns/extract` — calls the LLM with the extraction prompt.
- [ ] Pydantic validates the extracted JSON against `ExtractCampaignOutput`.
- [ ] The LLM returns JSON with NPCs, factions and initial world state.
- [ ] Save campaign, NPCs and factions to Supabase.
- [ ] RLS active on `campaigns`, `npcs` and `factions` tables.
- [ ] Confirmation screen: the DM reviews the extracted data before saving.

---

## Block 6 — Campaign view

Status: **pending**

- [ ] Campaign list for the logged-in user.
- [ ] Campaign detail view: title, description, world state.
- [ ] NPC list with name, description, current status and motivation.
- [ ] Faction list with name, description and current stance.
- [ ] Manual editing of world state (free-text field).
- [ ] Basic NPC editing: name, status, motivation.
- [ ] Basic faction editing: name, stance, goals.

---

## Block 7 — Sessions: post-session registration and memory review

Status: **pending**

### Session registration

- [ ] New session screen linked to a campaign.
- [ ] Field: free-text summary of what happened.
- [ ] Field: consequences and world state changes.
- [ ] FastAPI endpoint `POST /campaigns/{campaign_id}/sessions` — single endpoint that:
  1. Persists the session with a sequential number.
  2. Calls `SummarizeCampaignUseCase` to update `accumulated_summary` (previous summary + new session → compressed summary now including session N). Sets `summarized_up_to_session = N`.
  3. Calls `SuggestMemoriesUseCase` to generate 0–5 `MemorySuggestion` objects validated with Pydantic.
  4. Returns `session_id`, `session_number` and `memory_suggestions` in the response.
  Suggestions are returned as part of the response — they are **not persisted** until the DM accepts.
- [ ] RLS active on the `sessions` table.
- [ ] Session history per campaign (chronological list).

### Memory suggestions (MVP — part of the core DM flow)

- [ ] Frontend renders the `memory_suggestions` list returned by the session save endpoint.
- [ ] Each suggestion shows: content, type, importance and reason.
- [ ] DM can **accept** a suggestion → `POST /campaigns/{campaign_id}/memory-facts` creates a
  `MemoryFact` with `status=active`. Only the accepted (and optionally edited) content is
  stored — never the raw suggestion automatically.
- [ ] DM can **reject** a suggestion → no request is sent; the suggestion is discarded.
- [ ] DM can **edit** a suggestion before accepting → the edited content is sent to
  `POST /campaigns/{campaign_id}/memory-facts`; the original suggestion is not stored.
- [ ] RLS active on the `memory_facts` table.

---

## Block 8 — Session generation and editing

Status: **pending**

### Generation

- [ ] FastAPI endpoint `POST /sessions/generate` — receives `campaign_id`.
- [ ] `GenerateNextSessionUseCase` builds compressed context: `accumulated_summary` (covers all
  sessions up to and including the last played one) + NPCs + factions + open arcs +
  **active `MemoryFacts`** (~2,000 tokens maximum). Unaccepted suggestions are excluded
  from context. The last session is already part of the summary — it is not provided
  separately to avoid double-counting.
- [ ] LLM call with the contextualised generation prompt.
- [ ] The LLM returns structured JSON validated against `GeneratedSessionOutput`.
- [ ] Save `trace_json` with provider, prompt version, context summary and any errors.
- [ ] Render of the structured output, with visible continuity links to accepted memories.

### Editing

- [ ] The generated output is presented as an editable draft.
- [ ] Inline editing of main fields.
- [ ] Manually edited fields are saved with `ContentSource.EDITED`.

---

## Block 9 — PDF export

Status: **pending**

- [ ] FastAPI endpoint `GET /sessions/{id}/export.pdf`.
- [ ] HTML render of the generated session.
- [ ] PDF conversion with WeasyPrint or Playwright.
- [ ] Clean layout, readable at the table.
- [ ] Basic test: the endpoint returns `application/pdf`.

---

## Block 10 — Testing and quality

Status: **pending**

### AI and prompt tests

- [ ] Unit tests for prompt builders.
- [ ] Unit tests for Pydantic schemas.
- [ ] Tests for `GenerateNextSessionUseCase` with `FakeLlmProvider`.
- [ ] LLM JSON validation: valid case, invalid case and fallback.
- [ ] Snapshot tests for main prompts.

### Memory layer tests (required — ADR-08)

- [ ] A `MemorySuggestion` is not auto-saved as a `MemoryFact` — the suggestion endpoint
  returns suggestions without writing to `memory_facts`.
- [ ] Accept suggestion → `POST /campaigns/{id}/memory-facts` creates an active `MemoryFact`.
- [ ] Reject suggestion → no `MemoryFact` is created (no request is sent).
- [ ] Edit suggestion before accept → the edited content is saved as the `MemoryFact`,
  not the original AI suggestion.
- [ ] Generation context includes active `MemoryFacts` and excludes unaccepted suggestions.

### Infrastructure tests

- [ ] Repository tests against local Supabase or mocks.
- [ ] Auth dependency tests with valid and invalid JWTs.
- [ ] Minimal RLS tests in Supabase (`campaigns`, `npcs`, `factions`, `sessions`,
  `memory_facts`).
- [ ] Basic PDF export test.
