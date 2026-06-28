# Tasks: supabase-setup

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~700–800 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | Single PR — foundational infrastructure; size:exception required |
| Delivery strategy | single-pr |
| Chain strategy | size-exception |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: size-exception
400-line budget risk: High

*Orchestrator has pre-determined single-PR delivery. `size:exception` must be recorded before `sdd-apply` begins.*

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Full supabase-setup change | Single PR | size:exception — infrastructure foundation |

---

## Phase 1 — Test scaffolding [failing tests first]

- [x] **T-01** Add `psycopg` to backend dev deps | `services/api/pyproject.toml` → add `psycopg>=3.0` to `[dependency-groups] dev`; run `uv sync` | Verify: `uv run python -c "import psycopg"` | Spec: NFR-3 | **parallel** with T-04

- [x] **T-02** Write schema verification tests [TEST] | `services/api/tests/test_schema.py` | Module fixture probes DSN `postgresql://postgres:postgres@localhost:54322/postgres`; `pytest.skip` if port 54322 unreachable; assert: 6 tables in `information_schema.tables`, 5 enum types + exact values in `pg_type`/`pg_enum` (spec values — see T-06 note), column names/types per `docs/07`, FK CASCADE on all 5 child `campaign_id` columns + `memory_facts.source_session_id`, **no FK** from `campaigns.user_id` to `auth.users`, `pg_class.relrowsecurity=true` × 6, exactly 24 rows in `pg_policies` | Verify: `uv run pytest services/api/tests/test_schema.py` → skip or fail (no migration yet) | Spec: NFR-3, FR-1.1–FR-1.3, FR-2.1–FR-2.2 | **sequential** after T-01

- [x] **T-03** Write RLS behavior tests [TEST] | `services/api/tests/test_rls.py` | Same DSN + skip guard; `as_user(conn, role, sub)` context manager: `BEGIN; SET LOCAL ROLE {role}; SELECT set_config('request.jwt.claims', ..., true)`; `force_rollback` on exit; `USER_A='00000000-0000-0000-0000-000000000001'`, `USER_B='00000000-0000-0000-0000-000000000002'`; test cases: (a) A SELECTs own campaign → 1 row, (b) B SELECTs campaigns → 0 rows, (c) B INSERTs session into A's campaign → `InsufficientPrivilege`, (d) anon SELECTs campaigns → `InsufficientPrivilege` (permission denied, NOT empty set), (e) A SELECTs sessions → 2 rows, (f) B SELECTs sessions → 0 rows | Verify: `uv run pytest services/api/tests/test_rls.py` → skip or fail | Spec: NFR-3, FR-2.2, FR-3.3 | **parallel** with T-02

- [x] **T-04** Wire Vitest to discover `supabase/scripts/*.test.ts` [TEST SUPPORT] | `pnpm-workspace.yaml` (add `- 'supabase'`); new `supabase/package.json` (`"scripts": {"test": "vitest run"}`); new `supabase/vitest.config.ts` (`include: ['scripts/**/*.test.ts']`, environment `node`) | Without this Turbo cannot find the supabase test workspace — `apps/web/vitest.config.ts` only covers `apps/web` | Verify: `pnpm test` resolves supabase workspace (will fail — no test file yet) | Spec: NFR-3, FR-5 | **parallel** with T-01

- [x] **T-05** Write seed-auth unit tests [TEST] | `supabase/scripts/seed-auth.test.ts` | Mock Admin client via `deps` injection (no live stack needed); 5 test cases: (a) dry-run — `createUser` NOT called, UUID `00000000-0000-0000-0000-000000000001` + `email_confirm: true` logged, (b) missing `SUPABASE_URL` → throws descriptive error, (c) missing `SUPABASE_SERVICE_ROLE_KEY` → throws descriptive error, (d) normal path — `createUser` called once with `{ id: FIXED_UUID, email_confirm: true }`, (e) **idempotency guard** — `getUserById` returns existing user → `createUser` NOT called, skip message logged | Verify: `pnpm test` → fail (no implementation) | Spec: NFR-3, FR-4.2 | **sequential** after T-04

---

## Phase 2 — Schema migration [make schema tests green]

- [x] **T-06** Create initial schema migration [IMPL] | `supabase/migrations/YYYYMMDDHHMMSS_initial_schema.sql` | Generate filename via `supabase migration new initial_schema`; write SQL in this exact order: (1) 5 enum types — **SPEC VALUES ONLY** (design artifact carries stale values — do NOT copy from design): `content_source(llm,edited,manual)`, **`arc_status(open,resolved,dropped)`** ← not abandoned, `priority(high,medium,low)`, `importance(high,medium,low)`, **`memory_status(active,archived)`** ← not invalidated; (2) 6 tables parent-first (`campaigns→sessions→npcs→factions→arcs→memory_facts`), `campaigns.user_id uuid NOT NULL` with **no FK to `auth.users`**; (3) `ALTER TABLE … ENABLE ROW LEVEL SECURITY` × 6; (4) 24 RLS policies — campaigns: `user_id=auth.uid()`; children: EXISTS sub-select `(select 1 from campaigns where campaigns.id=<child>.campaign_id and campaigns.user_id=auth.uid())`; (5) GRANTs: schema USAGE to anon/authenticated/service_role; SELECT/INSERT/UPDATE/DELETE to authenticated; ALL to service_role; **no table grants to anon** | Verify: `pnpm supabase:reset` → clean apply; `uv run pytest services/api/tests/test_schema.py` → all assertions pass | Spec: FR-1.1–FR-1.3, FR-2.1–FR-2.2, FR-3.1–FR-3.3 | **sequential** after T-01–T-05

---

## Phase 3 — Seed

- [x] **T-07** Write `supabase/seed.sql` [IMPL] | `supabase/seed.sql` | INSERT 1 campaign (`id=10000000-0000-0000-0000-000000000001`, `user_id=00000000-0000-0000-0000-000000000001`, `title='Dev Campaign'`) and 2 sessions (`id=20000000-0000-0000-0000-000000000001`, `20000000-0000-0000-0000-000000000002`, `session_number=1,2`); all UUIDs as literal string constants | Verify: `pnpm supabase:reset` completes without errors; rows visible as postgres role | Spec: FR-4.1, NFR-1, AC-13 | **sequential** after T-06

- [x] **T-08** Write `supabase/scripts/seed-auth.ts` [IMPL] | `supabase/scripts/seed-auth.ts` | Export `seedAuthUser(options, deps)` with injectable `createClientFn` + `log`; **idempotency guard**: call `supabase.auth.admin.getUserById(FIXED_UUID)` first — if user exists log skip and return; `--dry-run`: log intended params, no API call, exit 0; normal path: `createUser({ id: '00000000-0000-0000-0000-000000000001', email, password, email_confirm: true })`; exit 1 on missing `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` without `--dry-run`; guard `main()` against import side effects | Verify: `pnpm supabase:seed-auth --dry-run` logs intent + exits 0; `pnpm test` (supabase workspace) → all 5 cases pass | Spec: FR-4.2, NFR-3, AC-15–AC-16 | **parallel** with T-07

---

## Phase 4 — Tooling and docs

- [x] **T-09** Add `tsx` to root devDependencies [IMPL] | Root `package.json` | `pnpm add -D tsx` from repo root; commit updated lockfile | Verify: `tsx --version` | Spec: FR-5.2, AC-18 | **parallel** with T-07/T-08

- [x] **T-10** Add `supabase:reset` and `supabase:seed-auth` scripts to root `package.json` [IMPL] | Root `package.json` | Add `"supabase:reset": "supabase db reset"` and `"supabase:seed-auth": "tsx supabase/scripts/seed-auth.ts"` | Verify: `pnpm supabase:seed-auth --dry-run` resolves | Spec: FR-5.1, AC-17 | **sequential** after T-09

- [x] **T-11** Write `supabase/CLOUD.md` [DOCS] | `supabase/CLOUD.md` | Sections: Docker Desktop prereq; `supabase link --project-ref <ref>` (one-time); initial `supabase db push`; incremental push workflow (only `db push` mutates hosted — never hand-edit); rollback path (drop policies → drop tables CASCADE → drop types → `db push` — safe, no real data); cloud auth user creation note | Spec: FR-5.3, AC-19 | **parallel** with T-08–T-10

- [x] **T-12** Fix `AGENTS.md`: "Next.js 15" → "Next.js 16" [DOCS] | `AGENTS.md` | Single string replacement; matches `apps/web/package.json` (`next@16.2.9`) | Verify: `grep "Next.js 16" AGENTS.md` | Spec: FR-5.4, AC-20 | **parallel** with T-08–T-11

---

## Phase 5 — Acceptance gate

- [x] **T-13** Run full local acceptance gate [VERIFY] | — | Execute in order: `pnpm supabase start` → `pnpm supabase:reset` → `pnpm supabase:seed-auth` → `pnpm supabase:seed-auth` (second run — must not fail; idempotency guard) → `uv run pytest` (schema + RLS fully green) → `pnpm test` (all workspaces green) → manual login with seeded credentials | All 23 acceptance criteria satisfied | Spec: NFR-1, NFR-2, NFR-3 | **sequential** after T-06–T-12

---

## Verification commands

```bash
# Schema tests (requires local stack)
uv run pytest services/api/tests/test_schema.py -v

# RLS behavior tests (requires local stack + seed)
uv run pytest services/api/tests/test_rls.py -v

# Seed-auth unit tests (no live stack needed)
pnpm --filter supabase test

# Full test suite from root
pnpm test

# Seed workflow
pnpm supabase start
pnpm supabase:reset
pnpm supabase:seed-auth
pnpm supabase:seed-auth       # second run — idempotency check (must not fail)

# Dry-run (works without credentials)
pnpm supabase:seed-auth --dry-run

# Quality gate
uv run ruff check services/api/app/
pnpm typecheck
pnpm lint
```
