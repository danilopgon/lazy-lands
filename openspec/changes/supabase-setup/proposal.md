# Proposal: supabase-setup

## Intent

The Lazy Lands monorepo carries a complete Supabase local-dev *skeleton* — `config.toml` is fully initialized, the Supabase CLI is a root devDependency (`^2.107.0`), and both the frontend (`apps/web/lib/supabase/*`) and backend (`services/api/app/core/config.py`) client wiring already exist — but there is **zero schema**: `supabase/migrations/` holds only a `.gitkeep`, and `supabase/seed.sql` is a two-line placeholder. Without a versioned schema and a runnable seed, the local stack cannot serve any campaign data, and Block 4 (Auth) cannot proceed: the sacred demo path starts at Login, and auth needs real tables with Row Level Security to validate against. This change delivers the **initial database schema as a committed migration** (6 tables, 5 enum types, RLS enabled with 24 policies), a **minimal runnable seed** (1 auth user, 1 campaign, 2 sessions), and the **cloud-link runbook** so the hosted demo project can receive the schema immediately after merge. It makes `pnpm supabase db reset` produce a fully operable local database and unblocks Block 4 Auth work.

## Scope

### In scope

- **Initial schema migration** `supabase/migrations/<timestamp>_initial_schema.sql`:
  - 5 PostgreSQL enum types via `CREATE TYPE ... AS ENUM`.
  - 6 tables: `campaigns`, `sessions`, `memory_facts`, `npcs`, `factions`, `arcs`, with all columns per `docs/07-data-security-and-rls.md`.
  - UUID primary keys defaulting to `gen_random_uuid()`.
  - Foreign keys with `ON DELETE CASCADE` (child tables → `campaigns`; `memory_facts.source_session_id` → `sessions`).
  - `created_at` / `updated_at timestamptz` defaulting to `now()`.
  - `ENABLE ROW LEVEL SECURITY` on all 6 tables.
  - 24 RLS policies (SELECT / INSERT / UPDATE / DELETE per table).
- **SQL seed** `supabase/seed.sql`: 1 campaign + 2 sessions referencing a fixed `user_id` UUID.
- **Auth seed script** `supabase/scripts/seed-auth.ts`: creates 1 auth user via the Supabase Admin API (`supabase.auth.admin.createUser`) using that same fixed UUID, with a dry-run mode for testability.
- **Root `package.json` scripts**:
  - `supabase:seed-auth` → runs the auth seed script.
  - `supabase:reset` → convenience wrapper chaining `supabase db reset`.
- **Cloud runbook** `supabase/CLOUD.md`: documents the one-time `supabase link` + `supabase db push` steps executed after merge, plus the ongoing incremental migration-push workflow and the Docker Desktop prerequisite.
- **Doc fix** in `AGENTS.md`: "Next.js 15" → "Next.js 16" (matches `apps/web/package.json` `next@16.2.9`).

### Out of scope

- Auth UI (login / register forms) — Block 4, next change.
- Next.js protected routes / session guards — Block 4, next change.
- Backend Supabase client adapter (`services/api/app/infrastructure/supabase/`) — Block 4+.
- JWT validation in `services/api/app/core/security.py` — Block 4.
- TypeScript env declaration file (`env.d.ts`) — Block 4 at latest.
- Rich demo seed (full NPC roster, multiple campaigns, factions, arcs, memory facts) — later block.
- CI integration for the Supabase local stack — later block.
- New environment variables — none needed; `.env.example` already declares all Supabase vars.

## Capabilities

> Contract with the sdd-spec phase. This project is engram-primary with no existing `openspec/specs/`, so all capabilities below are new.

### New Capabilities
- `campaign-data-schema`: the relational schema for all 6 campaign entities (`campaigns`, `sessions`, `memory_facts`, `npcs`, `factions`, `arcs`) including the 5 enum types, UUID primary keys, foreign keys with CASCADE, and timestamp defaults.
- `campaign-data-rls`: row-level ownership isolation across all 6 campaign tables — direct `user_id = auth.uid()` on `campaigns` and EXISTS-on-parent policies on the 5 child tables (24 policies total).
- `local-supabase-seed`: reproducible local provisioning — SQL seed (campaign + sessions) plus an Admin-API auth-user script, exposed via `pnpm` scripts, and the cloud link/push runbook.

### Modified Capabilities
- None. This is the first schema for the project (greenfield database).

## Approach

### Schema strategy

**One migration file.** All schema lives in a single `<timestamp>_initial_schema.sql` migration. The initial schema is a coherent unit reviewed as one diff; splitting 6 tables and 24 policies across multiple files would add review overhead without delivering granularity that matters before the first release. Future schema changes will each be their own incremental migration.

**Enum types via `CREATE TYPE ... AS ENUM`.** Five domain enums are created up front, used as real column types rather than `text + CHECK`. This gives Postgres-level integrity and a single authoritative definition:

| Enum type | Values | Used by |
|---|---|---|
| `content_source` | `llm`, `edited`, `manual` | `npcs.content_source`, `factions.content_source` |
| `arc_status` | `open`, `resolved`, `dropped` | `arcs.status` |
| `priority` | `high`, `medium`, `low` | `arcs.priority` |
| `importance` | `high`, `medium`, `low` | `memory_facts.importance` |
| `memory_status` | `active`, `archived` | `memory_facts.status` |

**RLS policy pattern.** `campaigns` uses direct ownership (`user_id = auth.uid()`); the 5 child tables use an `EXISTS` sub-select against the parent campaign:

```sql
exists (
  select 1
  from campaigns
  where campaigns.id = <child>.campaign_id
    and campaigns.user_id = auth.uid()
)
```

Each table gets four policies (SELECT, INSERT, UPDATE, DELETE). `INSERT` policies use `WITH CHECK`; `SELECT`/`DELETE` use `USING`; `UPDATE` uses both. The migration order is: enum types → tables (parent before children) → `ENABLE ROW LEVEL SECURITY` → policies.

### Seed strategy

The seed is split by responsibility because Supabase Auth users cannot be created with a plain `INSERT INTO auth.users` — an authenticatable user also needs a matching `auth.identities` row and a correctly formatted password hash.

- **`supabase/scripts/seed-auth.ts`** (Decision 7, Option B): calls `supabase.auth.admin.createUser({ email, password })` via the Admin API, pinning the user's id to a fixed UUID. This guarantees a user that can actually log in. Exposed as `pnpm supabase:seed-auth`. A `--dry-run` flag lets the script be exercised without a live stack (and unit-tested with a mocked Admin client).
- **`supabase/seed.sql`**: inserts 1 campaign (owned by the fixed `user_id`) + 2 sessions for that campaign. `config.toml` already runs `seed.sql` on `db reset`.

**Local dev workflow after this change:**

```bash
# Prerequisite: Docker Desktop running
pnpm supabase start          # local Supabase on Docker
pnpm supabase status         # copy API URL + keys into .env
pnpm supabase:reset          # db reset → migrations + seed.sql
pnpm supabase:seed-auth      # create the auth user via Admin API
# local stack ready for Block 4 Auth
```

### Cloud setup strategy

A hosted free-tier Supabase project already exists (the slot is not new). Per Decision 6, this change **documents** the cloud workflow in `supabase/CLOUD.md` rather than coding it; the link + push steps are executed manually after this change merges to main:

```bash
supabase link --project-ref <ref>
supabase db push            # applies the initial schema migration to the hosted DB
```

Block 4 auth begins immediately, and testing auth against the hosted project requires the schema to be present there. From this point forward, **every new migration is pushed incrementally** with `supabase db push` as part of the merge-to-main routine. `CLOUD.md` records the project reference location, the one-time link, the push command, the incremental workflow, and the Docker Desktop prerequisite.

### TDD approach

Strict TDD is enabled, applied pragmatically to a schema/infrastructure change. Pure DDL statements are not unit-testable line by line; the meaningful "test" is that the schema applies cleanly and behaves correctly under RLS. Tests are written before the migration is considered done:

- **Backend (pytest), schema verification** — tests query the local Supabase Postgres (port 54322) to assert structure: all 6 tables exist, expected columns and types are present, the 5 enum types exist with the correct values, FK constraints exist with `CASCADE`, and RLS is enabled on every table. These are written first and fail until the migration exists.
- **Backend (pytest), RLS behavior** — using two seeded user contexts (or `set role` / JWT claims simulating `auth.uid()`), assert the security invariants from `docs/07` §Test requirements: User A cannot SELECT User B's campaigns; User A cannot INSERT a session into User B's campaign; child-entity reads/writes are blocked when the parent campaign is not owned. These encode the 24-policy intent behaviorally rather than by inspecting policy text.
- **Seed-auth script (Vitest)** — the `seed-auth.ts` dry-run path is unit-tested with a mocked Admin client to assert it would call `createUser` with the expected email and pinned UUID, and that it fails loudly when service-role credentials are absent.
- **Frontend (Vitest)** — no new client logic is introduced (the Supabase modules already exist), so no new frontend unit tests beyond the seed-script test. If any helper is added, it gets a unit test.
- **Migration acceptance gate** — `pnpm supabase:reset` (db reset → migrations + seed) completing without error, followed by the pytest schema + RLS suite passing, is the definition of a green migration. This is the pragmatic substitute for per-statement unit tests.

## Key decisions

| Decision | Rationale |
|---|---|
| Single initial migration file | Initial schema is one coherent reviewable unit; granularity not yet valuable. |
| Migrations versioned in git | Reproducible schema; same migrations drive local and hosted DBs. |
| 5 enum types via `CREATE TYPE AS ENUM` | Postgres-level integrity for domain enums; single source of truth (Decision 8). |
| RLS on all 6 tables, 24 policies | `docs/07` mandates ownership isolation; direct on `campaigns`, EXISTS sub-select on children. |
| Auth user seeded via Admin API script (Option B) | Plain `INSERT INTO auth.users` cannot produce an authenticatable user; Admin API handles identities + password hash (Decision 7). |
| SQL seed handles campaign + sessions only | `seed.sql` runs on `db reset`; auth user is created separately by the TS script. |
| Minimal seed (1 user, 1 campaign, 2 sessions) | Enough to exercise auth + basic flows; rich demo seed deferred (Decision 4). |
| Local dev on Supabase CLI + Docker | CLI already a devDependency; Docker Desktop a documented prerequisite (Decisions 1, 5). |
| Cloud `link` + `db push` after merge, documented in `CLOUD.md` | Block 4 auth needs schema in the hosted project to test prod auth; incremental push thereafter (Decision 6). |
| Add `supabase:reset` + `supabase:seed-auth` scripts | One-command local setup; consistent developer experience. |
| Fix `AGENTS.md` Next.js version | Docs say 15, code runs `next@16.2.9`; prevents contributor confusion. |

## Success criteria

- [ ] `supabase/migrations/<timestamp>_initial_schema.sql` exists and is committed.
- [ ] `pnpm supabase start` then `pnpm supabase:reset` completes with no errors on a clean local stack.
- [ ] All 5 enum types exist with the exact values listed in the schema strategy table.
- [ ] All 6 tables exist with every column from `docs/07-data-security-and-rls.md`, UUID PKs defaulting to `gen_random_uuid()`, and `created_at`/`updated_at` defaulting to `now()`.
- [ ] Foreign keys exist with `ON DELETE CASCADE` (children → `campaigns`; `memory_facts.source_session_id` → `sessions`).
- [ ] RLS is enabled on all 6 tables and all 24 policies (SELECT/INSERT/UPDATE/DELETE per table) are present.
- [ ] Backend pytest schema-verification tests pass against the local DB.
- [ ] Backend pytest RLS-behavior tests pass: a user cannot read or write another user's campaign data (the `docs/07` security checks).
- [ ] `pnpm supabase:seed-auth` creates the auth user with the pinned UUID; its dry-run unit test passes.
- [ ] `supabase/seed.sql` inserts 1 campaign + 2 sessions owned by the seeded user after `db reset`.
- [ ] `supabase/CLOUD.md` documents `link` + `db push` and the incremental push workflow.
- [ ] `AGENTS.md` reads "Next.js 16".

## Risks & mitigations

| Risk | Likelihood | Mitigation |
|---|---|---|
| Admin-API auth seeding misconfigured (wrong service-role key / URL) so the user can't log in | Medium | Pin the UUID; script fails loudly when service-role credentials are missing; verify login manually once; dry-run unit test covers call shape. |
| RLS policies too permissive or too strict (data leak or lockout) | Medium | Behavioral pytest RLS tests encode the `docs/07` security invariants and must pass before merge. |
| Seed `user_id` UUID drifts between `seed.sql` and `seed-auth.ts`, orphaning campaign rows | Medium | Use a single documented fixed UUID constant referenced by both; assert ownership in seed verification. |
| Enum values lock the schema; later domain changes need `ALTER TYPE ... ADD VALUE` migrations | Low | Values match the closed domain decisions; future additions are normal incremental migrations. |
| Hosted-project schema divergence once incremental pushes begin | Low | All schema changes are committed migrations; only `db push` mutates the hosted DB; `CLOUD.md` documents the routine. |
| `.env.example` not directly verifiable (Windows dotfile permission) | Low | Block-0 evidence confirms all Supabase vars are present; no new vars are introduced by this change. |
| Docker Desktop not running blocks local stack | Low | Documented prerequisite in `CLOUD.md` and existing `supabase/README.md`. |

## Rollback Plan

- **Local**: revert the PR (drop the migration file and reverted `seed.sql`/scripts); `pnpm supabase db reset` restores the empty pre-migration schema. No local data of value is lost.
- **Cloud**: the hosted `link` + `db push` is a manual step executed *after* merge. If the change is reverted before any push, there is nothing to roll back. If already pushed, apply a reverting migration (`DROP POLICY` → `DROP TABLE ... CASCADE` → `DROP TYPE`) — safe because the hosted project holds no real campaign data yet — then `db push` the revert. Document this in `CLOUD.md`.
- **Scripts/docs**: `supabase:reset`, `supabase:seed-auth`, and the `AGENTS.md` edit are independently revertible with no runtime impact.

## Dependencies

- Docker Desktop running locally (prerequisite for the Supabase CLI stack).
- Supabase CLI — already a root devDependency (`^2.107.0`).
- An existing hosted Supabase free-tier project (already provisioned) for the post-merge cloud push.
- Supabase service-role key available in `.env` for `seed-auth.ts` to call the Admin API.

## Files affected

**Created:**
- `supabase/migrations/<timestamp>_initial_schema.sql` — enums, 6 tables, FKs, RLS + 24 policies.
- `supabase/scripts/seed-auth.ts` — auth user creation via Admin API (with dry-run mode).
- `supabase/CLOUD.md` — cloud link / push runbook and incremental workflow.
- Backend pytest tests — schema-verification and RLS-behavior suites (paths per `services/api/tests/`).
- Vitest test for `seed-auth.ts` dry-run path.

**Modified:**
- `supabase/seed.sql` — replace placeholder with 1 campaign + 2 sessions.
- `package.json` (root) — add `supabase:reset` and `supabase:seed-auth` scripts.
- `AGENTS.md` — "Next.js 15" → "Next.js 16".

**Unchanged but relied upon:**
- `supabase/config.toml` — already runs `seed.sql` on reset, auth enabled, Postgres 17.
- `apps/web/lib/supabase/*` and `apps/web/proxy.ts` — client wiring already in place.
- `services/api/app/core/config.py` and `.env.example` — all Supabase vars already declared.
