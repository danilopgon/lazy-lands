# Block 6 — Campaign view (+ docs/ENV maintenance sweep)

Turn the placeholder `/dashboard` into a real campaign hub: list campaigns, open a campaign's detail (title, description, world state), browse and lightly edit its NPCs and factions, and edit world state as free text. Backend gains the read + update endpoints the schema already supports (no migration). Bundled in the same change: a documentation/ENV maintenance sweep that realigns stale docs with the code that shipped in Blocks 4–5. Single PR (`size:exception` recorded at tasks time — do not split).

## Intent

**Problem.** Post-Block-5 a DM can *create* a campaign but has nowhere to *see* it: `/dashboard` is a placeholder, and there is no detail, NPC, or faction view. No backend read path (`GET /campaigns`, `GET /campaigns/{id}`) or light-edit path (`PATCH` campaign world_state / npc / faction) exists yet. Separately, several docs describe env vars and providers that no longer match the code (fictional `OPENROUTER_*` vars, a missing `.env.example`, a wrong `/api` base path), which actively misleads setup and future blocks.

**Why now.** Block 6 is the first read/edit surface over user-owned data; every later block (sessions, memory validation) navigates *from* a campaign detail screen. And the docs drift compounds each block — cheapest to fix while the audit (see `explore.md`) is fresh.

**Success looks like.** A DM lands on `/dashboard`, sees their campaigns, opens one, reads/edits world state, opens its NPC and faction lists, edits a name/status/motivation or name/stance/goals through a modal, and sees it persist — all under existing RLS. Setup docs (`cp .env.example .env`) work, and provider/route/env references match the running code.

## What changes

### Part 1 — Block 6 feature (capability-level)

| Kind | Item |
|------|------|
| Backend endpoints (net-new, no migration) | `GET /campaigns` (list) · `GET /campaigns/{id}` (detail with children) · `PATCH /campaigns/{id}` (world_state overwrite) · `PATCH /npcs/{id}` (name, current_state, motivation) · `PATCH /factions/{id}` (name, current_stance, goals) |
| Frontend routes/screens | `/dashboard` (placeholder → real list) · `/campaigns/:id` (detail: title, description, world-state view + edit) · `/campaigns/:id/npcs` (list + edit modal) · `/campaigns/:id/factions` (list + edit modal) |
| New shared primitives | `Field` (label/help/error form wrapper) · `Modal` (edit dialog) — built as reusable `components/ui/` components first, per handoff-first contract |

Handoff prototypes: `handoff/app/views-dashboard.jsx`, `views-detail.jsx`, `views-entities.jsx` (NpcsView + FactionsView). All screens follow the handoff-first contract (read prototype → checklist → implement → adversarial self-review).

### Part 2 — Docs & ENV maintenance sweep

| File | Edit |
|------|------|
| Root `.env.example` (exists) | Audit/update only if variables changed; otherwise document no-change. Keep enumerating real vars (no secrets): `LLM_PROVIDER`, `GEMINI/GROQ/MISTRAL/CEREBRAS_API_KEY`, `LLM_FALLBACKS`, Supabase + `NEXT_PUBLIC_API_URL`. Root only; do not create another file. |
| `README.md` | Replace fictional `OPENROUTER_*` with real provider/`LLM_FALLBACKS` vars; drop unused `SUPABASE_JWT_SECRET`; fix `cp .env.example .env` to work. |
| `services/api/README.md` | `SUPABASE_ANON_KEY` → `SUPABASE_PUBLISHABLE_KEY`; de-stale the "Block 0 only" description. |
| `docs/04-architecture.md`, `docs/05-ai-system.md` | Add Mistral + Cerebras providers and `FallbackLlmProvider` / `LLM_FALLBACKS` semantics. |
| `docs/06-api-contracts.md` | Fix the `/api` base-path claim (no global prefix); note NPC/faction PATCH will be specced. |
| `PRODUCT.md` §5, §10 | Point list view at real `/dashboard`; mark `/campaigns/new` + `/review` as real Block-5 flows. |
| `.agents/skills/frontend-handoff-contract/references/route-map.md` | Repoint dashboard/list view from `/campaigns` to `/dashboard`. |
| `docs/10-roadmap.md` | Mark Block 6 in progress; drop Block 4's "(pending production smoke test)" qualifier. |

## Capabilities

> Contract with sdd-spec. The docs/ENV sweep (Part 2) is **not** a capability — it is a deliverable list under Affected Areas, not specced behavior.

### New Capabilities
- `campaign-view`: read paths + world-state editing — `GET /campaigns`, `GET /campaigns/{id}`, `PATCH /campaigns/{id}` (world_state), plus list and detail screens.
- `entity-editing`: light NPC/faction editing — `PATCH /npcs/{id}`, `PATCH /factions/{id}`, plus NPC/faction list + edit-modal screens and the `Field`/`Modal` primitives.

### Modified Capabilities
- None. (`repository-bootstrap` is unaffected; Block 5 shipped no formal spec files.)

## Scope / non-goals

**In scope:** the 5 endpoints, 4 routes, 2 primitives, and doc/ENV edits above.

**Out of scope (explicit):** sessions and memory-fact UI/endpoints; arcs UI editing beyond what already exists; RAG/embeddings; renaming `/dashboard` to `/campaigns`; world-state provenance / `content_source` semantics; any DB migration; per-app `.env.example` files; billing; multi-user collaboration.

## Locked product decisions (do not re-open)

1. **Campaign-list route stays `/dashboard`** — not renamed. Detail/entities routes are `/campaigns/:id`, `/campaigns/:id/npcs`, `/campaigns/:id/factions`. `PRODUCT.md` §5 and `route-map.md` are updated to point the list view at `/dashboard`. The list↔detail route-prefix asymmetry (`/dashboard` vs `/campaigns/:id`) is an accepted decision.
2. **Single root `.env.example`** enumerating real vars (no secrets); fix README `cp .env.example .env` so it works. Root only — no per-app example files.
3. **World-state editing is a plain overwrite** — `campaigns.world_state` stays free text; no provenance, no `content_source`, no migration.
4. **Block 4 roadmap note**: remove "(pending production smoke test)" — Block 5 exercised the deployed auth+API path, so it is considered done.

## Impact / affected areas

| Area | Nature |
|------|--------|
| Backend `campaigns` module | New repository read/update methods + router endpoints; reuse Block-5 per-user Supabase client + error mapping. |
| `npcs` / `factions` update paths | New PATCH endpoints under existing RLS (no new policies). |
| Frontend `apps/web/app/` | `/dashboard` rewrite + 3 new routes; reuse `apiFetch`. |
| `apps/web/components/ui/` | New `Field` + `Modal` primitives. |
| Docs / ENV / route-map (Part 2) | ~8 file edits per table above; additive, no behavior code. |
| Tests | Route + repository tests (read + PATCH), frontend component tests, RLS ownership check on PATCH paths. |

**Risk to flag (do not decide here):** the domain Pydantic models (`Campaign`, `NPC`, `Faction`) are `frozen=True`. The PATCH endpoints need a mutation pattern (rebuild-and-replace vs. a dedicated mutable update DTO mirroring the `Create*Request` split). This is a **sdd-design** decision.

## Open design questions (hand to sdd-design)

- **Frozen-model PATCH pattern**: how partial updates flow through immutable domain models to the repository (rebuild vs. update-DTO), and whether PATCH is partial (only-supplied-fields) or full-object replace.
- **Error mapping reuse**: reuse Block-5's HTTP error mapping (ownership 404/403, validation 422) for the new read/PATCH endpoints; confirm the not-found-vs-forbidden convention for cross-user access under RLS.

## Rollback plan

All backend endpoints are net-new and additive; the doc/ENV sweep is additive text + one new file. No migration, no schema or RLS change. Rollback = revert the PR; nothing to un-migrate, no data touched.

## Success criteria

- [ ] The 5 endpoints exist and enforce ownership via existing RLS (User A cannot read/patch User B's data).
- [ ] `/dashboard`, `/campaigns/:id`, `/campaigns/:id/npcs`, `/campaigns/:id/factions` render against their handoff prototypes (adversarial self-review passes).
- [ ] `Field` and `Modal` exist as reusable `components/ui/` primitives.
- [ ] `cp .env.example .env` works; README/docs/route-map/PRODUCT env, provider, and route references match the running code.

## Dependencies

- Builds on Block 5 (per-user Supabase client, error mapping, `apiFetch`, existing schema + RLS). No external dependencies.
- sdd-spec and sdd-design can run in parallel off this proposal.

---

## Scope Amendment (post-review, interactive round) — AUTHORITATIVE

This amendment supersedes the original narrower scope above where they conflict. It is the product of an interactive review with the product owner and is the single source of truth for the revised spec, design, and tasks. Governing principle: **the handoff rules at the design level; the MVP business scope rules at the scope level due to time limitation** — nothing in the handoff is "cut," it is classified as Block 6 / a later block / out-of-MVP.

### A1 — Full CRUD for NPCs, factions, AND arcs (was: list + light edit)
Block 6 delivers full **create + edit + delete** for NPCs, factions, and arcs (product owner confirmed; the handoff designs all three with modals + add/delete actions). Capability `entity-editing` is renamed **`entity-management`** to reflect create/delete. New backend endpoints beyond the original PATCHes: `POST`/`DELETE` for `/npcs`, `/factions`, `/arcs`, plus `GET`/`PATCH` for arcs. All under existing RLS (INSERT/UPDATE/DELETE policies already exist for all three tables — verified in `20260628101707_initial_schema.sql`).

### A2 — Arcs are IN Block 6 (new route + handoff file that the initial explore missed)
`handoff/app/views-arcs.jsx` (`ArcsView` + `ArcModal`, route `/campaigns/:id/arcs`) exists and defines full arc CRUD. Reduced-scope fields: **`title`, `description`, `priority`, `status`** (all persisted on the `arcs` table + domain `Arc`). **Deferred** (documented, not silently dropped): the modal's `npcs`/`factions` cross-references → **Out of MVP** (Relationship graph, excluded by the roadmap Scope-cut and the owner's confirmation), and `lastSession` → **Block 7**.

### A3 — Persist campaign `system` + `tone` (ADDITIVE; `status` stays OUT)
The Block-5 create form already captures `system` (required) + `tone` (optional) but `composeRawText` (`apps/web/app/campaigns/new/page.tsx:34–46`) folds them into `raw_text`; they are never stored structurally. **Migration** adds `system` and `tone` columns to `campaigns`. **CONSTRAINT (non-negotiable, protects shipped Block 5):** keep `composeRawText` folding system/tone into the premise so extraction behavior AND its Block-5 tests are unchanged; ADDITIONALLY carry system/tone as structured fields on the create payload for persistence. Display system/tone on the detail screen; they are editable via `PATCH /campaigns/{id}`. Campaign **`status`** stays **Out of MVP** — no product semantics defined, captured nowhere, pure handoff visual invention.

### A4 — Arc status enum reconciliation (data-aware migration, i18n-stable codes)
Align `arc_status` to the handoff's four states but as **stable lowercase enum codes** (never display strings): `active`, `dormant`, `resolved`, `discarded`. Display labels ("Active", "Dormant", …) live in the presentation layer for future i18n. **Touchpoints the design MUST enumerate (all Block-5 surface):** the Postgres `arc_status` enum (rename `open`→`active`, `dropped`→`discarded`, `ADD VALUE 'dormant'`, backfill existing `open` rows → `active`), `domain/enums.py::ArcStatus`, `infrastructure/repository.py:98` (insert default `status="open"` → `"active"`), the extraction→persistence default, and any tests referencing the old values.

### A5 — Detail-page Block-7 slots become dimmed placeholders
`views-detail.jsx` `/02 Recent sessions` and `/04 Active memories` are Block 7. Render them as dimmed "coming in a later chapter" placeholder cards to preserve the two-column layout rhythm (not collapse to one column). `/01` world state and `/03` arcs are live.

### A6 — LOCKED design decisions from the first design pass (EXTEND, do not relitigate)
These survived review and are locked; the revised design extends them to cover CRUD + migrations rather than reopening them:
- Frozen-model writes → `Update*Request` / `Create*Request` DTOs + repository `create_*`/`update_*`/`delete_*` methods (writes never flow through frozen domain models; `model_copy` unneeded).
- Partial PATCH via `model_dump(exclude_unset, exclude_none)`; empty body → 422.
- **404-on-RLS-miss** uniformly (no existence leak) across all Block 6 endpoints.
- Frontend: client components + **TanStack Query** (`@tanstack/react-query` is a confirmed dependency + `QueryClientProvider` in `providers.tsx`) + `apiFetch`.
- Hand-rolled accessible `Modal` (Radix not a dependency): focus trap, return-focus, Escape, aria, portal, reduced-motion.

### A7 — Confirmed Out-of-MVP (classified, not cut)
Campaign `status`; NPC `relation`/party-relation, NPC↔faction, NPC↔session refs; faction `influence`, faction↔NPC/arc counts; faction `lastReaction` (→ Block 8); the `/campaigns/:id/settings` `SettingsView` screen. All are documented as later-block or out-of-MVP with doc evidence, not removed from the design vision.

### A8 — Delivery / size (settled)
Single PR with `size:exception` (owner reaffirmed, eyes open). This is now ~3 CRUD entity screens + list + detail + 2 migrations + Block-5 touchpoints + docs sweep. `sdd-tasks` MUST slice as reviewable **work-units** ordered backend-reads → frontend-reads → migrations+writes → docs, and `sdd-apply` runs in batches with apply-progress continuity. Do not re-ask about splitting.

### Handoff files in scope for Block 6
`views-dashboard.jsx` (Dashboard/CampaignCard — `NewCampaign` already shipped in Block 5), `views-detail.jsx` (`CampaignDetail`; `SettingsView` OUT), `views-entities.jsx` (`NpcsView`, `FactionsView`), `views-arcs.jsx` (`ArcsView`), `ui.jsx` (shared: `Field`, `Modal`, `OriginBadge`, `EmptyState`, `ScribeNotice`, `Loading`, `Shell`).
