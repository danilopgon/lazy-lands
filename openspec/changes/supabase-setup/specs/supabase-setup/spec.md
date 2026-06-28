# Spec: supabase-setup

## Overview

This spec covers the initial Supabase database layer for Lazy Lands: five PostgreSQL enum
types, six campaign-data tables with UUID primary keys, foreign-key constraints with CASCADE,
Row Level Security on all tables with 24 ownership-based policies, role-level GRANT
assignments, a minimal reproducible seed (one campaign, two sessions, one authenticatable auth
user), and the developer tooling (root scripts, `tsx` devDependency, cloud runbook, docs fix)
needed to make `pnpm supabase:reset` produce a fully operable local database and unblock
Block 4 Auth work.

> **Enum authority note**: The proposal's "Schema strategy" table carries stale enum values for
> `arc_status` (`active`, `resolved`, `abandoned`) and `memory_status` (`active`, `invalidated`).
> The design artifact (R1) also carries those stale values and explicitly delegates final
> reconciliation to this spec phase. The authoritative values below come from
> `docs/03-domain-model.md` (Arc lines 104-106; MemoryFact lines 172-173), which is the
> canonical product source of truth. The `sdd-tasks` and `sdd-apply` phases MUST use this spec's
> values, not the proposal's or design's stale table.

---

## Functional requirements

### FR-1: Initial schema migration

The file `supabase/migrations/<timestamp>_initial_schema.sql` MUST be committed to the repo
and MUST define the complete initial schema in this order: enum types → tables (parent before
children) → `ENABLE ROW LEVEL SECURITY` → policies → GRANTs.

**FR-1.1 — Enum types.** The migration MUST create exactly five PostgreSQL enum types via
`CREATE TYPE ... AS ENUM`:

| Enum type | Values | Used by |
|---|---|---|
| `content_source` | `llm`, `edited`, `manual` | `npcs.content_source`, `factions.content_source` |
| `arc_status` | `open`, `resolved`, `dropped` | `arcs.status` |
| `priority` | `high`, `medium`, `low` | `arcs.priority` |
| `importance` | `high`, `medium`, `low` | `memory_facts.importance` |
| `memory_status` | `active`, `archived` | `memory_facts.status` |

**FR-1.2 — Tables.** The migration MUST create exactly six tables:

| Table | `campaign_id` FK | Additional FKs |
|---|---|---|
| `campaigns` | — (root entity) | `user_id uuid NOT NULL` — NO FK to `auth.users` (see note below) |
| `sessions` | `NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE` | — |
| `npcs` | `NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE` | — |
| `factions` | `NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE` | — |
| `arcs` | `NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE` | — |
| `memory_facts` | `NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE` | `source_session_id uuid REFERENCES sessions(id) ON DELETE CASCADE` (nullable) |

> **No FK from `campaigns.user_id` to `auth.users`**: the seed workflow inserts `seed.sql` rows
> (including `campaigns`) during `db reset` — before `seed-auth.ts` creates the auth user.
> A referential constraint would make the campaign INSERT fail. Ownership is enforced by RLS, not
> by an FK constraint.

**FR-1.3 — Column completeness.** Every table MUST contain exactly the columns defined in
`docs/07-data-security-and-rls.md`, with the following universal rules:

- `id uuid PRIMARY KEY DEFAULT gen_random_uuid()` on every table.
- `created_at timestamptz NOT NULL DEFAULT now()` and `updated_at timestamptz NOT NULL DEFAULT now()` on every table.
- `NOT NULL` on `user_id` (`campaigns`), `title` (`campaigns`), `name` (`npcs`, `factions`), `title` (`arcs`), `session_number` (`sessions`), `content` (`memory_facts`).
- Enum-typed columns (`content_source`, `status`, `priority`, `importance`) are nullable with no default.
- No `updated_at` trigger — the application layer sets the value on mutation.

#### Scenario: Migration applies cleanly on a fresh local stack

- GIVEN a running local Supabase instance with no prior migrations
- WHEN `pnpm supabase:reset` is executed
- THEN the migration applies without errors and all 6 tables are queryable

#### Scenario: Child table cascade-deletes on campaign removal

- GIVEN a campaign with associated sessions, npcs, factions, arcs, and memory_facts
- WHEN the campaign row is deleted
- THEN all child rows are removed via ON DELETE CASCADE

---

### FR-2: Row Level Security

**FR-2.1** The migration MUST issue `ALTER TABLE <table> ENABLE ROW LEVEL SECURITY` for all
six tables.

**FR-2.2** The migration MUST create exactly 24 RLS policies (SELECT, INSERT, UPDATE, DELETE
per table):

| Policy verb | Clause type | Campaigns predicate | Child-table predicate |
|---|---|---|---|
| SELECT | `USING` | `user_id = auth.uid()` | EXISTS sub-select |
| INSERT | `WITH CHECK` | `user_id = auth.uid()` | EXISTS sub-select |
| UPDATE | `USING` + `WITH CHECK` | `user_id = auth.uid()` | EXISTS sub-select |
| DELETE | `USING` | `user_id = auth.uid()` | EXISTS sub-select |

Child-table EXISTS predicate:

```sql
exists (
  select 1
  from campaigns
  where campaigns.id = <child_table>.campaign_id
    and campaigns.user_id = auth.uid()
)
```

#### Scenario: Owner reads own campaign

- GIVEN a JWT whose `sub` claim matches `campaigns.user_id`
- WHEN `SELECT * FROM campaigns` is executed as `authenticated`
- THEN only the owned campaign row is returned

#### Scenario: Non-owner cannot read another user's campaign

- GIVEN a JWT whose `sub` claim does not match any campaign's `user_id`
- WHEN `SELECT * FROM campaigns` is executed as `authenticated`
- THEN zero rows are returned (not an error — RLS filters silently)

#### Scenario: Non-owner cannot insert a session into another user's campaign

- GIVEN a JWT for User B and a campaign owned by User A
- WHEN `INSERT INTO sessions (campaign_id, ...)` is attempted with User A's campaign id
- THEN the INSERT is rejected with a policy violation error

---

### FR-3: Database roles and grants

**FR-3.1** The migration MUST include `GRANT USAGE ON SCHEMA public` to `anon`,
`authenticated`, and `service_role`.

**FR-3.2** GRANT assignments for table access:

| Role | Table privileges |
|---|---|
| `authenticated` | `SELECT, INSERT, UPDATE, DELETE` on all 6 tables (RLS scopes to owned rows) |
| `service_role` | `ALL` on all 6 tables (bypasses RLS) |
| `anon` | No table privileges |

**FR-3.3** The `anon` role MUST receive no table-level grants. Unauthenticated access to any
table MUST return `permission denied`, not an empty result set.

#### Scenario: Unauthenticated access is denied

- GIVEN a request executing as the `anon` role
- WHEN `SELECT * FROM campaigns` is attempted
- THEN the query raises `permission denied for table campaigns` (not an empty result)

---

### FR-4: Minimal seed

**FR-4.1 — `supabase/seed.sql`.** MUST insert exactly 1 campaign and 2 sessions owned by the
fixed UUID `00000000-0000-0000-0000-000000000001`. This file is executed by `supabase db reset`
as the `postgres` superuser (bypasses RLS). It MUST reference the fixed UUID as a literal
constant for traceability.

**FR-4.2 — `supabase/scripts/seed-auth.ts`.** MUST:
- Call `supabase.auth.admin.createUser` via the Admin API.
- Pin the created user's `id` to `00000000-0000-0000-0000-000000000001`.
- Set `email_confirm: true` so the user can log in immediately.
- Export a testable `seedAuthUser(options, deps)` function with injectable client and logger
  (enables unit testing without a live stack).
- Accept `--dry-run` flag: log the intended `createUser` call parameters, make no API call,
  exit 0.
- Fail with non-zero exit code and a clear error message when `SUPABASE_URL` or
  `SUPABASE_SERVICE_ROLE_KEY` are absent and `--dry-run` is not active.
- Guard `main()` so importing the module in tests has no side effects.

#### Scenario: Seed completes on a reset stack

- GIVEN `pnpm supabase:reset` has completed successfully
- WHEN `pnpm supabase:seed-auth` is executed with valid credentials in `.env`
- THEN 1 auth user exists with id `00000000-0000-0000-0000-000000000001` and is able to log in

#### Scenario: Dry-run makes no API call

- GIVEN any environment (credentials present or absent)
- WHEN `seed-auth.ts` is invoked with `--dry-run`
- THEN the intended `createUser` parameters are logged to stdout; no API call is made; exit 0

#### Scenario: Missing credentials cause loud failure

- GIVEN `SUPABASE_SERVICE_ROLE_KEY` is absent and `--dry-run` is not active
- WHEN `seed-auth.ts` is invoked
- THEN the process exits with code 1 and a descriptive error message

---

### FR-5: Developer tooling

**FR-5.1 — Root `package.json` scripts.** MUST add:
- `"supabase:reset": "supabase db reset"`
- `"supabase:seed-auth": "tsx supabase/scripts/seed-auth.ts"`

**FR-5.2 — Root devDependencies.** MUST add `tsx` (required to execute `seed-auth.ts` via
the `supabase:seed-auth` script).

**FR-5.3 — `supabase/CLOUD.md`.** MUST document:
- Docker Desktop as a prerequisite for the local Supabase stack.
- One-time `supabase link --project-ref <ref>` command.
- Initial `supabase db push` to apply the migration to the hosted project.
- Incremental migration push workflow (`supabase db push` after each merged migration).
- Rollback path for the hosted project (drop policies → drop tables CASCADE → drop types,
  then push) — safe because no real campaign data exists yet at this stage.

**FR-5.4 — `AGENTS.md` correction.** The string "Next.js 15" MUST be changed to "Next.js 16"
to match the version declared in `apps/web/package.json` (`next@16.2.9`).

#### Scenario: Vitest config covers supabase/scripts

- GIVEN `supabase/scripts/seed-auth.test.ts` exists
- WHEN `pnpm test` is executed from the monorepo root
- THEN Vitest discovers and runs the seed-auth tests

---

## Non-functional requirements

### NFR-1: Local dev experience

The complete local setup sequence MUST complete without errors on a machine with Docker Desktop
running and a valid `.env` populated from `.env.example`:

```bash
pnpm supabase start
pnpm supabase:reset      # migrations + seed.sql
pnpm supabase:seed-auth  # auth user creation
```

After these three commands the local database MUST contain:
- All 6 tables with the correct schema.
- 1 campaign and 2 sessions owned by UUID `00000000-0000-0000-0000-000000000001`.
- 1 authenticatable auth user with id `00000000-0000-0000-0000-000000000001`.

### NFR-2: Schema parity (local ↔ cloud)

The single committed migration file MUST drive both the local stack (`supabase db reset`) and
the hosted cloud project (`supabase db push`). No schema differences between environments are
permitted outside of migration state.

### NFR-3: Test coverage (Strict TDD)

All pytest schema-verification and RLS-behavior tests MUST be written and committed before the
migration file exists. Tests MUST be in a failing (or skipping) state until the migration is
applied. Tests MUST skip gracefully when the local Supabase stack is unreachable (integration
tests, not unit tests). The `seed-auth.ts` unit tests MUST run without a live stack using a
mocked Admin client.

---

## Acceptance criteria

1. `supabase/migrations/<timestamp>_initial_schema.sql` exists and is committed. (FR-1)
2. All 5 enum types exist with exact values:
   `content_source` (`llm`, `edited`, `manual`);
   `arc_status` (`open`, `resolved`, `dropped`);
   `priority` (`high`, `medium`, `low`);
   `importance` (`high`, `medium`, `low`);
   `memory_status` (`active`, `archived`). (FR-1.1)
3. All 6 tables exist with every column from `docs/07-data-security-and-rls.md`. (FR-1.2, FR-1.3)
4. `id` defaults to `gen_random_uuid()`; `created_at` and `updated_at` default to `now()` and are NOT NULL on all 6 tables. (FR-1.3)
5. `campaigns.user_id` is `NOT NULL` with no FK constraint to `auth.users`. (FR-1.2)
6. FK constraints with `ON DELETE CASCADE` exist: all 5 child tables → `campaigns(id)`; `memory_facts.source_session_id` → `sessions(id)`. (FR-1.2)
7. `campaign_id` on all child tables is NOT NULL. (FR-1.2)
8. RLS is enabled on all 6 tables (`pg_class.relrowsecurity = true`). (FR-2.1)
9. Exactly 24 RLS policies exist across all 6 tables. (FR-2.2)
10. `authenticated` role has `SELECT, INSERT, UPDATE, DELETE` on all 6 tables. (FR-3.2)
11. `anon` role has no table-level grants; querying any table as `anon` returns `permission denied`, not an empty result. (FR-3.2, FR-3.3)
12. `service_role` has `ALL` privileges on all 6 tables. (FR-3.2)
13. `supabase/seed.sql` inserts 1 campaign and 2 sessions owned by UUID `00000000-0000-0000-0000-000000000001` after `pnpm supabase:reset`. (FR-4.1)
14. `pnpm supabase:reset` completes without errors on a clean local stack. (NFR-1)
15. `pnpm supabase:seed-auth` creates the auth user with pinned UUID; the user can authenticate with the configured credentials. (FR-4.2)
16. `pnpm supabase:seed-auth --dry-run` logs the intended `createUser` call and exits 0 without calling the Admin API. (FR-4.2)
17. `supabase:reset` and `supabase:seed-auth` scripts exist in root `package.json`. (FR-5.1)
18. `tsx` is listed in root `package.json` devDependencies. (FR-5.2)
19. `supabase/CLOUD.md` exists and documents the `link` + `db push` workflow including rollback. (FR-5.3)
20. `AGENTS.md` reads "Next.js 16". (FR-5.4)
21. All pytest schema-verification tests pass when the local stack is running. (NFR-3)
22. All pytest RLS-behavior tests pass: User A cannot SELECT/INSERT/UPDATE/DELETE User B's data; `anon` access returns `permission denied`. (NFR-3)
23. Vitest seed-auth tests pass without a live Supabase stack. (NFR-3)

---

## Out of scope

- Auth UI (login/register forms) — Block 4.
- Next.js protected routes / session guards — Block 4.
- Backend Supabase client adapter (`services/api/app/infrastructure/supabase/`) — Block 4+.
- JWT validation in `services/api/app/core/security.py` — Block 4.
- TypeScript env declaration file (`env.d.ts`) — Block 4 at latest.
- Rich demo seed (full NPC roster, multiple campaigns, factions, arcs, memory facts) — later block.
- CI integration for the Supabase local stack — later block.
- New environment variables — `.env.example` already declares all Supabase vars needed by this change.
- `updated_at` trigger — application layer sets the value on mutation.

---

## Test requirements

### Schema verification tests (pytest)

Location: `services/api/tests/test_schema.py`.
Connection: psycopg3 DSN `postgresql://postgres:postgres@localhost:54322/postgres`.
Module-level fixture MUST probe the connection and call `pytest.skip` if port 54322 is
unreachable (integration guard).

Tests MUST assert:

- All 6 tables exist in `information_schema.tables` (schema: `public`).
- Each table has the expected columns with the correct data types per `docs/07`.
- All 5 enum types exist in `pg_type` with the exact member values in `pg_enum`.
- FK constraints exist on all child `campaign_id` columns with `ON DELETE CASCADE` behavior.
- `memory_facts.source_session_id` FK to `sessions(id)` exists with `ON DELETE CASCADE`.
- `campaigns.user_id` has NO FK constraint to `auth.users`.
- `pg_class.relrowsecurity = true` for all 6 tables.
- Exactly 24 rows in `pg_policies` across the 6 tables (4 per table).

### RLS behavior tests (pytest)

Location: `services/api/tests/test_rls.py`.
Same connection and skip guard as schema tests.

Tests MUST use a transaction-scoped context manager that:
- Opens a transaction with `force_rollback=True` (no persistent state between tests).
- Issues `SET LOCAL ROLE authenticated` and `SELECT set_config('request.jwt.claims', '{"sub":"<uuid>"}', true)` to simulate a specific authenticated user.
- Issues `SET LOCAL ROLE anon` to simulate unauthenticated access.

Constants: `USER_A = '00000000-0000-0000-0000-000000000001'` (the seeded owner);
`USER_B = '00000000-0000-0000-0000-000000000002'` (a non-owner with no data).

Tests MUST assert:

- User A selects own campaign and receives exactly 1 row.
- User B selects campaigns and receives 0 rows (RLS filters silently).
- User B INSERT of a session into User A's campaign raises `InsufficientPrivilege`.
- `anon` role `SELECT` on `campaigns` raises `InsufficientPrivilege` (`permission denied`, not empty set).
- User A can SELECT the 2 seeded sessions belonging to the seeded campaign.
- User B cannot SELECT sessions from User A's campaign (0 rows returned).

### seed-auth unit tests (Vitest)

Location: `supabase/scripts/seed-auth.test.ts`.
Vitest config MUST be extended to cover `supabase/scripts/` (R4 from design artifact).
Tests run without a live Supabase stack via a mocked Admin client injected through `deps`.

Tests MUST cover:

- `--dry-run` path: `createUser` is NOT called; expected parameters (including pinned UUID
  `00000000-0000-0000-0000-000000000001` and `email_confirm: true`) are logged to the injected logger.
- Missing `SUPABASE_URL`: function rejects/throws with a descriptive error; process would exit 1.
- Missing `SUPABASE_SERVICE_ROLE_KEY`: function rejects/throws with a descriptive error; process would exit 1.
- Normal path: `createUser` is called exactly once with `{ id: FIXED_UUID, email, password, email_confirm: true }`.

---

## Definition of done

- [ ] `supabase/migrations/<timestamp>_initial_schema.sql` committed and applies cleanly.
- [ ] All 23 acceptance criteria above are met.
- [ ] `pnpm supabase:reset` followed by `pnpm supabase:seed-auth` completes without errors.
- [ ] pytest schema-verification suite: all assertions pass (or skip when stack is down).
- [ ] pytest RLS-behavior suite: all assertions pass (or skip when stack is down).
- [ ] Vitest seed-auth unit test suite: all tests pass without a live stack.
- [ ] `supabase/CLOUD.md` exists; the documented `link` + `db push` workflow has been manually verified against the hosted project after merge.
- [ ] `AGENTS.md` reads "Next.js 16".
- [ ] PR diff reviewed and approved; no secrets committed.
