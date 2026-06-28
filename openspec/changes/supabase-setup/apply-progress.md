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

## Work-unit commits (this batch)

| Commit | Work unit | Files |
|---|---|---|
| `8aeb3df` | Backend RED tests | `services/api/pyproject.toml`, `services/api/uv.lock`, `services/api/tests/test_schema.py`, `services/api/tests/test_rls.py` |
| `72f8668` | Supabase Vitest workspace + seed-auth RED test | `pnpm-workspace.yaml`, `pnpm-lock.yaml`, `supabase/package.json`, `supabase/vitest.config.ts`, `supabase/scripts/seed-auth.test.ts` |
| (this commit) | SDD bookkeeping | `openspec/changes/supabase-setup/tasks.md`, `openspec/changes/supabase-setup/apply-progress.md` |

## TDD Cycle Evidence

> Strict TDD module (RED → GREEN → REFACTOR per task). Phase 1 is RED only:
> GREEN and REFACTOR say "pending Phase 2/3" where the production code that
> satisfies each test is scheduled for a later batch.

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|------------|-----|-------|-------------|----------|
| T-01 Add `psycopg` to backend dev deps | `tests/test_schema.py`, `tests/test_rls.py` (import `psycopg`) | Dev-dep / infra | ✅ 3/3 pre-existing | ✅ Tests reference `import psycopg`; dep absent before `uv sync` resolves it | ✅ `uv run python -c "import psycopg"` → `3.3.4` run AFTER dep installed | ➖ Single output (dep present or absent) — "Triangulation skipped: purely structural config addition" | ➖ `ruff format` applied to new test files |
| T-02 Schema verification tests | `services/api/tests/test_schema.py` | Integration (postgres on :54322; module-skip guard) | ✅ 3/3 pre-existing | ✅ Written first; 33 tests collected, 32 FAILED + 1️⃣ vacuous-pass-fixed against running stack with no migration (RED confirmed by execution) | ⏳ pending Phase 2 (T-06 migration) | ✅ 33 parametrized cases across 6 tables × {columns, PK default, timestamps, RLS} + 5 enums + FK CASCADE + 24 policies — multi-case by design | ➖ pending Phase 2 (only meaningful once GREEN) |
| T-03 RLS behavior tests | `services/api/tests/test_rls.py` | Integration (postgres on :54322; module-skip guard) | ✅ 3/3 pre-existing | ✅ Written first; 6 tests collected, 6 FAILED (`UndefinedTable`) against running stack with no migration (RED confirmed) | ⏳ pending Phase 2 (T-06 migration) + Phase 3 (T-07 seed for sessions count) | ✅ 6 cases (a–f) — owner/non-owner × SELECT, non-owner INSERT, anon permission-denied, parent-scoped child reads | ➖ pending Phase 2 |
| T-04 Wire Vitest for supabase workspace | `supabase/vitest.config.ts`, `supabase/package.json`, `pnpm-workspace.yaml` | Test-support / config | N/A (new workspace) | ✅ `pnpm --filter supabase test` resolves, vitest v4.1.9 starts, exits 1 "No test files found" (workspace wired, RED for missing test) | ⏳ pending Phase 1 T-05 (test file created this same batch) then T-08 (impl) | ➖ "Triangulation skipped: purely structural config (vitest wiring)" | ➖ Prettier applied to all new non-Python files |
| T-05 seed-auth unit tests | `supabase/scripts/seed-auth.test.ts` | Unit (Vitest + vi.fn deps injection, no live stack) | N/A (new file) | ✅ Written first; vitest collects the file, FAILS at `import './seed-auth'` (module not found) — RED confirmed by execution | ⏳ pending Phase 3 (T-08 `seed-auth.ts`) | ✅ 5 cases (a–e): dry-run, missing URL, missing service key, normal path, idempotency guard — distinct code paths | ➖ pending Phase 3 (only meaningful once GREEN) |

**Vacuous-GREEN guard applied**: `test_no_fk_from_campaigns_user_id_to_auth_users`
initially passed trivially (0 FKs because no tables exist). A
`campaigns`-table-existence precondition was added so the assertion can only
pass once the migration has deliberately omitted the `auth.users` FK — turning
a vacuous pass into a meaningful RED until Phase 2.

### Test summary (this batch)

- **Total tests written**: 39 backend + 5 Vitest = 44
- **Total tests passing**: 0 (Phase 1 = RED by design; GREEN is Phase 2/3)
- **Backend tests collected/failed against running stack**: 39
  (32 schema FAILED + 1 fixed vacuous → now FAILED + 6 RLS FAILED)
- **Vitest tests collected/failed**: 1 file, 0 tests (import-time failure = RED)
- **Layers used**: Integration (2 files, 39 tests, skip-guarded), Unit (1 file, 5 tests, mock-injected)
- **Approval tests**: None — no refactoring tasks in Phase 1
- **Pure functions created**: 0 (tests only; production code is Phase 2/3)

## Deviations from design

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

## Issues found

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

## Remaining tasks

- [ ] **T-06** Create initial schema migration (Phase 2 — make schema tests GREEN)
- [ ] **T-07** Write `supabase/seed.sql` (Phase 3)
- [ ] **T-08** Write `supabase/scripts/seed-auth.ts` (Phase 3 — make Vitest GREEN)
- [ ] **T-09** Add `tsx` to root devDependencies (Phase 4)
- [ ] **T-10** Add `supabase:reset` + `supabase:seed-auth` scripts to root `package.json` (Phase 4)
- [ ] **T-11** Write `supabase/CLOUD.md` (Phase 4)
- [ ] **T-12** Fix `AGENTS.md`: "Next.js 15" → "Next.js 16" (Phase 4)
- [ ] **T-13** Run full local acceptance gate (Phase 5 — VERIFY)

## Verification commands run this batch

| Command | Result |
|---|---|
| `uv sync` (services/api) | Installed `psycopg==3.3.4`, `tzdata==2026.2` |
| `uv run python -c "import psycopg"` | `3.3.4` |
| `uv run pytest tests/` (pre-Phase-1 safety net) | `3 passed` |
| `uv run pytest tests/test_schema.py -v` | `32 failed, 1 passed(vacuous, then fixed → failed)` against live stack |
| `uv run pytest tests/test_rls.py -v` | `6 failed` (`UndefinedTable`) against live stack |
| `uv run pytest tests/test_schema.py tests/test_rls.py -q` (post-format) | `39 failed` (RED confirmed) |
| `uv run ruff check .` (services/api) | `All checks passed!` |
| `uv run ruff format tests/test_schema.py tests/test_rls.py` | `2 files reformatted` |
| `pnpm install` | scopes 3 workspace projects, vitest 4.1.9 installed into supabase |
| `pnpm --filter supabase test` (before T-05) | exit 1 "No test files found" (T-04 RED) |
| `pnpm --filter supabase test` (after T-05) | exit 1 "Cannot find module './seed-auth'" (T-05 RED) |
| `pnpm prettier --write` (non-Python new files) | reformatted `supabase/package.json`, `supabase/scripts/seed-auth.test.ts`, `supabase/vitest.config.ts`, `pnpm-workspace.yaml` |

## Status

5/13 tasks complete. Ready for next batch (Phase 2 — T-06 schema migration).