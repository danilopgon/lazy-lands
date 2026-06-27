# Exploration: supabase-setup

## Executive Summary

The Lazy Lands monorepo has the Supabase local-dev scaffold already in place (CLI at `^2.107.0`,
`config.toml` initialized, client libraries wired in both frontend and backend), but contains
**zero DB migrations** and a **placeholder seed file**. This change delivers the initial schema
migration for 6 tables with RLS policies and a minimal seed to make the local stack operable
before Block 4 Auth work begins. Cloud project linking is deferred.

---

## 1. Current `supabase/` State

| Path | Status |
|---|---|
| `supabase/config.toml` | Present — fully initialized |
| `supabase/migrations/.gitkeep` | Present — directory tracked, **NO SQL migrations** |
| `supabase/seed.sql` | Present — placeholder only (2 comment lines) |
| `supabase/README.md` | Present — documents env var mapping and CLI workflow |
| `supabase/.gitignore` | Present — ignores `.branches`, `.temp`, dotenv files |

Key `config.toml` settings (verified):
- `project_id = "lazy-lands"` (line 6)
- API on port `54321`, DB on `54322`, Studio on `54323`
- `[db.seed] enabled = true`, `sql_paths = ["./seed.sql"]` (lines 69–71)
- `[auth] enabled = true`, email signup on, anonymous sign-ins off
- `site_url = "http://127.0.0.1:3000"`, Postgres `major_version = 17`

`supabase/seed.sql` (full content):
```sql
-- Seed data for local Supabase development. Populated in Block 1.
-- TODO: add auth.users seed
```

**Conclusion:** Block 0 scaffold is complete as a skeleton. Zero schema work exists.

---

## 2. Env/Config — Frontend (`apps/web`)

### Next.js version
`apps/web/package.json` line 16: `"next": "16.2.9"`.
> Note: `AGENTS.md` states "Next.js 15" — the running version is **Next.js 16**. Docs discrepancy, not a blocker.

### Supabase packages (installed)
- `@supabase/ssr: latest` — SSR session management
- `@supabase/supabase-js: latest` — core client

### Client modules (all implemented)

| File | Role |
|---|---|
| `apps/web/lib/supabase/client.ts` | `createBrowserClient` reading `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`; falls back to `''` |
| `apps/web/lib/supabase/server.ts` | `createServerClient` with cookie handling for RSC and Server Actions |
| `apps/web/lib/supabase/middleware.ts` | `updateSession` — refreshes Supabase session on every request |
| `apps/web/proxy.ts` | Next.js 16 proxy convention entry point — delegates to `updateSession`, exports `config.matcher` |

### `.env.example` (existence confirmed indirectly)
Direct read was blocked by Windows filesystem permissions on the dotfile. Existence confirmed via:
- Block-0 verify-report line 41: `docker compose --env-file .env.example config` PASSED
- `README.md` line 118: `cp .env.example .env`
- Block-0 tasks.md task 1.8 (marked complete): created `.env.example` with Supabase vars

Declared Supabase vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`.
All Supabase vars are already present — **no new env vars expected from this change**.

### No TypeScript env declarations
`apps/web/global.d.ts` only declares `module '*.css'`. `process.env.*` vars have no type safety today.

### Auth route pages — placeholder state
- `apps/web/app/login/page.tsx` — static message, no form
- `apps/web/app/register/page.tsx` — static message, no form
- `apps/web/app/dashboard/page.tsx` — static message, `// TODO: add Supabase auth guard` (line 16)

---

## 3. Env/Config — Backend (`services/api`)

### Stack confirmed
`services/api/pyproject.toml`: FastAPI >= 0.124.0, Pydantic >= 2.12.0, pydantic-settings >= 2.12.0,
`supabase >= 2.25.0` (production dep), python-dotenv >= 1.2.0.

### Settings module
`services/api/app/core/config.py` — `Settings(BaseSettings)`:
```python
supabase_url: AnyHttpUrl | None = None
supabase_anon_key: str | None = None
supabase_service_role_key: str = ""
supabase_jwt_secret: str = ""
model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")
```
All Supabase fields default to `None`/`""` — app starts gracefully without credentials.

### Infrastructure adapter — stub only
`services/api/app/infrastructure/supabase/__init__.py` is a one-line docstring:
```python
"""Supabase adapters."""
```
No client initialization or adapter code exists — deferred to Block 4.

### JWT validation — deferred
`services/api/app/core/security.py` line 15:
```python
# TODO: verify Supabase JWT before returning a user identity.
```
Returns the raw Authorization header unvalidated — intentionally deferred to Block 4.

### Test environment
`services/api/tests/conftest.py` sets `SUPABASE_URL=http://localhost:54321` and
`SUPABASE_ANON_KEY=fake-key` as defaults. Backend tests run without real Supabase.

---

## 4. Supabase CLI in Monorepo

- Root `package.json` line 25: `"supabase": "^2.107.0"` — root devDependency. ✅
- No `supabase:start` or `supabase:reset` convenience script in root `package.json` scripts.
- Not in `turbo.json` (expected — Supabase is a side service, not a build pipeline step).
- `docker-compose.yml` comment (line 32): `# Supabase: run separately with \`pnpm supabase start\` after Docker Desktop is running.`
- `supabase/README.md` documents the expected flow: `pnpm supabase start` → `pnpm supabase status` → copy values to `.env`.

**Gap:** No `supabase:reset` convenience script exists. Adding one to root `package.json` is in scope.

---

## 5. RLS & Ownership Requirements

Source: `docs/07-data-security-and-rls.md` + `docs/03-domain-model.md`.

### Table breakdown

| Table | Ownership column | Ownership expression |
|---|---|---|
| `campaigns` | `user_id` (direct) | `campaigns.user_id = auth.uid()` |
| `sessions` | `campaign_id` (indirect) | EXISTS sub-select on campaigns |
| `memory_facts` | `campaign_id` (indirect) | EXISTS sub-select on campaigns |
| `npcs` | `campaign_id` (indirect) | EXISTS sub-select on campaigns |
| `factions` | `campaign_id` (indirect) | EXISTS sub-select on campaigns |
| `arcs` | `campaign_id` (indirect) | EXISTS sub-select on campaigns |

Child table ownership pattern (from `docs/07-data-security-and-rls.md` lines 126–133):
```sql
exists (
  select 1 from campaigns
  where campaigns.id = child_table.campaign_id
    and campaigns.user_id = auth.uid()
)
```

**Required policies:** SELECT, INSERT, UPDATE, DELETE per table = **24 policies total**.

### Column inventory (from `docs/07-data-security-and-rls.md`)

**campaigns:** `id uuid pk`, `user_id uuid not null`, `title text not null`, `description text`,
`world_state text`, `accumulated_summary text`, `summarized_up_to_session integer`,
`created_at timestamptz`, `updated_at timestamptz`

**sessions:** `id uuid pk`, `campaign_id uuid → campaigns(id)`, `session_number integer not null`,
`summary text`, `consequences text`, `generated_content jsonb`, `trace_json jsonb`,
`created_at`, `updated_at`

**memory_facts:** `id uuid pk`, `campaign_id uuid → campaigns(id)`,
`source_session_id uuid → sessions(id)`, `content text not null`, `type text`,
`importance text`, `status text`, `created_at`, `updated_at`

**npcs:** `id uuid pk`, `campaign_id uuid → campaigns(id)`, `name text not null`,
`description text`, `current_state text`, `motivation text`, `content_source text`,
`created_at`, `updated_at`

**factions:** `id uuid pk`, `campaign_id uuid → campaigns(id)`, `name text not null`,
`description text`, `current_stance text`, `goals text`, `content_source text`,
`created_at`, `updated_at`

**arcs:** `id uuid pk`, `campaign_id uuid → campaigns(id)`, `title text not null`,
`description text`, `status text`, `priority text`, `created_at`, `updated_at`

---

## 6. Local Dev Flow

### What exists today

| Artifact | Status |
|---|---|
| `supabase/config.toml` | ✅ Ready |
| `supabase/migrations/` | ✅ Directory tracked, ❌ No SQL |
| `supabase/seed.sql` | ✅ File exists, ❌ Placeholder only |
| `supabase/README.md` | ✅ Ready |
| `pnpm supabase` CLI | ✅ Ready (`^2.107.0`) |
| `.env.example` Supabase vars | ✅ All present |

### What this change adds

1. `supabase/migrations/<timestamp>_initial_schema.sql` — 6 tables, RLS enabled, 24 policies
2. `supabase/seed.sql` — 1 auth user, 1 campaign, 2 sessions (minimal)
3. (Optional) `supabase:reset` script in root `package.json`

### Developer experience after this change

```bash
# Prerequisite: Docker Desktop running
pnpm supabase start           # starts local Supabase stack
pnpm supabase status          # copy API URL + anon key + service_role key
# paste into .env (copy from .env.example)
pnpm supabase db reset        # runs migrations + seed → clean local DB
# Local stack ready for Block 4 auth work
```

`pnpm supabase db reset` re-applies all migrations and re-seeds on every call — ideal for dev iteration.

---

## 7. Scope Boundary

### In scope

- Migration file: all 6 tables with all columns from `docs/07-data-security-and-rls.md`
- RLS enabled + 24 policies (SELECT, INSERT, UPDATE, DELETE per table)
- Minimal seed: 1 auth user, 1 campaign, 2 sessions
- Optional: `supabase:reset` convenience script in root `package.json`
- `AGENTS.md` doc fix: "Next.js 15" → "Next.js 16"

### Deferred

- Cloud project `supabase link` / `db push` (deferred to demo time)
- Auth UI: login/register forms — Block 4
- Next.js protected routes with session check — Block 4
- Backend Supabase client adapter (`infrastructure/supabase/`) — Block 4+
- JWT validation in `security.py` — Block 4
- TypeScript `env.d.ts` declarations for `process.env.*` — Block 4
- Rich demo seed — later block
- `supabase start` in CI — later block

### Cloud project path (decision needed)

A hosted Supabase project already exists. Once this change lands on `main`, three options:

**Option A — Deferred push (lowest risk):** Do not run `supabase link` or `db push` yet.
Document the project reference in `supabase/README.md` or a new `supabase/CLOUD.md`. The hosted
project remains empty until Block 4 auth is needed.

**Option B — Push schema now:** Run `supabase link --project-ref <ref>` + `supabase db push`
immediately after merging. The hosted project gets the schema and RLS policies, enabling manual
auth testing before Block 4 is complete. Requires ongoing management of divergence risk
(local vs. hosted migrations must stay in sync).

**Option C — Document only:** Record the link/push commands in `supabase/CLOUD.md` without
executing them. Same risk profile as Option A, more explicit handoff documentation. Defers
the slot activation decision cleanly.

---

## Risks & Open Questions

1. **auth.users seeding is non-trivial.** Supabase Auth users require rows in `auth.users` AND
   `auth.identities` with a properly formatted bcrypt password hash. A plain `INSERT INTO auth.users`
   will NOT produce a user that can actually authenticate. The seed needs either:
   - A SQL function using `pgcrypto crypt()` for password hashing + multi-table insert
   - A post-start script calling the Supabase admin API (JS or Python)
   - A carefully crafted SQL snippet copying the exact schema used internally
   **This is the most significant open question for the proposal.**

2. **Next.js version discrepancy.** `apps/web/package.json` declares `next: 16.2.9` but `AGENTS.md`
   says "Next.js 15". Should be corrected; no blocking issue for this change.

3. **`.env.example` not directly readable** due to Windows filesystem permissions on dotfiles.
   Existence is confirmed via cross-references but exact content was not directly verified.

4. **RLS policy migration structure.** 24 policies can go in one large initial migration or be
   split per-table. One migration is simpler; per-table is more reviewable. Proposal-time decision.

5. **Domain enum columns.** `content_source` on `npcs`/`factions` and `status`/`priority`/`importance`
   on `arcs`, `memory_facts` map to domain enums. Choice: `text + CHECK CONSTRAINT` vs.
   `CREATE TYPE ... AS ENUM`. Affects future migration complexity. Proposal-time decision.
