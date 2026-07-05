# Exploration — block-6-campaign-view

**What**: Exploration for change `block-6-campaign-view` covering (A) a docs/ENV staleness audit after Block 5, and (B) the current-state map + gap list for Block 6 (Campaign view: list, detail, NPC/faction list+edit, world-state edit).

**Why**: Block 5 (campaign creation + AI onboarding) just shipped; docs and env references need a staleness sweep before Block 6 planning, and Block 6 needs a concrete gap map (routes, endpoints, data model, handoff prototypes) before sdd-propose.

**Where** (files inspected): PRODUCT.md, README.md, docs/00-10, services/api/app/shared/config.py, security.py, dependencies.py, app/main.py, app/modules/campaigns/{routes,schemas,domain,infrastructure/repository}.py, supabase/migrations/*.sql, apps/web/app/{dashboard,campaigns/new,campaigns/new/review}, apps/web/components/ui/*, handoff/app/{views-dashboard,views-detail,views-entities}.jsx, .agents/skills/frontend-handoff-contract/*.

## A — Docs & ENV audit (concrete file → issue → fix)

| File | Issue | Correct value / action |
|---|---|---|
| `README.md` §Environment Variables | Documents `LLM_PROVIDER: fake or openrouter`, `OPENROUTER_API_KEY`, `OPENROUTER_MODEL`. None of these exist in code. | Replace with actual vars from `services/api/app/shared/config.py` + `providers/registry.py`: `LLM_PROVIDER` (fake\|gemini\|groq\|mistral\|cerebras), `GEMINI_API_KEY`, `GROQ_API_KEY`, `MISTRAL_API_KEY`, `CEREBRAS_API_KEY`, `LLM_FALLBACKS` (comma/space-separated provider names, tried in order after primary). |
| `README.md` §Environment Variables | Lists `SUPABASE_JWT_SECRET` as backend var. | Confirmed UNUSED — `services/api/app/shared/security.py` validates JWTs via Supabase JWKS endpoint (ES256, derived from `SUPABASE_URL`), never a static secret. Documented-but-unused; remove or mark deprecated. |
| `README.md` "cp .env.example .env" (2 places) + Docker Compose section | No `.env.example` (or any `*.env.example`/`.env.sample`) exists anywhere in the repo (verified via glob at root, apps/web, services/api). Command is broken as written. | Either create the missing `.env.example` file(s) (root + maybe per-app) enumerating the real vars, or rewrite the setup instructions to not depend on a nonexistent file. This is a genuine action item, not just a doc fix. |
| `services/api/README.md` §Environment | Uses `SUPABASE_ANON_KEY` — stale name; `config.py` field is `supabase_publishable_key` (env `SUPABASE_PUBLISHABLE_KEY`), matching README.md root and the Supabase "publishable key" rebrand. | Rename to `SUPABASE_PUBLISHABLE_KEY`. Also this file still describes only Block 0 scaffold — stale relative to Block 4/5 reality (real auth, real campaign persistence exist now). |
| `docs/04-architecture.md` line ~43 | "OpenAI-compatible adapter... provider registry (Gemini, Groq free tiers)" — missing Mistral + Cerebras + fallback chain. | Update to: "provider registry (Gemini, Groq, Mistral, Cerebras free tiers) with an optional `FallbackLlmProvider` chain driven by `LLM_FALLBACKS`". |
| `docs/05-ai-system.md` §Provider registry | "Supported providers: Gemini (free tier), Groq (free tier)." Missing Mistral, Cerebras, and `LLM_FALLBACKS` fallback-chain behavior entirely. | Update provider list and add a paragraph describing `FallbackLlmProvider` / `LLM_FALLBACKS` semantics (order, skip-if-no-key, dedupe). |
| `docs/06-api-contracts.md` | States `Base path: /api` for all endpoints. Actual `app/main.py` mounts `campaigns.router` with prefix `/campaigns` (no `/api` prefix) and `health.router` similarly unprefixed. Real routes today: `POST /campaigns/extract`, `POST /campaigns`. | Remove the `/api` base-path claim or reconcile it with actual FastAPI mounting (no global `/api` prefix exists). This affects how the frontend `NEXT_PUBLIC_API_URL` + route paths should be documented, and matters for Block 6 client code. |
| `docs/06-api-contracts.md` | Already specifies `GET /campaigns`, `GET /campaigns/{campaign_id}`, `PATCH /campaigns/{campaign_id}` (world_state) — good, forward-looking spec exists. But has NO `PATCH /npcs/{id}` or `PATCH /factions/{id}` contract at all, which Block 6 explicitly requires (basic NPC/faction editing). | Gap to fill in sdd-spec: add NPC/faction PATCH contracts mirroring the existing arc PATCH pattern. |
| `docs/10-roadmap.md` | Block 4 marked "done (pending production smoke test)" — status line says the smoke test note may be stale/needs reconfirmation now that Block 5 shipped and presumably exercised the deployed auth+API path. Block 5 checklist items all read consistent with code found (extraction, persistence, RLS, ownership guard, content_source, review UI) — no roadmap inaccuracies found for Block 5. | Confirm with user/CI history whether the Block 4 production smoke test has since been executed; if yes, drop the "(pending production smoke test)" qualifier. |
| `PRODUCT.md` §10 | Says "`/login`, `/register` and `/dashboard` are stable placeholder routes, not finished product flows" and doesn't mention `/campaigns/new` or `/campaigns/new/review` at all, which are now REAL implemented flows post-Block-5 (with tests, Zod schemas, provenance badges). Also `/dashboard` (not `/campaigns`) is the actual list route, still a placeholder per its own page.tsx comment. | Update §10 to: (a) note `/campaigns/new` + `/campaigns/new/review` are real, tested, Block-5-complete flows; (b) keep `/dashboard` flagged as placeholder — still true — this is exactly what Block 6 must replace. |
| `PRODUCT.md` §5 screen inventory | Lists route `/campaigns` for Dashboard, but actual implemented route is `/dashboard`. Route-map.md (skill reference) also says `/campaigns` → `views-dashboard.jsx`. | Real discrepancy between product doc / handoff route-map (`/campaigns`) and actual Next.js route (`/dashboard`). This is a decision Block 6 propose must resolve explicitly (rename route to `/campaigns` for consistency, OR keep `/dashboard` and update docs+route-map). Recommend renaming to `/campaigns` for URL consistency — flagged as open question. |

No `.env.example` exists anywhere in the repo (root, apps/web, services/api) despite being referenced 3+ times in README.md and once in AGENTS.md's own rule ("Use `.env.example` for documenting required variables"). This is the single highest-value fix from the audit.

## B — Block 6 current-state map

**Frontend routes that exist today**: `/`, `/login`, `/register`, `/forgot-password`, `/auth/confirm`, `/auth/reset`, `/dashboard` (placeholder list), `/campaigns/new` (real), `/campaigns/new/review` (real). NOTHING exists yet for `/campaigns/:id`, `/campaigns/:id/npcs`, `/campaigns/:id/factions`. Block 6 is greenfield for detail/entities screens; `/dashboard` needs to go from placeholder to real (fetch + render), and its route name is an open question (see above).

**Backend endpoints that exist today**: `POST /campaigns/extract` (stateless LLM call), `POST /campaigns` (persist reviewed campaign + children). NOTHING exists for `GET /campaigns` (list), `GET /campaigns/{id}` (detail), `PATCH /campaigns/{id}` (world_state edit), `PATCH /npcs/{id}`, `PATCH /factions/{id}` — all must be built in Block 6. `docs/06-api-contracts.md` already speculatively specifies `GET /campaigns`, `GET /campaigns/{id}`, `PATCH /campaigns/{id}` — reuse/refine those; NPC/faction PATCH contracts must be authored net new.

**Data model reality** (`supabase/migrations/20260628101707_initial_schema.sql` + domain models): `npcs` table has `name, description, current_state, motivation, content_source` — exactly matches Block 6's NPC list+edit needs (name, status[=current_state], motivation). `factions` has `name, description, current_stance, goals, content_source` — matches Block 6 faction list+edit (name, stance, goals). `campaigns.world_state` (text, nullable) already exists for the free-text world-state edit. No migration needed for Block 6 — all fields already persisted since Block 5. Domain Pydantic models (`NPC`, `Faction`, `Campaign` in `app/modules/campaigns/domain/`) are frozen/immutable — Block 6 will need either new domain methods or direct schema+repository update paths for PATCH use cases (architectural decision for sdd-design).

**RLS**: All 6 tables (`campaigns`, `sessions`, `npcs`, `factions`, `arcs`, `memory_facts`) already have full SELECT/INSERT/UPDATE/DELETE RLS policies scoped by campaign ownership (`campaigns.user_id = auth.uid()` direct, children via EXISTS subselect). Block 6 read/update endpoints can rely on existing RLS + the established per-user Supabase client pattern (`get_user_supabase_client` / `AuthContext`) — no new RLS policies needed, just new repository methods and routes using the existing per-user client injection pattern from Block 5.

## Handoff prototype inventory

| Route | Handoff file | Shared components used |
|---|---|---|
| `/campaigns` (dashboard/list) | `handoff/app/views-dashboard.jsx` | `Shell`, likely `EmptyState`, `CampaignCard` (local) |
| `/campaigns/:id` | `handoff/app/views-detail.jsx` | `Shell`, `ScribeNotice` (confirmed via grep) |
| `/campaigns/:id/npcs` | `handoff/app/views-entities.jsx` (`NpcsView`) | `Shell`, `OriginBadge`, `EmptyState`, `Modal`, `Field` (confirmed via grep — NpcModal uses `Field` for name/description/current status) |
| `/campaigns/:id/factions` | `handoff/app/views-entities.jsx` (`FactionsView`, same file) | Same shared component set as NpcsView |

Production `apps/web/components/ui/` already has: `origin-badge.tsx`, `notice.tsx` (covers ScribeNotice/ErrorNotice patterns), `empty-state.tsx`, `loading-scribe.tsx`, `stat-ledger.tsx`, `badge.tsx`, `card.tsx`, `section-header.tsx`. MISSING for Block 6: a reusable `Field` (form-field wrapper with label/help/error) and a `Modal` component — the handoff's NPC/faction edit uses `Modal` + `Field`; neither exists in production `components/ui/` yet and must be built as reusable primitives per the handoff-first contract's "Shared component missing → build it as reusable component first" gate. No `Shell` app-shell component exists yet either (all current pages hand-roll their own header/nav).

## Open questions / risks (for sdd-propose)

1. Route naming: `/dashboard` (current placeholder) vs `/campaigns` (PRODUCT.md + route-map.md) for the campaign list — needs an explicit product decision, not a silent pick.
2. Domain models are `frozen=True` Pydantic — PATCH/edit use cases need a design decision: rebuild-and-replace vs a dedicated mutable update DTO path (mirrors the existing `Create*Request` schema split pattern).
3. `docs/06-api-contracts.md` has no NPC/faction PATCH contract — must be authored in sdd-spec, following the existing arc PATCH shape as precedent.
4. World-state edit is described as "manual editing... free text" in the roadmap — confirm whether editing `world_state` should flip `content_source`-like provenance semantics anywhere, or if `campaigns.world_state` intentionally has no per-field content_source column (matches migration: it doesn't).
5. Confirm whether Block 4's "(pending production smoke test)" note is stale.

## Recommended slicing hint

1. Backend: `GET /campaigns`, `GET /campaigns/{id}` (read paths first — no domain-model mutability decision needed).
2. Frontend: campaign list (replace `/dashboard` placeholder or introduce `/campaigns`) + campaign detail view, read-only.
3. Backend: `PATCH /campaigns/{id}` (world_state), `PATCH /npcs/{id}`, `PATCH /factions/{id}` — resolve the frozen-domain-model design decision here.
4. Frontend: NPC/faction list + edit modals (build `Field`/`Modal` shared primitives first, per handoff-first contract).
5. Docs/ENV cleanup pass (README env table, `.env.example` creation, docs/04/05/06 corrections, PRODUCT.md §10 update) — can run in parallel with steps 1-2 since it's independent of Block 6 code.
