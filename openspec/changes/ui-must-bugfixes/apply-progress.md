# Apply Progress: ui-must-bugfixes — Group A / PR1 (#40 dashboard counts)

Status: DONE (all Group A tasks A1-A3 complete)

## Summary

Implemented live `session_count`/`memory_count` on `GET /campaigns` and wired
them into the dashboard `CampaignCard`, replacing the `'—'` placeholders.

## Backend

- `services/api/app/modules/campaigns/infrastructure/repository.py`
  - `list_campaigns()`: added `session_count:sessions(count)` to the select.
  - New `_active_memory_counts(campaign_ids)`: grouped `memory_facts` query
    (`.in_("campaign_id", ...).eq("status", "active")`), counted per campaign
    in Python. Skips the query entirely when `campaign_ids` is empty.
  - `_normalize_campaign_summary(row, memory_count=0)`: now also unwraps
    `session_count` and merges in `memory_count`.
- `services/api/app/modules/campaigns/application/read_models/campaign.py`
  - `CampaignSummary`: added `session_count: int = 0`, `memory_count: int = 0`.
- Tests updated/added:
  - `services/api/tests/campaigns/test_repository.py`: 3 new tests (session
    count + active-only memory count; `_normalize_campaign_summary` unwrap;
    skip query on empty campaign list) + `memory_facts` mocks added to the two
    pre-existing `list_campaigns` tests that would otherwise hit an unmocked
    call.
  - `services/api/tests/campaigns/test_routes.py`: `test_get_campaigns_returns_owned_campaigns_with_counts`
    updated with `session_count`/`memory_count` in mock + expected response.
  - `services/api/tests/campaigns/test_schema.py`: `CampaignSummary` fixture
    ripple fix (added `session_count=5, memory_count=4` to construction +
    expected `model_dump()`).

## Frontend

- `apps/web/lib/campaigns/schemas/reads.ts`: `campaignSummarySchema` — added
  `session_count: z.number()`, `memory_count: z.number()`.
- `apps/web/components/campaigns/campaign-card.tsx`: replaced the two `'—'`
  stat entries with `campaign.session_count` / `campaign.memory_count`;
  removed the stale "until Block 7" comment; stat order preserved (Sessions,
  NPCs, Factions, Memories, Arcs).
- Tests updated:
  - `apps/web/app/[locale]/dashboard/__tests__/page.test.tsx`: `buildCampaign`
    fixture now includes `session_count`/`memory_count`; replaced the old
    placeholder-dash test with two new tests — real counts render in correct
    stat order, and zero counts render as `"0"` not a dash.
  - `apps/web/tests/campaigns/api-reads.test.ts`: `VALID_SUMMARY` fixture
    ripple fix (added `session_count: 5, memory_count: 4`).

## Ripple audit (A1.5)

Grepped `apps/web` for `npc_count`/`faction_count`/`arc_count`. Only two
`CampaignSummary`-shaped fixtures found needing updates: `api-reads.test.ts`
(`VALID_SUMMARY`) and `page.test.tsx` (`buildCampaign`). No MSW handlers or
other fixtures found.

## Test results (final)

- Backend: `uv run pytest tests/campaigns/` → 88 passed, 2 pre-existing
  errors in `test_ownership.py` (`supabase_key is required` — missing local
  Supabase env creds, unrelated to this change; these are live-DB integration
  tests, not part of Group A scope).
- Backend lint: `uv run ruff check app/` → All checks passed.
- Frontend: `pnpm --filter web test` → 59 test files, 463 tests passed (full
  suite run; no regressions).
- Frontend typecheck: `pnpm --filter web typecheck` → clean, no errors.
- Frontend lint: `pnpm --filter web lint` → clean, no errors.

## Files changed (Group A only — no Group B files touched)

- `services/api/app/modules/campaigns/infrastructure/repository.py`
- `services/api/app/modules/campaigns/application/read_models/campaign.py`
- `services/api/tests/campaigns/test_repository.py`
- `services/api/tests/campaigns/test_routes.py`
- `services/api/tests/campaigns/test_schema.py`
- `apps/web/lib/campaigns/schemas/reads.ts`
- `apps/web/components/campaigns/campaign-card.tsx`
- `apps/web/app/[locale]/dashboard/__tests__/page.test.tsx`
- `apps/web/tests/campaigns/api-reads.test.ts`
- `openspec/changes/ui-must-bugfixes/tasks.md` (marked A1-A3 complete)

Note: this worktree had no `node_modules` installed; ran `pnpm install` at
repo root (dev-dependency install only, no source files touched) before
frontend tests would run.

## Not committed

Per instructions, no `git commit`/`push` was run. All changes remain in the
working tree for the orchestrator to review, run suites, commit, and open
PR1.
