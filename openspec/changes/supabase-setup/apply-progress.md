# Apply Progress: supabase-setup

> Hybrid mode. This artifact mirrors the Engram observation
> `sdd/supabase-setup/apply-progress` and is the cumulative record of
> implementation batches. New batches MERGE previous progress — do not
> overwrite completed tasks.

## Change

- **Name**: `supabase-setup`
- **Branch**: `feat/supabase-db-config`
- **Mode**: Strict TDD (config `openspec/config.yaml` → `rules.apply.tdd: true`)
- **Delivery**: `single-pr` with maintainer-approved `size:exception`
  (~700–800 changed lines; foundational infrastructure). Chain strategy:
  `size-exception`. PR boundary = T-01 through T-13.
- **Backend base commit**: `22eb413` (planning artifacts committed)
- **First apply commit**: `8aeb3df`

## Batch summary

### Batch 1 — Phase 1: Test scaffolding [failing tests first] — DONE

Implemented T-01 through T-05. Phase 1 produces RED only (tests + test infra
written before the migration/implementation exists). Phase 2 (T-06) makes the
pytest suites green; Phase 3 (T-08) makes the Vitest suite green.

Safety net captured BEFORE Phase 1 edits: existing backend suite
`pytest tests/` = **3 passed** (test_config, test_fake_llm, test_health). No
pre-existing test was modified by Phase 1, and the safety net still passes
after Phase 1 (`3 passed`).

## Work-unit commits (Batch 1)

| Commit | Work unit | Files |
|---|---|---|
| `8aeb3df` | Backend RED tests | `services/api/pyproject.toml`, `services/api/uv.lock`, `services/api/tests/test_schema.py`, `services/api/tests/test_rls.py` |
| `72f8668` | Supabase Vitest workspace + seed-auth RED test | `pnpm-workspace.yaml`, `pnpm-lock.yaml`, `supabase/package.json`, `supabase/vitest.config.ts`, `supabase/scripts/seed-auth.test.ts` |
| `c3923c3` | SDD bookkeeping | `openspec/changes/supabase-setup/tasks.md`, `openspec/changes/supabase-setup/apply-progress.md` |

## TDD Cycle Evidence — Batch 1 (Phase 1 RED)

> Strict TDD module (RED → GREEN → REFACTOR per task). Phase 1 is RED only:
> GREEN and REFACTOR say "pending Phase 2/3" where the production code that
> satisfies each test is scheduled for a later batch.

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|------------|-----|-------|-------------|----------|
| T-01 Add `psycopg` to backend dev deps | `tests/test_schema.py`, `tests/test_rls.py` (import `psycopg`) | Dev-dep / infra | ✅ 3/3 pre-existing | ✅ Tests reference `import psycopg`; dep absent before `uv sync` resolves it | ✅ `uv run python -c "import psycopg"` → `3.3.4` run AFTER dep installed | ➖ Single output (dep present or absent) — "Triangulation skipped: purely structural config addition" | ➖ `ruff format` applied to new test files |
| T-02 Schema verification tests | `services/api/tests/test_schema.py` | Integration (postgres on :54322; module-skip guard) | ✅ 3/3 pre-existing | ✅ Written first; 33 tests collected, 32 FAILED + 1️⃣ vacuous-pass-fixed against running stack with no migration (RED confirmed by execution) | ✅ **Sat by T-06** — all 33 assertions PASS against the migration (proven via scratch-DB run this batch, see Batch 2) | ✅ 33 parametrized cases across 6 tables × {columns, PK default, timestamps, RLS} + 5 enums + FK CASCADE + 24 policies — multi-case by design | ➖ pending Phase 2 (only meaningful once GREEN) |
| T-03 RLS behavior tests | `services/api/tests/test_rls.py` | Integration (postgres on :54322; module-skip guard) | ✅ 3/3 pre-existing | ✅ Written first; 6 tests collected, 6 FAILED (`UndefinedTable`) against running stack with no migration (RED confirmed) | ⏳ pending Phase 3 (T-07 seed for sessions count); RLS owner model present after T-06 but seed rows absent | ✅ 6 cases (a–f) — owner/non-owner × SELECT, non-owner INSERT, anon permission-denied, parent-scoped child reads | ➖ pending Phase 3 |
| T-04 Wire Vitest for supabase workspace | `supabase/vitest.config.ts`, `supabase/package.json`, `pnpm-workspace.yaml` | Test-support / config | N/A (new workspace) | ✅ `pnpm --filter supabase test` resolves, vitest v4.1.9 starts, exits 1 "No test files found" (workspace wired, RED for missing test) | ⏳ pending Phase 1 T-05 (test file created this same batch) then T-08 (impl) | ➖ "Triangulation skipped: purely structural config (vitest wiring)" | ➖ Prettier applied to all new non-Python files |
| T-05 seed-auth unit tests | `supabase/scripts/seed-auth.test.ts` | Unit (Vitest + vi.fn deps injection, no live stack) | N/A (new file) | ✅ Written first; vitest collects the file, FAILS at `import './seed-auth'` (module not found) — RED confirmed by execution | ⏳ pending Phase 3 (T-08 `seed-auth.ts`) | ✅ 5 cases (a–e): dry-run, missing URL, missing service key, normal path, idempotency guard — distinct code paths | ➖ pending Phase 3 (only meaningful once GREEN) |

**Vacuous-GREEN guard applied**: `test_no_fk_from_campaigns_user_id_to_auth_users`
initially passed trivially (0 FKs because no tables exist). A
`campaigns`-table-existence precondition was added so the assertion can only
pass once the migration has deliberately omitted the `auth.users` FK — turning
a vacuous pass into a meaningful RED until Phase 2.

### Test summary (Batch 1)

- **Total tests written**: 39 backend + 5 Vitest = 44
- **Total tests passing**: 0 (Phase 1 = RED by design; GREEN is Phase 2/3)
- **Backend tests collected/failed against running stack**: 39
  (32 schema FAILED + 1 fixed vacuous → now FAILED + 6 RLS FAILED)
- **Vitest tests collected/failed**: 1 file, 0 tests (import-time failure = RED)
- **Layers used**: Integration (2 files, 39 tests, skip-guarded), Unit (1 file, 5 tests, mock-injected)
- **Approval tests**: None — no refactoring tasks in Phase 1
- **Pure functions created**: 0 (tests only; production code is Phase 2/3)

## Deviations from design (Batch 1)

- **`as_user` signature**: prompt/tasks.md specify `as_user(conn, role, sub)` (role
  and sub both params). `design.md` shows `as_user(conn, uuid_or_none)` (role
  derived from uuid). Followed the prompt/tasks.md signature (more explicit,
  lets the same helper cover `anon` with `role="anon", sub=None`). Role is
  whitelisted to `{"authenticated", "anon"}` because `SET LOCAL ROLE` takes a
  bare identifier, not a bind parameter — interpolation is safe against this
  fixed internal whitelist (never user input).
- **Enum values**: confirmed `arc_status(open,resolved,dropped)` and
  `memory_status(active,archived)` from `docs/03-domain-model.md` (lines 104–106,
  172–173) — NOT the stale `active/abandoned` and `active/invalidated` values
  that still appear in `proposal.md`'s schema-strategy table and (per the spec's
  R1) in `design.md`. The authoritative values are baked into
  `EXPECTED_ENUMS` in `test_schema.py`, so the Phase 2 migration MUST match
  these exact values or the schema tests will fail.
- **Vitest version**: tasks.md did not pin a version. The `^2.3.3` first
  attempted does not exist on the registry (latest is 4.1.9). Switched to
  `"vitest": "latest"` to match the existing `apps/web` convention (which
  resolves to 4.1.9). `.tests/setup.ts` from `apps/web` is NOT reused — the
  supabase workspace is a separate Vitest project.
- **No `parseArgs` unit test added**: tasks.md T-05 specifies exactly 5 cases
  (a–e) for `seedAuthUser`. `parseArgs` is a separate export per `design.md`
  but is not in the T-05 case list, so no dedicated test was added (scope
  discipline — Phase 3 may extend if the impl calls it from `seedAuthUser`).

## Issues found (Batch 1)

- **Pre-existing uncommitted change**: `docs/10-roadmap.md` shows as modified
  in the working tree but is NOT part of this change's Phase 1 scope. It has
  been left UNSTAGED and is not included in any Phase 1 commit. The
  orchestrator/user should reconcile it independently.
- **Vitest registry**: `vitest@^2.3.3` is unavailable; used `"latest"`
  (resolves to 4.1.9). If a pin is desired, `^3.2.6` (V3 stable) is also
  available — flagged here so the lockfile decision is visible.
- **Local stack status**: the local Supabase stack is UP on :54322 during this
  batch, so the integration-skip guard did NOT fire and tests failed "live"
  against the empty DB. This is acceptable per NFR-3 (tests MUST fail or skip
  until the migration exists). When the stack is down (typical CI), the
  module-skip guard fires and tests stay green-by-skip.

---

## Batch 2 — Phase 2: Schema migration [make schema tests GREEN] — DONE

Implemented T-06. Phase 2 turns Phase 1's RED `test_schema.py` (33 assertions)
into GREEN by writing the initial schema migration. `test_rls.py` (Phase 1
RED) is NOT made green by T-06 alone — it still needs the T-07 seed rows for
the session-count assertions; this is expected, not a regression.

### Work-unit commits (Batch 2)

| Commit | Work unit | Files |
|---|---|---|
| (this batch) | Initial schema migration + RLS + GRANTs | `supabase/migrations/20260628101707_initial_schema.sql` |
| (this batch) | SDD bookkeeping (Phase 2 tasks/progress) | `openspec/changes/supabase-setup/tasks.md`, `openspec/changes/supabase-setup/apply-progress.md` |

### TDD Cycle Evidence — Batch 2 (Phase 2 GREEN)

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|------------|-----|-------|-------------|----------|
| T-06 Create initial schema migration | `services/api/tests/test_schema.py` (33 assertions, written in Phase 1) | Integration (postgres on :54322; module-skip guard) — verified via scratch Postgres 17 due to port conflict, see Issues | ✅ 33 collected, 33 FAILED vs live empty `:54322` (Phase 1 RED; GREEN was pending this batch) | ✅ **33 passed** against a scratch Postgres 17 with the migration applied (migration applies cleanly: 5 enums, 6 tables, 6 RLS, 24 policies, 3 GRANTs, zero errors) | ✅ 33 distinct assertions cover 6 tables × {exact column set + types, PK default, timestamps} + 5 enums w/ exact spec values + 6 FK CASCADE + no-FK-to-auth.users + RLS × 6 + exactly 24 policies — multi-case by design | ➖ SQL clean; lowercase keywords; fully data-driven; no magic to extract |

**T-02 GREEN now satisfied by T-06**: the Phase 1 schema-verification tests
(all 33) PASS when the migration is present. The closed vacuous-pass-guard
(`test_no_fk_from_campaigns_user_id_to_auth_users` requires the `campaigns`
table to exist) turns GREEN only because T-06 deliberately omits the
`auth.users` FK (design D1).

**T-03 (test_rls.py) still RED — EXPECTED.** The 6 RLS-behavior tests cannot
pass until Phase 3 seeds the demo campaign + sessions (T-07) — the
session-count assertions (`test_user_a_reads_two_seeded_sessions`) and the
owner-reads-own-campaign assertion need seeded rows. The migration lays the
correct groundwork (24 policies + GRANTs), but the seed rows are absent.

### Test summary (Batch 2)

- **Total tests written this batch**: 0 new tests (Strict TDD — Phase 1 wrote
  them; Phase 2 writes the implementation that flips them to GREEN).
- **Total tests passing against migration-applied DB**: 33/33 (test_schema.py)
  — proven via scratch-DB verification run.
- **Against the live `:54322` endpoint**: schema + RLS tests still FAIL → 39
  failed (32 schema + 1 no-FK + 6 RLS) + 3 unit passed. This is an
  ENVIRONMENT artifact, NOT a migration defect (see Issues Found — port
  54322 is occupied by a foreign Supabase project). The migration's
  correctness is proven by the scratch-DB run, which applies the exact same
  SQL to an identical Postgres 17.
- **Safety net**: 3 pre-existing unit tests (`test_config`, `test_fake_llm`,
  `test_health`) STILL PASS — no regression.
- **Ruff**: `All checks passed!` (no Python changed this batch).

## Deviations from design (Batch 2)

- **None to the SQL itself.** The migration follows `design.md` §Migration file
  design faithfully: enum types first (spec values), tables parent-first,
  `ENABLE ROW LEVEL SECURITY`, 24 policies (direct ownership on `campaigns`,
  EXISTS sub-select on the 5 children), GRANTs last. `campaigns.user_id` has
  NO FK to `auth.users` (design D1 honored). Enum columns are nullable with
  no defaults (design D4). No `updated_at` auto-update trigger (design D5).
  `memory_facts.source_session_id` keeps `on delete cascade` (design D8).
- **Enum source-of-truth**: the prompt warned the `design.md` enum table is
  STALE, but the design artifact had already been corrected (per spec R1) —
  `design.md` lines 70–77 now show `arc_status(open,resolved,dropped)` and
  `memory_status(active,archived)`, matching `docs/03-domain-model.md` and
  `EXPECTED_ENUMS` in `test_schema.py`. The migration uses the authoritative
  values from docs/03 + the test; no stale values were copied.
- **Verification locus**: `design.md`/`tasks.md` prescribe verifying against
  the live local Supabase stack via `pnpm supabase:reset` + `pytest`. The
  live stack could not be used for verification (port-54322 conflict, see
  Issues Found). GREEN was instead proven by applying the identical SQL to a
  throwaway scratch database inside an existing Postgres 17 and running the
  EXACT `test_schema.py` assertions (DSN swapped in a temporary copy; the
  committed test file was NOT modified) — 33/33 pass. The scratch DB was
  dropped after verification (zero pollution).

## Issues found (Batch 2 — IMPORTANT, carried forward)

- **⚠️ PORT 54322 CONFLICT (BLOCKER for full live verification).** Port 54322
  (the lazy-lands Supabase DB port) is currently occupied by a DIFFERENT,
  foreign Supabase project whose containers are named
  `supabase_*_holy-seitan` (container label
  `com.supabase.cli.project=holy-seitan`). That project's `postgres` DB
  `public` schema is empty (0 tables) but the stack is healthy and running.
  Consequences:
  - `pnpm supabase start` for lazy-lands would fail with a DB port conflict.
  - `pnpm supabase:reset` (= `supabase db reset`) would connect to the
    `lazy-lands` CLI project but operate on whatever is on :54322 = the
    holy-seitan Postgres — i.e. it would WIPE the foreign project's DB and
    recreate it with the lazy-lands schema. This was deliberately NOT done to
    avoid destroying the user's other project.
  - `uv run pytest tests/test_schema.py` against :54322 therefore runs against
    the foreign holy-seitan DB (empty public schema) → schema tests FAIL as a
    pure environment artifact, not because the migration is wrong.
  - **Resolution required from the user/orchestrator** before T-07/T-13
    acceptance can run on the real stack: stop the `holy-seitan` Supabase
    stack (`supabase stop` from the holy-seitan project directory, or
    `docker rm -f` its containers), OR reconfigure so lazy-lands starts
    cleanly on :54322. Once :54322 is free, run `pnpm supabase start` →
    `pnpm supabase:reset` → `uv run pytest tests/test_schema.py -v` (expect
    33 GREEN) and `uv run pytest tests/test_rls.py -v` (expect still failing
    until T-07 seeds).
  - Phase 3 (T-07/T-08) and Phase 5 (T-13) verification will hit the SAME
    blocker until :54322 is freed.

- **Scratch-DB verification (used to prove GREEN without wiping holy-seitan).**
  A throwaway database `lazy_lands_verify` was created inside the existing
  Postgres 17, a stub `auth.uid()` was defined (so the 24 RLS policies, which
  reference `auth.uid()`, could resolve at CREATE POLICY time — the stub is
  never executed by `test_schema.py`), the migration was applied via `psql`,
  and a temporary copy of `test_schema.py` (DSN swapped to the scratch DB) was
  run with `pytest` → **33 passed**. The committed `test_schema.py` was NOT
  modified (Strict TDD rule respected). After verification the scratch DB was
  dropped and the temp files removed; the holy-seitan `postgres` public schema
  was re-checked to be pristine (0 tables). Zero pollution, zero net change
  to the foreign project.

---

## Batch 3 — Recovery: Seed + auth script + root tooling — DONE

Recovery continuation after a prior `sdd-apply` returned an empty result with
partial uncommitted changes. Implemented only the assigned recovery scope:
T-07 through T-10. T-11, T-12, and T-13 remain untouched for the next batch.

### Work-unit commits (Batch 3)

| Commit | Work unit | Files |
|---|---|---|
| (this batch) | Seed + auth script + tooling recovery | `supabase/seed.sql`, `supabase/scripts/seed-auth.ts`, `package.json`, `pnpm-lock.yaml`, `supabase/package.json`, `services/api/tests/test_rls.py`, `openspec/changes/supabase-setup/tasks.md`, `openspec/changes/supabase-setup/apply-progress.md` |

### TDD Cycle Evidence — Batch 3 (T-07 through T-10)

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|------------|-----|-------|-------------|----------|
| T-07 Write `supabase/seed.sql` | `services/api/tests/test_rls.py` (6 assertions, written in Phase 1) | Integration (local Supabase Postgres on :54322) | ✅ `pnpm supabase:reset` applied migration + seed; schema tests remain GREEN | ✅ Phase 1 RLS tests were RED until seed rows existed | ✅ `uv run pytest tests/test_schema.py tests/test_rls.py -v` → **39 passed** after seed | ✅ Owner/non-owner campaign reads + owner/non-owner session reads + non-owner insert + anon permission-denied | ➖ SQL seed is minimal and literal by design |
| T-08 Write `supabase/scripts/seed-auth.ts` | `supabase/scripts/seed-auth.test.ts` | Unit (Vitest + mocked Admin client; no live stack) | ✅ Pre-impl `pnpm --filter supabase test` failed at `Cannot find module './seed-auth'` | ✅ Existing RED test imported missing production module | ✅ `pnpm --filter supabase test` → **5 passed** | ✅ 5 cases: dry-run, missing URL, missing service key, normal create, idempotent skip | ✅ Extracted constants, `parseArgs`, credential validation, direct-execution guard |
| T-09 Add `tsx` root devDependency | Root `package.json` + `pnpm-lock.yaml` | Config / CLI tooling | ✅ Prior partial change inspected before use | ✅ Root `supabase:seed-auth` could not run without `tsx` | ✅ `pnpm exec tsx --version` → `tsx v4.22.4` | ➖ Triangulation skipped: structural dependency addition | ➖ Existing partial lockfile/package changes retained after verification |
| T-10 Add root Supabase scripts | Root `package.json` | Config / CLI tooling | ✅ Root scripts absent before edit | ✅ `pnpm supabase:seed-auth --dry-run` unavailable before script existed | ✅ `pnpm supabase:reset` completed; `pnpm supabase:seed-auth --dry-run` exited 0 and logged intent | ✅ Reset script + seed-auth dry-run exercise both new root commands | ➖ Prettier confirmed package.json unchanged after formatting |

### Test summary (Batch 3)

- **Total tests written this batch**: 0 new tests (Strict TDD — Phase 1 wrote
  the RED tests; this recovery batch makes T-07/T-08/T-10 GREEN).
- **Backend schema + RLS**: `39 passed in 0.28s` after `pnpm supabase:reset`.
- **Seed-auth unit tests**: `5 passed` via `pnpm --filter supabase test`.
- **Dry-run CLI**: `pnpm supabase:seed-auth --dry-run` exited 0 and logged the
  pinned UUID + `email_confirm=true`; no real Admin API call was made.
- **tsx tooling**: `pnpm exec tsx --version` → `tsx v4.22.4`.
- **Lint/format touched test**: `uv run ruff check tests/test_rls.py` → all
  checks passed.

## Deviations from design (Batch 3)

- `supabase/seed.sql` uses the exact T-07 task title `Dev Campaign` and only
  required fields (`id`, `user_id`, `title`, `session_number`) rather than the
  richer illustrative seed content in `design.md`. This matches the assigned
  task and FR-4.1 minimal seed requirement.
- `services/api/tests/test_rls.py` was minimally corrected to compare
  `str(rows[0][0])` to the expected seeded campaign UUID. Psycopg returns
  PostgreSQL `uuid` columns as Python `UUID` objects, while the test constant is
  a string. This preserves the behavioral assertion and removes a false
  negative without weakening coverage.

## Issues found (Batch 3)

- The previous port-54322 blocker is no longer present in this environment:
  Docker now shows the local containers labeled `com.supabase.cli.project=lazy-lands`,
  and `pnpm supabase:reset` completed safely against the lazy-lands stack.
- The failed prior agent's partial changes were valid and retained: root `tsx`
  devDependency + lockfile entries, and `@supabase/supabase-js` in
  `supabase/package.json` + lockfile. This batch finished and verified them
  instead of re-adding or reverting them.
- A first formatting attempt included `supabase/seed.sql`; Prettier has no SQL
  parser in this project and reported "No parser could be inferred". The SQL
  file was left as manually formatted SQL; Prettier was rerun only on supported
  JSON/TypeScript files.

## Remaining tasks

---

## Supplemental hardening — local-only guard for dev auth seed — DONE

Added a local-only safety guard to `supabase/scripts/seed-auth.ts` so the
hardcoded local development credentials cannot be used against a hosted or
remote Supabase URL. This is supplemental security hardening for completed
T-08; no `tasks.md` checkbox changed.

### TDD Cycle Evidence — Supplemental hardening

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|------------|-----|-------|-------------|----------|
| Local-only seed-auth URL guard | `supabase/scripts/seed-auth.test.ts` | Unit (Vitest + injected client factory; no live stack) | ✅ Baseline `pnpm --filter supabase test` → **5 passed** before edits | ✅ Added remote-URL + invalid-URL tests first; RED confirmed: **2 failed, 5 passed** before implementation | ✅ `pnpm --filter supabase test` → **7 passed** after guard implementation | ✅ Existing localhost normal-path test proves local URLs still proceed; new remote URL test proves client creation is blocked; invalid URL test proves clear parse failure | ✅ Extracted URL validation into `assertLocalSupabaseUrl`; Prettier applied; tests rerun GREEN |

### Test summary (Supplemental hardening)

- **Total tests written this batch**: 2 unit tests.
- **Seed-auth unit tests**: `7 passed` via `pnpm --filter supabase test`.
- **Dry-run CLI**: `pnpm supabase:seed-auth --dry-run` exited 0 and logged the
  pinned UUID + `email_confirm=true`; dry-run remains credential-free and makes
  no Supabase client.

### Guard behavior

- `--dry-run` returns before credential or URL validation, so it remains safe in
  any environment and never creates a Supabase client.
- Non-dry-run still fails clearly when `SUPABASE_URL` or
  `SUPABASE_SERVICE_ROLE_KEY` is missing.
- Non-dry-run parses `SUPABASE_URL` with `new URL(...)`; invalid URLs fail with
  `seed-auth: SUPABASE_URL must be a valid URL` before client creation.
- Non-dry-run only accepts hostnames `localhost`, `127.0.0.1`, `::1`, or
  `[::1]`; remote hosts such as `example.supabase.co` fail with a local-only
  error before `createClientFn`, `getUserById`, or `createUser` can run.

### Files changed (Supplemental hardening)

- `supabase/scripts/seed-auth.ts` — added robust URL parsing and local-host
  enforcement after credential validation and before client creation.
- `supabase/scripts/seed-auth.test.ts` — added remote-url rejection and invalid
  URL tests; existing localhost normal-path test remains the allowed-path proof.
- `openspec/changes/supabase-setup/apply-progress.md` — recorded this
  supplemental hardening note.

### Out-of-scope confirmation

- `supabase/CLOUD.md` was not read for editing, created, or modified.
- `tasks.md`, `AGENTS.md`, frontend files, and `.claude/` were not modified in
  this supplemental batch.

- [ ] **T-11** Write `supabase/CLOUD.md` (Phase 4)
- [ ] **T-12** Fix `AGENTS.md`: "Next.js 15" → "Next.js 16" (Phase 4)
- [ ] **T-13** Run full local acceptance gate (Phase 5 — VERIFY)

## Verification commands run (cumulative)

| Command | Result |
|---|---|
| `pnpm supabase migration new initial_schema` | Created `supabase/migrations/20260628101707_initial_schema.sql` |
| `psql … lazy_lands_verify -f migration.sql` (scratch DB, stubbed `auth.uid()`) | Clean apply: 5 CREATE TYPE + 6 CREATE TABLE + 6 ALTER TABLE (RLS) + 24 CREATE POLICY + 3 GRANT, **zero errors** |
| `uv run pytest <temp test_schema copy w/ scratch DSN> -v` | **33 passed in 0.49s** (all test_schema.py assertions GREEN against the migration) |
| `uv run pytest tests/` (services/api — live :54322) | `39 failed, 3 passed` — 3 pre-existing unit tests GREEN (safety net intact); 39 schema/RLS failures are the port-54322 environment artifact (foreign holy-seitan project occupies :54322) |
| `uv run ruff check .` (services/api) | `All checks passed!` (no Python changed) |
| `drop database lazy_lands_verify` + temp file cleanup | Scratch DB dropped; holy-seitan `public` schema re-verified empty (0 tables); zero net pollution |
| `pnpm supabase:reset` / `pnpm supabase start` (lazy-lands live stack) | **NOT RUN** — would conflict on :54322 (foreign `holy-seitan` stack) / risk wiping the foreign project. Requires user to free :54322 before the full live acceptance gate (T-13). |
| `pnpm --filter supabase test` (pre-impl Batch 3) | RED confirmed: failed at `Cannot find module './seed-auth'` before `seed-auth.ts` existed |
| `pnpm supabase:reset` (Batch 3) | ✅ Reset local lazy-lands DB, applied `20260628101707_initial_schema.sql`, seeded `supabase/seed.sql`, restarted containers |
| `uv run pytest tests/test_schema.py tests/test_rls.py -v` (services/api, Batch 3) | ✅ **39 passed in 0.28s** |
| `pnpm exec tsx --version` (Batch 3) | ✅ `tsx v4.22.4`, `node v24.16.0` |
| `pnpm --filter supabase test` (Batch 3) | ✅ **5 passed** (`supabase/scripts/seed-auth.test.ts`) |
| `pnpm supabase:seed-auth --dry-run` (Batch 3) | ✅ Exited 0; logged pinned UUID + `email_confirm=true`; no Admin API call |
| `pnpm exec prettier --write package.json supabase/package.json supabase/scripts/seed-auth.ts` | ✅ Supported files formatted/unchanged |
| `uv run ruff format tests/test_rls.py && uv run ruff check tests/test_rls.py` | ✅ Reformatted touched Python test; all checks passed |

## Status

10/13 tasks complete. Ready for next apply batch (T-11/T-12 docs/tooling
follow-up, then T-13 acceptance gate). The local lazy-lands Supabase stack is
currently available on :54322 and Batch 3 verification passed against it.
