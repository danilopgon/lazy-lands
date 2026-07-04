# Block 5 — Campaign creation and AI onboarding

Give the Dungeon Master a first real workflow: paste a free-text campaign premise, let the Scribe extract a structured starting point (title, description, world state, NPCs, factions, arcs), review and edit every proposed item, and save the campaign to their own RLS-protected data. This is the first block where the backend writes user-owned data through Supabase RLS and the first block that calls the LLM seam for a product feature. The Scribe proposes; the DM decides.

## Intent

**Problem.** Today a DM has auth, a placeholder dashboard, and an empty `campaigns` module stub. There is no way to create a campaign, and no backend path that writes user-owned data through RLS. The schema, RLS policies, and the LLM seam already exist — but nothing wires them into a usable flow.

**Why now.** Every later block (sessions, memory validation, session generation) depends on a campaign existing and on an RLS-safe per-user write path. Block 5 is the prerequisite that unlocks the rest of the roadmap.

**What the DM gains.** Paste a premise once, get a coherent, editable campaign scaffold instead of filling empty forms. Provenance is visible (`✦ Scribe` vs `✎ Edited`), so the DM always knows what was proposed versus what they authored — the concrete embodiment of PRODUCT.md P1: *the Scribe proposes, never decides; the DM has the last word.*

**Success looks like.** A DM pastes a premise between 100 and 8000 characters, reviews an extracted proposal, edits/removes/adds NPCs, factions, and arcs and world state, confirms, and lands with a persisted campaign owned by them — verifiable by an app-layer test proving User A cannot write into User B's campaign.

## Scope

### In scope

| Area | What ships |
|------|-----------|
| Backend `campaigns` module | Domain models (`Campaign`, `NPC`, `Faction`, `Arc`), repository port, two use cases (extract, create), Supabase repository, router + HTTP schemas |
| Two endpoints | `POST /campaigns/extract` (stateless), `POST /campaigns` (persists reviewed payload) |
| Per-user Supabase client | JWT-bound, per-request client factory in `shared/` + a dependency exposing the raw bearer token — the mechanism that makes RLS-safe writes possible |
| LLM extraction | Reuse the existing seam: `complete_json(prompt, ExtractCampaignOutput)` + `parse_llm_json` guard + `FakeLlmProvider` fixtures |
| Prompt templating | First Jinja prompt: a minimal reusable render helper in `shared/` + versioned template `prompts/extract_campaign_v1.jinja` |
| Frontend | `/campaigns/new` (free-text form) and `/campaigns/new/review` (editable proposal review) screens, reusing `apiFetch` |
| Tests | Use-case tests with `FakeLlmProvider`, app-layer RLS ownership test, route tests, frontend component tests |

### Out of scope

| Excluded | Why |
|----------|-----|
| Campaign detail / list view (Block 6) | This block only needs the redirect *target*, not the destination screen. |
| RAG, embeddings, semantic memory | Post-MVP per AGENTS.md. |
| Draft persistence / resume-later | Extract is stateless by contract; no `status` column, no second migration. |
| A second migration beyond the arcs `content_source` column | Schema + RLS + 24 ownership policies already exist (`20260628101707_initial_schema.sql`); this block adds exactly one additive column (see Decision 8 below) and nothing more. |
| Billing, multi-user collaboration | Not planned. |

### Arcs are in scope

**Block 5 extracts and saves title/description + world_state + npcs + factions + arcs.**

`PRODUCT.md` (line 92) already specifies that `/campaigns/new/review` shows "Summary, world state, NPCs, factions, arcs — each editable/removable/addable," and `docs/06-api-contracts.md` already documents `arcs` in both the `/campaigns/extract` response and the `POST /campaigns` request. The `arcs` table and its 4 RLS ownership policies already exist in `20260628101707_initial_schema.sql`. `ExtractCampaignOutput` and both endpoint payloads therefore include `arcs` alongside `npcs` and `factions`, with the same review-and-edit treatment (provenance badges, add/remove/edit) — and, per Decision 8 below, the same persisted `content_source` provenance column as `npcs`/`factions`.

## End-to-end flow

1. DM opens `/campaigns/new` → free-text textarea (100–8000 chars; validation errors must never lose typed text).
2. Frontend `POST /campaigns/extract` with the raw premise.
3. Backend validates the JWT (`get_current_user`), renders `extract_campaign_v1.jinja`, calls `complete_json(prompt, ExtractCampaignOutput)`.
4. `parse_llm_json` validates the LLM JSON against the Pydantic schema. Invalid output → retryable error, **never persisted, never leaked raw** to the DM.
5. Response returned. **Stateless — nothing persisted.**
6. Frontend renders `/campaigns/new/review` from the extracted payload as local state. DM edits/removes/adds NPCs, factions, and arcs; each touched item flips `content_source` from `llm` to `edited`.
7. DM confirms → `POST /campaigns` with the reviewed payload.
8. Backend `create_campaign` use case writes campaign + NPCs + factions + arcs via the **per-user Supabase client** so `auth.uid()` matches `user_id` under RLS.
9. Response `{ id }`; frontend redirects to the campaign detail route (Block 6 target, not built here).

### Endpoint contracts (proposal altitude)

| Endpoint | Method | Persists? | Request (shape) | Response (shape) |
|----------|--------|-----------|-----------------|------------------|
| `/campaigns/extract` | POST | No | `{ raw_text }` (100–8000 chars) | `{ title, description, world_state, npcs[], factions[], arcs[] }`, each entity carrying `content_source` |
| `/campaigns` | POST | Yes | reviewed `{ title, description, world_state, npcs[], factions[], arcs[] }` | `{ id }` |

Field-level schemas and per-scenario acceptance criteria are for the **spec** phase, not this proposal.

## Design decisions

| # | Decision | Rationale / tradeoff |
|---|----------|----------------------|
| 1 | **Arcs are in scope, first-class alongside NPCs and factions** | `PRODUCT.md` and `docs/06-api-contracts.md` already specify arcs in the extract/review/save flow; the `arcs` table and its RLS policies already exist. Tradeoff: one more entity type to extract, review, and persist per request — accepted, since deferring it would leave the product docs and API contract permanently inconsistent with the implementation. |
| 2 | **Stateless extract + explicit save** (Approach 1) | Matches `06-api-contracts.md` exactly; no draft table, no orphaned rows; DM can abandon mid-review with zero backend state. Tradeoff: a dropped browser session between screens loses extracted data — acceptable for MVP (frontend preserves typed text; server-side draft recovery is out of scope). |
| 3 | **Per-user (JWT-bound) Supabase client** on the critical path | Only way `auth.uid()` resolves so RLS permits the write. Add a per-request client factory in `shared/` + a dependency exposing the raw bearer token alongside the user id (`get_current_user` today returns id only). **Never use the service-role client for campaign/NPC/faction/arc writes.** Tradeoff: per-request construction (not a process singleton) because it carries a scoped token — small overhead, correct isolation. |
| 4 | **Reuse the existing LLM seam** | `complete_json` + `parse_llm_json` + `FakeLlmProvider` already provide the single Pydantic-validated path. Hard rule: all LLM output validated before it reaches the DM. Do not reinvent JSON parsing/validation. |
| 5 | **First Jinja prompt via a shared render helper** | Introduce a minimal reusable render helper in `shared/` (e.g. `shared/prompts.py`) + versioned template `prompts/extract_campaign_v1.jinja`. Sets the precedent reused by sessions/memory/generation. Tradeoff: slightly more infra now for consistency later — justified because prompt versioning conventions are expensive to retrofit. |
| 6 | **Bound the premise to 100–8000 characters on both layers** | Backend Pydantic `Field(min_length=100, max_length=8000)` is the trust boundary; frontend mirrors it with a char counter for UX. The cap is a product/UX + cost/latency + extraction-quality decision, not a model context-window limit — the configured models (gemini-2.5-flash ~1M tokens, groq qwen3-32b 131K tokens) accept far more than 8000 chars (≈2000–2300 tokens). Errors must never discard the DM's typed text. |
| 7 | **Multi-table save: ordered inserts + compensating delete** (see below) | Chosen MVP strategy; avoids orphaned empty campaigns without a Postgres RPC. Covers campaign → npcs → factions → arcs. |
| 8 | **Arcs get a persisted `content_source` — one additive migration** (reverses an earlier "asymmetry accepted" note) | `PRODUCT.md`'s domain model and the review UI treat arc provenance the same as npc/faction provenance; an earlier draft left arc `content_source` UI-only with no DB column. That is overruled: Block 5 ships one additive migration, `alter table arcs add column content_source content_source;` (nullable, no backfill, no default — zero-downtime). This is the first migration beyond the base schema. Deployment for this block: the `CLOUD.md`-sanctioned manual controlled `db push --dry-run` then `db push`, recorded in the PR (**provisional, pending final user confirmation**); the automated protected CI/CD `db push` pipeline is a separate fast-follow infra PR, not part of this feature PR. See design for the exact migration path and rationale. |

### Decision 7 — atomicity strategy (resolved)

`POST /campaigns` writes a campaign row, then N NPC rows, then M faction rows, then P arc rows across separate PostgREST calls with no built-in cross-table transaction. **Chosen for MVP: best-effort ordered inserts (parent first) with a compensating delete on child failure**, all executed through the per-user client under RLS.

- Parent campaign inserted first (children need its FK).
- If any child insert fails, issue a compensating delete of the just-created campaign so the DM is not left with an orphaned empty campaign, then return a clear retryable error that preserves the reviewed payload on the frontend.
- If the compensating delete also fails (rare), surface the created campaign id so it can be cleaned up, and log per `docs/05-ai-system.md` trace rules.

**Why not a Postgres RPC now.** A `SECURITY INVOKER` RPC would give true single-statement atomicity, but it reintroduces a migration (this block's standout advantage is needing none) and adds deadline risk. Critically, an RPC must be `SECURITY INVOKER` — a `SECURITY DEFINER` function would run as the definer and **bypass RLS**, defeating the entire per-user-client rationale of decision #3. The RPC is documented here as the **post-MVP hardening path**, not the Block 5 implementation.

## Impact

| Area | Nature of change |
|------|-----------------|
| Backend `campaigns` module | New: domain models (including `Arc` with `content_source`), repository port, extract + create use cases, Supabase repository, router, HTTP schemas, prompt template. First application-layer + `FakeLlmProvider` test pattern for the codebase. |
| `shared/` | New per-user Supabase client factory + token-exposing dependency; new Jinja render helper. Precedent-setting for later modules. |
| `supabase/migrations/` | One new additive migration: `<timestamp>_add_content_source_to_arcs.sql`. First migration since the base schema. |
| `main.py` | Wire the new `campaigns` router. |
| Frontend | Two new screens (`/campaigns/new`, `/campaigns/new/review`); reuse `apiFetch`; new payload types/schemas. |
| Tests | Use-case tests (fake LLM fixtures), app-layer RLS ownership test, route tests, frontend component tests. |
| `supabase/CLOUD.md` | "Current status" note: this migration deploys via the manual controlled `db push` path for this block; automated pipeline is a fast-follow. |
| `docs/10-roadmap.md` | Mark Block 5 checklist on completion; note the arcs migration and its deployment path. |

File-by-file breakdown lives in the exploration and is for the **tasks** phase.

## Risks

| Risk | Mitigation |
|------|-----------|
| **RLS-safe write path is unbuilt** — accidentally using the service-role client would silently bypass RLS | Explicit app-layer test asserting User A cannot write into User B's campaign (existing RLS tests are raw-SQL only). Hard rule documented in decision #3. |
| **LLM validation failures are user-facing** (short/ambiguous premise) | Map `LlmOutputValidationError` to a clear retryable HTTP error; never leak raw LLM output or full prompts (per `docs/05-ai-system.md`). |
| **Partial multi-table save** | Compensating delete + payload-preserving retryable error (decision #7). |
| **First Jinja prompt sets a convention** for sessions/memory/generation | Get the shared render helper + versioned template naming right now (decision #5). |
| **First post-base-schema migration** — arcs `content_source` | Kept additive/nullable (no backfill, no default) to stay zero-downtime; deployed via the manual controlled `db push` path (decision #8), provisional pending user confirmation; verified with `--dry-run` first since the hosted `supabase_migrations` history may not reflect a dashboard-applied base schema. |
| **PR size** | **Accepted up front: this block ships as a single PR with `size:exception`.** The change spans a new backend module, the per-user client, two frontend screens, one additive migration, and their test suites — it will exceed the 400-line budget, and that is an approved exception for this block, not a signal to split. |

## Open items for spec / design

- **Spec** must formalize: field-level `ExtractCampaignOutput` schema (including arcs), per-endpoint request/response schemas, the 100–8000-char validation scenarios, `content_source` provenance rules, and the User-A-vs-User-B ownership scenario.
- **Design** must decide: exact shape of the per-user client factory and token-exposing dependency (extend `get_current_user` vs. sibling dependency), the Jinja `Environment` loader placement/API in `shared/`, and confirm the ordered-inserts + compensating-delete implementation surface.
- Spec and design can run **in parallel** off this proposal.
