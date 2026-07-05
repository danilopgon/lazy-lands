# Block 6 — Campaign View — Apply Progress

## Status

- Current work unit: Work Unit 1 — Backend read paths
- Mode: Strict TDD
- Delivery strategy: single PR with accepted `size:exception`
- Progress: 9 / 85 tasks complete

## Completed Tasks

- [x] 1.1 Write failing tests for `CampaignRepository.list_campaigns` / `get_campaign` / `get_campaign_children`.
- [x] 1.2 Implement repository read methods on the port and Supabase repository.
- [x] 1.3 Write failing tests for `GetCampaigns` and `GetCampaignDetail`.
- [x] 1.4 Implement `GetCampaigns` and `GetCampaignDetail` use cases.
- [x] 1.5 Write failing tests for read response schemas.
- [x] 1.6 Implement `CampaignSummary`, `CampaignDetailResponse`, `NpcResponse`, `FactionResponse`, and `ArcResponse`.
- [x] 1.7 Write failing route tests for `GET /campaigns` and `GET /campaigns/{id}`.
- [x] 1.8 Implement read routes and `CampaignNotFoundError` 404 mapping.
- [x] 1.9 Run backend tests, lint, and mypy.

## TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|------------|-----|-------|-------------|----------|
| 1.1/1.2 | `tests/campaigns/test_repository.py` | Unit | ✅ 18/18 existing campaign tests passed before edits | ✅ Missing repository methods failed at collection/attribute level | ✅ `uv run pytest tests/campaigns/test_repository.py tests/campaigns/test_use_cases.py tests/campaigns/test_schema.py tests/campaigns/test_routes.py` → 24 passed | ✅ Covered list, single row, RLS-miss `None`, and child tuple with empty list path | ✅ Typed casts added; tests remained green |
| 1.3/1.4 | `tests/campaigns/test_use_cases.py` | Unit | ✅ 18/18 existing campaign tests passed before edits | ✅ Missing `get_campaigns` / `get_campaign_detail` modules failed at collection | ✅ Same focused pytest command → 24 passed | ✅ Covered ordered non-empty list, empty list, detail composition, and not-found branch | ✅ Response construction now explicitly hydrates child response schemas; tests remained green |
| 1.5/1.6 | `tests/campaigns/test_schema.py` | Unit | ✅ 18/18 existing campaign tests passed before edits | ✅ Missing response schema imports failed at collection | ✅ Same focused pytest command → 24 passed | ✅ Covered nullable summary/detail fields, entity counts, and child response nullability | ➖ None beyond type-clean response models |
| 1.7/1.8 | `tests/campaigns/test_routes.py` | Integration | ✅ 18/18 existing campaign tests passed before edits | ✅ New GET route tests failed before routes existed | ✅ Same focused pytest command → 24 passed | ✅ Covered 200 list, 200 empty, 401 unauthenticated, 200 detail with children, and two 404 paths | ✅ Broke long assertions into readable structures; route behavior unchanged |
| 1.9 | Backend command suite | Verification | ✅ Focused suite green before broad commands | ➖ Verification task, no new production behavior | ✅ `uv run pytest` → 184 passed, 1 skipped; `uv run ruff check app/` → passed; `uv run mypy app` → passed | ➖ Command gate only | ✅ Fixed initial `uv run mypy` invocation to target `app` |

## Tests / Commands Run

- `uv run pytest tests/campaigns/test_repository.py tests/campaigns/test_create_campaign.py tests/campaigns/test_routes_create.py` — 18 passed (safety net).
- `uv run pytest tests/campaigns/test_repository.py tests/campaigns/test_use_cases.py tests/campaigns/test_schema.py tests/campaigns/test_routes.py` — RED failed initially on missing read modules/schemas, then GREEN 24 passed.
- `uv run ruff check app/ tests/campaigns/test_repository.py tests/campaigns/test_use_cases.py tests/campaigns/test_schema.py tests/campaigns/test_routes.py` — passed after refactor.
- `uv run pytest` — 184 passed, 1 skipped.
- `uv run ruff check app/` — passed.
- `uv run mypy app` — passed.

## Deviations / Issues

- `CampaignSummary` / `CampaignDetailResponse` include nullable `system` and `tone` fields for the future WU3 migration, but the WU1 repository intentionally does not select those missing columns yet. They therefore serialize as `null` until WU3 adds and wires the columns.
- The list query selects count aliases through Supabase relationship counts and normalizes nested count rows if PostgREST returns them in embedded form.
- No migrations, write endpoints, Block 5 `composeRawText`, or arc enum changes were touched in WU1.

## Remaining Tasks

- Work Unit 2 — Frontend read paths + shared primitives.
- Work Unit 3 — Migrations + write paths.
- Work Unit 4 — Docs / ENV sweep.
