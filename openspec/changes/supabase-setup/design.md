# Design: supabase-setup

> Phase: design (the HOW at architectural level). Consumes the `sdd/supabase-setup/proposal` artifact.
> All closed decisions from the proposal are honored and not re-opened here.

## Architecture overview

This change turns the existing (but empty) Supabase local-dev skeleton into an operable
database. The pieces and their data flow:

```
supabase/migrations/<timestamp>_initial_schema.sql
        │  (applied by Supabase CLI)
        ▼
   pnpm supabase db reset
        │  1. drops + recreates the local DB (Postgres 17 on Docker, port 54322)
        │  2. runs every migration in order  ──► enums → tables → RLS → policies → GRANTs
        │  3. runs supabase/seed.sql          ──► 1 campaign + 2 sessions (RLS bypassed: runs as postgres)
        ▼
   pnpm supabase:seed-auth  (separate step, AFTER reset)
        │  calls supabase.auth.admin.createUser({ id: FIXED_UUID, ... }) via the Admin API
        ▼
   Local stack ready: campaign rows owned by the seeded auth user
        │
        ▼
   Cloud path (manual, after merge — documented in supabase/CLOUD.md):
        supabase link --project-ref <ref>  →  supabase db push
```

Three logical layers:

1. **Schema layer** — one migration file is the single source of truth for structure
   (enums, tables, FKs, RLS, policies, GRANTs). The same file drives both the local DB
   (`db reset`) and the hosted DB (`db push`), guaranteeing parity.
2. **Seed layer** — split by responsibility. SQL (`seed.sql`) handles ordinary rows;
   a TypeScript Admin-API script (`seed-auth.ts`) handles the auth user, because an
   authenticatable Supabase user needs `auth.users` + `auth.identities` + a real password
   hash that a plain SQL `INSERT` cannot produce.
3. **Operations layer** — root `package.json` scripts (`supabase:reset`, `supabase:seed-auth`)
   give a one-command developer experience; `CLOUD.md` documents the hosted push runbook.

### Headline design decision: `campaigns.user_id` has NO foreign key to `auth.users`

`campaigns.user_id` is `uuid not null` with **no** `REFERENCES auth.users(id)` constraint.
This is deliberate and load-bearing:

- The closed workflow runs `supabase:reset` (which executes `seed.sql`) **first**, and
  `seed-auth.ts` (which creates the auth user) **second**. At `seed.sql` time, `auth.users`
  is empty. An FK to `auth.users` would make the campaign INSERT fail with a foreign-key
  violation, breaking the success criterion "`pnpm supabase:reset` completes with no errors."
- `docs/07-data-security-and-rls.md` specifies only `user_id uuid not null` — no FK — which
  is consistent with this ordering.
- Ownership is enforced by RLS (`user_id = auth.uid()`), not by a referential constraint.

A developer's instinct will be to "helpfully" add `references auth.users(id)`. Do not.
The seed ordering depends on its absence.

## Migration file design

File: `supabase/migrations/<timestamp>_initial_schema.sql` (timestamp generated at creation,
format `YYYYMMDDHHMMSS`). All statements below live in this one file, in this order.

Postgres 17 provides `gen_random_uuid()` in core — no `pgcrypto`/`uuid-ossp` extension needed.

### Enum types

Values aligned with `docs/03-domain-model.md` (the domain source of truth). `arc_status` and
`memory_status` were corrected from the initial proposal to match domain language.

```sql
-- Enum types
create type content_source as enum ('llm', 'edited', 'manual');
create type arc_status     as enum ('open', 'resolved', 'dropped');
create type priority       as enum ('high', 'medium', 'low');
create type importance     as enum ('high', 'medium', 'low');
create type memory_status  as enum ('active', 'archived');
```

| Enum type | Values | Used by |
|---|---|---|
| `content_source` | `llm`, `edited`, `manual` | `npcs.content_source`, `factions.content_source` |
| `arc_status` | `open`, `resolved`, `dropped` | `arcs.status` |
| `priority` | `high`, `medium`, `low` | `arcs.priority` |
| `importance` | `high`, `medium`, `low` | `memory_facts.importance` |
| `memory_status` | `active`, `archived` | `memory_facts.status` |

### Table definitions

Column names and nullability follow `docs/07-data-security-and-rls.md` exactly. Enum columns
are **nullable with no default** (matching docs/07, which marks none as `not null` and gives
none a default). UUID PKs default to `gen_random_uuid()`; timestamps default to `now()`.
No `updated_at` auto-update trigger is created — the proposal specifies `default now()` only;
auto-touch triggers are explicitly out of scope and the application sets `updated_at` on write.

Parent table first, then children.

```sql
-- campaigns (parent; no FK to auth.users — see headline decision)
create table campaigns (
  id                        uuid primary key default gen_random_uuid(),
  user_id                   uuid not null,
  title                     text not null,
  description               text,
  world_state               text,
  accumulated_summary       text,
  summarized_up_to_session  integer,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

-- sessions (child of campaigns; referenced by memory_facts)
create table sessions (
  id              uuid primary key default gen_random_uuid(),
  campaign_id     uuid not null references campaigns (id) on delete cascade,
  session_number  integer not null,
  summary         text,
  consequences    text,
  generated_content jsonb,
  trace_json      jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- npcs (child of campaigns)
create table npcs (
  id              uuid primary key default gen_random_uuid(),
  campaign_id     uuid not null references campaigns (id) on delete cascade,
  name            text not null,
  description     text,
  current_state   text,
  motivation      text,
  content_source  content_source,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- factions (child of campaigns)
create table factions (
  id              uuid primary key default gen_random_uuid(),
  campaign_id     uuid not null references campaigns (id) on delete cascade,
  name            text not null,
  description     text,
  current_stance  text,
  goals           text,
  content_source  content_source,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- arcs (child of campaigns)
create table arcs (
  id              uuid primary key default gen_random_uuid(),
  campaign_id     uuid not null references campaigns (id) on delete cascade,
  title           text not null,
  description     text,
  status          arc_status,
  priority        priority,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- memory_facts (child of campaigns; also references sessions)
create table memory_facts (
  id                 uuid primary key default gen_random_uuid(),
  campaign_id        uuid not null references campaigns (id) on delete cascade,
  source_session_id  uuid references sessions (id) on delete cascade,
  content            text not null,
  type               text,
  importance         importance,
  status             memory_status,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
```

Notes:
- `campaign_id` is declared `not null` on every child table. docs/07 lists it without an
  explicit nullability, but an orphan campaign-scoped row has no owner and could not be
  reached by any RLS policy, so `not null` is correct.
- `memory_facts.source_session_id` is **nullable** (a fact may not be tied to a session) and
  carries `on delete cascade` per the proposal's closed decision. Surfaced tension (not
  re-opened): deleting a session deletes its accepted memory facts, which is in mild tension
  with the domain rule "MemoryFacts are part of campaign continuity." Kept as decided; the
  cascade only fires on explicit session deletion, which is not part of the MVP flows.

### RLS setup

Enable RLS on all 6 tables, then create 24 policies (SELECT / INSERT / UPDATE / DELETE per
table). `campaigns` uses direct ownership; the 5 child tables use the `EXISTS`-on-parent
pattern from docs/07.

Policy verb conventions:
- `SELECT`, `DELETE` → `using (<predicate>)`
- `INSERT` → `with check (<predicate>)`
- `UPDATE` → `using (<predicate>) with check (<predicate>)`

```sql
-- Enable RLS
alter table campaigns    enable row level security;
alter table sessions     enable row level security;
alter table npcs         enable row level security;
alter table factions     enable row level security;
alter table arcs         enable row level security;
alter table memory_facts enable row level security;

-- campaigns: direct ownership (4 policies)
create policy campaigns_select on campaigns
  for select using (user_id = auth.uid());
create policy campaigns_insert on campaigns
  for insert with check (user_id = auth.uid());
create policy campaigns_update on campaigns
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy campaigns_delete on campaigns
  for delete using (user_id = auth.uid());
```

For each of the 5 child tables the predicate is the same `EXISTS` sub-select against the
parent campaign. Shown for `sessions`; `npcs`, `factions`, `arcs`, `memory_facts` are
identical with the table name swapped (and the policy name prefix swapped).

```sql
-- sessions: ownership via parent campaign (4 policies)
create policy sessions_select on sessions
  for select using (
    exists (select 1 from campaigns
            where campaigns.id = sessions.campaign_id
              and campaigns.user_id = auth.uid())
  );
create policy sessions_insert on sessions
  for insert with check (
    exists (select 1 from campaigns
            where campaigns.id = sessions.campaign_id
              and campaigns.user_id = auth.uid())
  );
create policy sessions_update on sessions
  for update using (
    exists (select 1 from campaigns
            where campaigns.id = sessions.campaign_id
              and campaigns.user_id = auth.uid())
  ) with check (
    exists (select 1 from campaigns
            where campaigns.id = sessions.campaign_id
              and campaigns.user_id = auth.uid())
  );
create policy sessions_delete on sessions
  for delete using (
    exists (select 1 from campaigns
            where campaigns.id = sessions.campaign_id
              and campaigns.user_id = auth.uid())
  );
```

Repeat the identical four-policy block for `npcs`, `factions`, `arcs`, and `memory_facts`,
replacing `sessions` with the table name in both the policy name and the
`<child>.campaign_id` reference. Total: 4 (campaigns) + 5 × 4 = **24 policies**.

### GRANTs (required — not optional)

`supabase/config.toml` leaves `auto_expose_new_tables` unset, which means new `public` tables
are **NOT** auto-exposed to the Data API roles (`anon`, `authenticated`, `service_role`).
Without explicit GRANTs, both PostgREST requests and the `SET ROLE authenticated` RLS tests
would fail with `permission denied for table ...` instead of returning RLS-filtered results.

```sql
-- Schema + table privileges
grant usage on schema public to anon, authenticated, service_role;

-- Authenticated users operate on all tables; RLS scopes them to their own rows.
grant select, insert, update, delete on all tables in schema public to authenticated;

-- service_role is used by trusted backend code; it also bypasses RLS in Supabase.
grant all on all tables in schema public to service_role;

-- NOTE: anon is intentionally granted NO table privileges. No campaign data is public.
```

Access model chosen:
- **`authenticated`** → table DML granted; RLS narrows visibility to owned rows.
- **`anon`** → no table privileges. Consequence: an unauthenticated request gets
  `permission denied`, not an empty result set. The RLS behavior test for the unauthenticated
  case must assert on this actual behavior (see Test design).
- **`service_role`** → full access, bypasses RLS (trusted server-side only).

No sequence GRANTs are needed: all PKs are UUIDs (`gen_random_uuid()`), so there are no
`SERIAL`/identity sequences.

### Migration ordering rationale

1. **Enum types first** — table columns reference them, so the types must exist before the
   tables that use them.
2. **Tables next, parent before children** — `campaigns` is created before `sessions`, `npcs`,
   `factions`, `arcs`, `memory_facts` because their FKs reference `campaigns(id)`. `sessions`
   is created before `memory_facts` because `memory_facts.source_session_id` references
   `sessions(id)`.
3. **`ENABLE ROW LEVEL SECURITY`** — must come after the tables exist and before policies are
   attached to them.
4. **Policies** — reference the tables and `auth.uid()`; created after RLS is enabled.
5. **GRANTs last** — `grant ... on all tables in schema public` resolves against the tables
   created above, so it runs after they all exist.

## Seed design

### seed.sql

Runs automatically during `db reset` as the `postgres` superuser, which **bypasses RLS**, so
the inserts succeed even though policies are active. Uses a single fixed `user_id` constant
that MUST match the UUID pinned in `seed-auth.ts` (Risk: UUID drift — mitigated by documenting
one canonical value here).

Fixed seed user UUID: `00000000-0000-0000-0000-000000000001`.

```sql
-- supabase/seed.sql
-- Seeds 1 campaign + 2 sessions owned by the fixed seed user.
-- The matching auth user is created separately by supabase/scripts/seed-auth.ts
-- (run AFTER `supabase db reset`). user_id below MUST equal FIXED_UUID in that script.

insert into campaigns (id, user_id, title, description, world_state)
values (
  '10000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  'The Sunless Reaches',
  'A starter campaign seeded for local development.',
  'The party has just arrived at the frontier town of Ashford.'
);

insert into sessions (id, campaign_id, session_number, summary, consequences)
values
  (
    '20000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    1,
    'The party met in Ashford and accepted the mine investigation.',
    'The mayor now trusts the party; the mine remains unexplored.'
  ),
  (
    '20000000-0000-0000-0000-000000000002',
    '10000000-0000-0000-0000-000000000001',
    2,
    'The party descended into the upper mine and fought goblins.',
    'A goblin scout escaped and will warn the deeper warren.'
  );
```

Fixed UUIDs for the campaign and sessions make the seed idempotent-friendly and let tests
assert on known IDs.

### seed-auth.ts

File: `supabase/scripts/seed-auth.ts`. Runner: `tsx` (add `tsx` to root `devDependencies`).
Creates the auth user via the Admin API with the pinned UUID so it matches `seed.sql`'s
`user_id`. Reads credentials from the environment and fails loudly if absent. Supports
`--dry-run` for testability (prints the intended call, makes no network request).

```ts
// supabase/scripts/seed-auth.ts
import { createClient } from "@supabase/supabase-js";

const FIXED_UUID = "00000000-0000-0000-0000-000000000001";
const SEED_EMAIL = "dm@lazylands.test";

interface SeedAuthOptions {
  dryRun: boolean;
}

export function parseArgs(argv: string[]): SeedAuthOptions {
  return { dryRun: argv.includes("--dry-run") };
}

// Exported for unit testing; accepts an injectable client factory.
export async function seedAuthUser(
  options: SeedAuthOptions,
  deps: {
    url: string | undefined;
    serviceRoleKey: string | undefined;
    seedPassword: string | undefined;
    createClientFn?: typeof createClient;
    log?: (msg: string) => void;
  },
): Promise<void> {
  const log = deps.log ?? console.log;

  if (options.dryRun) {
    log(
      `[dry-run] would create auth user id=${FIXED_UUID} email=${SEED_EMAIL} email_confirm=true`,
    );
    return;
  }

  // Real run requires local service-role credentials and an explicit seed password — fail loudly if missing.
  if (!deps.url || !deps.serviceRoleKey || !deps.seedPassword) {
    throw new Error(
      "seed-auth: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and SUPABASE_SEED_PASSWORD must be set",
    );
  }

  const create = deps.createClientFn ?? createClient;
  const supabase = create(deps.url, deps.serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { error } = await supabase.auth.admin.createUser({
    id: FIXED_UUID,
    email: SEED_EMAIL,
    password: deps.seedPassword,
    email_confirm: true,
  });

  if (error) {
    throw new Error(`seed-auth: createUser failed: ${error.message}`);
  }

  log(`seed-auth: created auth user ${SEED_EMAIL} (${FIXED_UUID})`);
}

// CLI entry point.
async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  await seedAuthUser(options, {
    url: process.env.SUPABASE_URL,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  });
}

// Only run main() when executed directly, so importing for tests has no side effects.
main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
```

Design notes:
- `seedAuthUser` is exported and takes an injectable `createClientFn` + `log` so Vitest can
  assert the call shape without a live stack and without real network I/O.
- `email_confirm: true` so the seeded user can log in immediately (local `enable_confirmations`
  is already `false`, but this is explicit and cloud-safe).
- Pinning `id: FIXED_UUID` is what links the auth user to the seeded campaign rows.
- Exit code is `1` on any thrown error (missing creds, API failure).

## Root scripts design

Add to the root `package.json` `"scripts"` section:

```json
{
  "scripts": {
    "supabase:reset": "supabase db reset",
    "supabase:seed-auth": "tsx supabase/scripts/seed-auth.ts"
  }
}
```

Also add `tsx` to root `devDependencies` (the runner for the TypeScript seed script).
`supabase:reset` wraps `supabase db reset` (which applies migrations + runs `seed.sql`).
`supabase:seed-auth` is run **after** `supabase:reset`.

## CLOUD.md design

File: `supabase/CLOUD.md`. Sections and key commands it must contain:

1. **Prerequisites**
   - Docker Desktop running (required for the local CLI stack).
   - Supabase CLI available via `pnpm supabase` (already a root devDependency).
   - The hosted project reference (`<project-ref>`) — where to find it (Supabase dashboard →
     Project Settings → General).
   - `SUPABASE_SERVICE_ROLE_KEY` available locally for any Admin-API operations.

2. **One-time link** (run once per machine after the project exists):
   ```bash
   supabase link --project-ref <project-ref>
   ```

3. **Initial push** (run once, after this change merges to main):
   ```bash
   supabase db push   # applies the initial_schema migration to the hosted DB
   ```

4. **Ongoing push workflow** (every future migration):
   - Create the migration locally, verify with `pnpm supabase:reset` + tests.
   - Merge to main.
   - Run `supabase db push` to apply new migrations to the hosted DB incrementally.
   - Only `db push` mutates the hosted DB; never hand-edit hosted schema.

5. **Rollback procedure**
   - Hosted project holds no real campaign data yet, so a destructive rollback is safe.
   - Write a reverting migration in order: `drop policy ...` → `drop table ... cascade` →
     `drop type ...`, then `supabase db push` the revert.
   - If the change is reverted before any push, there is nothing to roll back.

6. **Auth-user note** — the cloud demo user is created via the Admin API / dashboard, not by
   `seed.sql`; the local `seed-auth.ts` pattern (pinned UUID) can be reused for parity.

## Test design

These tests follow Strict TDD: the schema/RLS tests are written first and fail (no tables/
policies yet), then the migration makes them pass.

### pytest schema verification tests

File: `services/api/tests/test_schema.py`
Connection: `psycopg` (psycopg3) — add as a backend dev dependency. Connect with
`postgresql://postgres:postgres@localhost:54322/postgres` (local Supabase DB port from
`config.toml`).

These are **integration** tests requiring the live local stack. The fixture must probe the
connection and `pytest.skip` the whole module when the stack is down, so a plain
`uv run pytest` (and CI without Supabase) does not go red. `conftest.py` already sets fake
Supabase env for unit tests; these tests connect directly to the real local Postgres instead.

```python
# services/api/tests/test_schema.py
import psycopg
import pytest

LOCAL_DB_DSN = "postgresql://postgres:postgres@localhost:54322/postgres"

EXPECTED_TABLES = {
    "campaigns", "sessions", "npcs", "factions", "arcs", "memory_facts",
}
EXPECTED_ENUMS = {
    "content_source": {"llm", "edited", "manual"},
    "arc_status": {"open", "resolved", "dropped"},
    "priority": {"high", "medium", "low"},
    "importance": {"high", "medium", "low"},
    "memory_status": {"active", "archived"},
}


@pytest.fixture(scope="module")
def db_conn():
    try:
        conn = psycopg.connect(LOCAL_DB_DSN, connect_timeout=2)
    except psycopg.OperationalError:
        pytest.skip("Local Supabase stack not running on :54322")
    yield conn
    conn.close()


def test_all_tables_exist(db_conn):
    with db_conn.cursor() as cur:
        cur.execute(
            "select table_name from information_schema.tables "
            "where table_schema = 'public'"
        )
        present = {row[0] for row in cur.fetchall()}
    assert EXPECTED_TABLES <= present


@pytest.mark.parametrize("enum_name,values", EXPECTED_ENUMS.items())
def test_enum_has_expected_values(db_conn, enum_name, values):
    with db_conn.cursor() as cur:
        cur.execute(
            "select e.enumlabel from pg_type t "
            "join pg_enum e on e.enumtypid = t.oid "
            "where t.typname = %s",
            (enum_name,),
        )
        labels = {row[0] for row in cur.fetchall()}
    assert labels == values


def test_campaigns_columns(db_conn):
    with db_conn.cursor() as cur:
        cur.execute(
            "select column_name, data_type from information_schema.columns "
            "where table_schema = 'public' and table_name = 'campaigns'"
        )
        cols = dict(cur.fetchall())
    assert cols["id"] == "uuid"
    assert cols["user_id"] == "uuid"
    assert cols["title"] == "text"
    assert cols["summarized_up_to_session"] == "integer"
    assert cols["created_at"] == "timestamp with time zone"
    # ...repeat per table with its expected columns + types...


def test_foreign_keys_exist(db_conn):
    with db_conn.cursor() as cur:
        cur.execute(
            "select tc.table_name, ccu.table_name as ref "
            "from information_schema.table_constraints tc "
            "join information_schema.constraint_column_usage ccu "
            "  on tc.constraint_name = ccu.constraint_name "
            "where tc.constraint_type = 'FOREIGN KEY' "
            "  and tc.table_schema = 'public'"
        )
        fks = set(cur.fetchall())
    assert ("sessions", "campaigns") in fks
    assert ("npcs", "campaigns") in fks
    assert ("factions", "campaigns") in fks
    assert ("arcs", "campaigns") in fks
    assert ("memory_facts", "campaigns") in fks
    assert ("memory_facts", "sessions") in fks


def test_rls_enabled_on_all_tables(db_conn):
    with db_conn.cursor() as cur:
        cur.execute(
            "select relname from pg_class "
            "where relrowsecurity = true and relnamespace = 'public'::regnamespace"
        )
        secured = {row[0] for row in cur.fetchall()}
    assert EXPECTED_TABLES <= secured


def test_twenty_four_policies_exist(db_conn):
    with db_conn.cursor() as cur:
        cur.execute(
            "select count(*) from pg_policies where schemaname = 'public'"
        )
        count = cur.fetchone()[0]
    assert count == 24
```

The FK assertion via `constraint_column_usage` also implicitly proves the no-FK-to-`auth.users`
decision (no `auth` table appears as a referenced table for `campaigns`).

### pytest RLS behavior tests

File: `services/api/tests/test_rls.py`
Approach: connect as `postgres`, but inside each test open a transaction and switch to a
non-privileged Supabase role with `set local role authenticated` (or `anon`) plus
`set local request.jwt.claims = '{"sub":"<uuid>"}'`. The `postgres` superuser bypasses RLS,
so tests MUST switch role; `authenticated` is a normal role and RLS applies. `auth.uid()`
reads `request.jwt.claims ->> 'sub'`. Everything is wrapped in a transaction and rolled back
so tests do not mutate seed data.

Two simulated users:
- `USER_A` = `00000000-0000-0000-0000-000000000001` (the seeded owner).
- `USER_B` = `00000000-0000-0000-0000-000000000002` (a different user, owns nothing).

```python
# services/api/tests/test_rls.py
import contextlib
import psycopg
import pytest

LOCAL_DB_DSN = "postgresql://postgres:postgres@localhost:54322/postgres"
USER_A = "00000000-0000-0000-0000-000000000001"
USER_B = "00000000-0000-0000-0000-000000000002"
SEEDED_CAMPAIGN = "10000000-0000-0000-0000-000000000001"


@pytest.fixture(scope="module")
def db_conn():
    try:
        conn = psycopg.connect(LOCAL_DB_DSN, connect_timeout=2)
    except psycopg.OperationalError:
        pytest.skip("Local Supabase stack not running on :54322")
    yield conn
    conn.close()


@contextlib.contextmanager
def as_user(conn, uuid_or_none):
    """Run a block as the `authenticated` role (or `anon` if uuid is None),
    impersonating auth.uid() via JWT claims, then roll back."""
    with conn.transaction(force_rollback=True):
        with conn.cursor() as cur:
            if uuid_or_none is None:
                cur.execute("set local role anon")
            else:
                cur.execute("set local role authenticated")
                cur.execute(
                    "select set_config('request.jwt.claims', %s, true)",
                    ('{"sub":"%s"}' % uuid_or_none,),
                )
            yield cur


def test_user_a_reads_own_campaign(db_conn):
    with as_user(db_conn, USER_A) as cur:
        cur.execute("select id from campaigns where id = %s", (SEEDED_CAMPAIGN,))
        assert cur.fetchone() is not None


def test_user_b_cannot_read_user_a_campaign(db_conn):
    with as_user(db_conn, USER_B) as cur:
        cur.execute("select id from campaigns")
        assert cur.fetchall() == []  # RLS filters to zero rows


def test_user_b_cannot_insert_session_into_user_a_campaign(db_conn):
    with as_user(db_conn, USER_B) as cur:
        with pytest.raises(psycopg.errors.InsufficientPrivilege):
            cur.execute(
                "insert into sessions (campaign_id, session_number) values (%s, 99)",
                (SEEDED_CAMPAIGN,),
            )


def test_anon_cannot_select_campaigns(db_conn):
    # anon has NO table grant, so this is permission-denied (not an empty set).
    with as_user(db_conn, None) as cur:
        with pytest.raises(psycopg.errors.InsufficientPrivilege):
            cur.execute("select id from campaigns")
```

Key fixture facts:
- `force_rollback=True` guarantees no test mutates seed data.
- `set local` keeps role/claims changes scoped to the transaction.
- The INSERT-violation test expects `InsufficientPrivilege` because an RLS `with check`
  failure raises `new row violates row-level security policy` (mapped to
  `InsufficientPrivilege` in psycopg's error hierarchy).
- The anon test asserts **permission denied**, matching the chosen access model (anon has no
  table GRANT). If the access model is later changed to grant anon SELECT, this assertion must
  change to "empty result set."

### Vitest test for seed-auth.ts

File: `supabase/scripts/seed-auth.test.ts`. Tests the exported `seedAuthUser` / `parseArgs`
without a live stack by injecting a mocked client factory and log collector.

```ts
// supabase/scripts/seed-auth.test.ts
import { describe, it, expect, vi } from "vitest";
import { seedAuthUser, parseArgs } from "./seed-auth";

describe("seed-auth", () => {
  it("dry-run makes no API call and prints intended action", async () => {
    const createClientFn = vi.fn();
    const logs: string[] = [];
    await seedAuthUser(
      { dryRun: true },
      { url: undefined, serviceRoleKey: undefined,
        createClientFn: createClientFn as never, log: (m) => logs.push(m) },
    );
    expect(createClientFn).not.toHaveBeenCalled();
    expect(logs.join("\n")).toContain("[dry-run]");
    expect(logs.join("\n")).toContain("00000000-0000-0000-0000-000000000001");
  });

  it("throws a clear error when service-role credentials are missing", async () => {
    await expect(
      seedAuthUser(
        { dryRun: false },
        { url: undefined, serviceRoleKey: undefined },
      ),
    ).rejects.toThrow(/SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY/);
  });

  it("calls createUser with the pinned UUID and confirmed email", async () => {
    const createUser = vi.fn().mockResolvedValue({ data: {}, error: null });
    const createClientFn = vi.fn().mockReturnValue({
      auth: { admin: { createUser } },
    });
    await seedAuthUser(
      { dryRun: false },
      {
        url: "http://localhost:54321",
        serviceRoleKey: "service-role-key",
        createClientFn: createClientFn as never,
        log: () => {},
      },
    );
    expect(createUser).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "00000000-0000-0000-0000-000000000001",
        email_confirm: true,
      }),
    );
  });

  it("parseArgs detects --dry-run", () => {
    expect(parseArgs(["--dry-run"]).dryRun).toBe(true);
    expect(parseArgs([]).dryRun).toBe(false);
  });
});
```

Vitest config note: `supabase/scripts/` is outside `apps/web`. The test must be included by a
Vitest project that covers this path — either extend an existing root/workspace Vitest config
to include `supabase/**/*.test.ts`, or add a minimal `vitest.config.ts` scoped to `supabase/`.
This wiring is part of the implementation and must be resolved before the Vitest test can run.

## Implementation order

Strict TDD — tests first, then make them green:

1. **Write pytest schema verification tests** (`services/api/tests/test_schema.py`) — fail
   (no tables/enums/policies yet), or skip if the local stack is down. Add the `psycopg` dev
   dependency.
2. **Write pytest RLS behavior tests** (`services/api/tests/test_rls.py`) — fail/skip for the
   same reason.
3. **Write the Vitest seed-auth tests** (`supabase/scripts/seed-auth.test.ts`) and wire the
   Vitest config to include `supabase/`. The import fails until the script exists.
4. **Write the migration** (`supabase/migrations/<timestamp>_initial_schema.sql`) — enums →
   tables (parent first) → enable RLS → 24 policies → GRANTs. Schema + RLS tests now pass
   when the stack is up.
5. **Write `supabase/seed.sql`** — 1 campaign + 2 sessions with the fixed UUIDs. Verified by
   `db reset` running it without error; the RLS "user A reads own campaign" test depends on it.
6. **Write `seed-auth.ts`** — Vitest tests go green. Add `tsx` to root devDependencies and the
   two root `package.json` scripts.
7. **Write `supabase/CLOUD.md`** and apply the `AGENTS.md` "Next.js 15" → "Next.js 16" fix.
8. **Run the full local acceptance gate**: `pnpm supabase start` → `pnpm supabase:reset` →
   `pnpm supabase:seed-auth` → `uv run pytest` (schema + RLS green) → `pnpm test` (Vitest
   green). Manually verify the seeded user can log in once.

## Design decisions (ADR-style)

| # | Decision | Rationale | Rejected alternative |
|---|---|---|---|
| D1 | `campaigns.user_id` has **no** FK to `auth.users` | Seed ordering: `seed.sql` runs before `seed-auth.ts`, so `auth.users` is empty at insert time; an FK would break `db reset`. docs/07 specifies no FK. Ownership is enforced by RLS. | `references auth.users(id)` — fails the seed; rejected. |
| D2 | Explicit GRANTs to `authenticated` (+ `service_role`), none to `anon` | `auto_expose_new_tables` is unset → no auto-exposure; without GRANTs PostgREST and RLS tests hit "permission denied." No campaign data is public, so anon gets nothing. | Grant anon SELECT and rely on RLS — broader surface, not needed; rejected. |
| D3 | Single initial migration file | Initial schema is one coherent reviewable unit (proposal Decision 1). | Per-table migrations — review overhead without value pre-release; rejected. |
| D4 | Enum columns nullable, no defaults | Matches docs/07 exactly (none marked `not null` or defaulted); application sets values. | Enum defaults / NOT NULL — adds unrequested behavior; deferred. |
| D5 | No `updated_at` auto-update trigger | Proposal specifies `default now()` only; app sets `updated_at` on write. | DB trigger — out of scope; deferred. |
| D6 | `auth` user via Admin-API TS script, pinned UUID | Plain SQL `INSERT` cannot make an authenticatable user (needs identities + hash). Pinned UUID links to seeded rows. | SQL insert into `auth.users` — produces a non-loginable user; rejected (proposal Decision 7). |
| D7 | Schema/RLS tests skip when stack is down | They are integration tests on :54322; CI/plain `pytest` must not go red. | Always-run — false failures; rejected. |
| D8 | `memory_facts.source_session_id` keeps `on delete cascade` | Proposal closed decision. | `set null` — not re-opened here; tension noted in Risks. |

## Risks

| # | Risk | Severity | Mitigation / routing |
|---|---|---|---|
| R1 | ~~Enum value divergence~~ — **resolved.** Enum values aligned with `docs/03-domain-model.md`: `arc_status: open,resolved,dropped`; `memory_status: active,archived`. All four artifacts (proposal, design, explore, spec) updated accordingly. | Resolved | No further action needed. |
| R2 | Seed `user_id` UUID drift between `seed.sql` and `seed-auth.ts` orphans campaign rows. | Medium | One canonical constant `00000000-0000-0000-0000-000000000001` documented in both; RLS "user A reads own campaign" test catches drift. |
| R3 | Admin-API auth seeding misconfigured (wrong URL/service-role key) → user cannot log in. | Medium | Script fails loudly when creds missing; dry-run unit test covers call shape; manual login check in step 8. |
| R4 | Vitest does not pick up `supabase/scripts/*.test.ts` (outside `apps/web`). | Medium | Implementation must extend/add a Vitest config covering `supabase/`; called out in Test design + step 3. |
| R5 | `tsx` runner not present for `supabase:seed-auth`. | Low | Add `tsx` to root devDependencies (step 6). |
| R6 | `memory_facts` cascade-deletes on session deletion, tensioning with "facts are continuity." | Low | Proposal-closed; surfaced not re-opened. Session deletion is not an MVP flow. |
| R7 | Docker Desktop not running blocks the local stack and all integration tests. | Low | Documented prerequisite; integration tests skip cleanly when the stack is down. |
