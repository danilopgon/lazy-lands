# Block 6 — Campaign View — Apply Progress

## Status

- Current work unit: Work Unit 1.5 — Backend campaigns module architecture refactor
  (including the owner-approved dependency-rule-fix + errors-layer-separation follow-up)
- Mode: Strict TDD (WU1.5 is a behavior-preserving mechanical refactor — no new
  tests written; existing suite is the safety net, per owner-locked plan)
- Delivery strategy: single PR with accepted `size:exception`
- Progress: 23 / 99 tasks complete (WU1: 9 + WU1.5: 7 + WU1.5 follow-up: 7) + PR #28
  review-fix pass applied

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
| PR #28 review fixes | `tests/campaigns/test_repository.py`, `tests/campaigns/test_use_cases.py`, `tests/campaigns/test_routes.py` | Unit + integration | ✅ 24/24 focused campaign read tests passed before edits | ✅ New tests failed for malformed campaign ids, empty count-list normalization, system/tone select fields, and unauthenticated detail access | ✅ Focused campaign suite → 29 passed; full backend suite → 187 passed, 1 skipped | ✅ Covered `unknown` and `undefined`, list + detail select contracts, and count aliases as `[]` | ✅ Ruff format/check, Ruff lint, and mypy all green |

## Tests / Commands Run

- `uv run pytest tests/campaigns/test_repository.py tests/campaigns/test_create_campaign.py tests/campaigns/test_routes_create.py` — 18 passed (safety net).
- `uv run pytest tests/campaigns/test_repository.py tests/campaigns/test_use_cases.py tests/campaigns/test_schema.py tests/campaigns/test_routes.py` — RED failed initially on missing read modules/schemas, then GREEN 24 passed.
- `uv run ruff check app/ tests/campaigns/test_repository.py tests/campaigns/test_use_cases.py tests/campaigns/test_schema.py tests/campaigns/test_routes.py` — passed after refactor.
- `uv run pytest` — 184 passed, 1 skipped.
- `uv run ruff check app/` — passed.
- `uv run mypy app` — passed.

## Deviations / Issues

- `CampaignSummary` / `CampaignDetailResponse` include nullable `system` and `tone` fields for the future WU3 migration. The repository now selects those fields for list/detail responses to match the frontend read contract; they serialize as `null` for rows without structured values.
- The list query selects count aliases through Supabase relationship counts and normalizes nested count rows if PostgREST returns them in embedded form.
- PR #28 review fixes added a UUID guard before campaign-detail repository access so malformed ids such as `unknown` / `undefined` return the uniform 404 instead of reaching Supabase uuid equality.
- PR #28 OpenSpec/docs corrections aligned routes to the actual backend paths (no `/api` prefix), flat create routes with `campaign_id` in request bodies, no edit-time `content_source` restamp, non-empty `tone`, Modal focus/ARIA requirements, and existing root `.env.example` audit-only language.
- No migrations, write endpoints, Block 5 `composeRawText`, or arc enum changes were touched in WU1.

## Work Unit 1.5 — Backend campaigns module architecture refactor (mechanical, no behavior change)

- [x] 1.5.1 Split `application/` into `application/queries/` (`get_campaigns.py`,
      `get_campaign_detail.py`) and `application/commands/` (`create_campaign.py`,
      `extract_campaign.py`).
- [x] 1.5.2 Split flat `schemas.py` into `api/schemas/{campaign,npc,faction,arc}/
      {requests,responses}.py` and `application/contracts.py` (LLM-extraction
      models). `ExtractRequest` placed in `api/schemas/campaign/requests.py`
      (judgment call, logged below).
- [x] 1.5.3 Added `api/dependencies.py` (Depends providers per handler); moved
      `routes.py` → `api/routes.py`; rewired every route to receive its
      query/command handler via `Depends` instead of constructing
      `SupabaseCampaignRepository` inline.
- [x] 1.5.4 Removed `domain/models.py` compatibility barrel; repointed
      `infrastructure/repository.py` and `domain/ports.py` to `domain/enums.py` /
      `api/schemas/*` directly.
- [x] 1.5.5 Updated import paths across all `tests/campaigns/*.py`; no assertions or
      test logic changed.
- [x] 1.5.6 Gates: `uv run pytest` → 189 passed, 1 skipped (baseline-identical);
      `uv run ruff format --check app/ tests/` → pass; `uv run ruff check app/ tests/`
      → pass; `uv run mypy app` → pass.
- [x] 1.5.7 Docs aligned: `design.md` §Decision 4 preamble, `tasks.md` (this WU1.5
      section + WU3 layout note), `apply-progress.md` (this entry).

### Judgment call

`ExtractRequest` was placed in `api/schemas/campaign/requests.py` rather than
`application/contracts.py`. Rationale: it is a pure HTTP input DTO (single
`raw_text` field enforcing the trust boundary at the route), with no LLM-contract
semantics of its own — unlike `ExtractCampaignOutput`, which the LLM provider's
`complete_json` call validates against directly. Keeping it beside
`CreateCampaignRequest` in `api/schemas/campaign/requests.py` matches its sibling
DTO's placement and keeps `application/contracts.py` scoped strictly to the
extraction *output* contract.

### Coupling flagged in the first WU1.5 pass — RESOLVED in the follow-up pass below

`application/{queries,commands}/*.py` and `domain/ports.py` were importing HTTP DTOs
(`CreateCampaignRequest`, `CampaignSummary`, `CampaignDetailResponse`, `NpcResponse`,
`FactionResponse`, `ArcResponse`) from `api/schemas/` — the application layer and the
`CampaignRepository` Protocol depended on the outer HTTP layer, backwards from strict Clean
Architecture. This predated WU1.5 (the same use cases imported directly from the flat
`schemas.py` before) and the first WU1.5 pass only relocated the import paths without fixing the
direction. The owner approved extending WU1.5 to fix it — see "WU1.5 follow-up" below. **This
coupling is now RESOLVED**: `domain/ports.py` and `application/{queries,commands}` have zero
`api` imports (verified by `grep -rn "campaigns.api" app/modules/campaigns/domain
app/modules/campaigns/application` returning empty).

## WU1.5 follow-up — dependency-rule fix + errors layer separation (owner-approved extension)

Same branch (`refactor/block-6-campaign-view-wu1.5`), same behavior-unchanged/existing-suite-as-
safety-net contract as the rest of WU1.5.

- [x] 1.5.8 `domain/ports.py`: `CampaignRepository`'s write methods now take domain entities
      (`NPC`, `Faction`) / a new domain type `NewArc` (an arc without `status` — status is
      always repository-assigned per CP-003, never client- or LLM-supplied) and plain scalars
      (`insert_campaign(user_id, title, description, world_state)`), never `Create*Request`
      DTOs. `infrastructure/repository.py` signatures updated to match; method bodies are
      otherwise unchanged (the domain entities have the exact same field names as the DTOs they
      replaced, so the row-building code didn't need to change).
- [x] 1.5.9 `application/commands/create_campaign.py`: added `CreateCampaignCommand` (frozen
      dataclass: `title: str`, `description: str`, `world_state: str`, `npcs: list[NPC]`,
      `factions: list[Faction]`, `arcs: list[NewArc]`) as the command's input type.
      `api/routes.py::_to_create_campaign_command(payload)` maps `CreateCampaignRequest` (and
      its nested `Create{Npc,Faction,Arc}Request` lists) into it — the one place the api layer
      performs the request → domain/command-DTO translation, so `application` never imports
      `api`.
- [x] 1.5.10 Moved the query read models (`CampaignSummary`, `CampaignDetailResponse`,
      `NpcResponse`, `FactionResponse`, `ArcResponse`) from `api/schemas/*/responses.py` into
      `application/read_models/{campaign,npc,faction,arc}.py`. Deleted the now-empty
      `api/schemas/{npc,faction,arc}/responses.py`. `api/schemas/campaign/responses.py` keeps
      only `CreateCampaignResponse` (judgment call, logged below). `application/queries/*.py`
      and `api/routes.py` (for FastAPI `response_model=`) import from `application/read_models/`.
- [x] 1.5.11 Split module-root `errors.py` (mixed exception classes + FastAPI handlers):
      `CampaignNotFoundError`/`CampaignPersistenceError` → `application/errors.py`; the
      `async def ..._handler(...) -> JSONResponse` functions → `api/exception_handlers.py`,
      registered from there in `app/main.py`. Deleted `app/modules/campaigns/errors.py`.
      `infrastructure/errors.py` (`RepositoryError`) untouched — it's an adapter/port failure,
      not an application outcome or a presentation concern, so it doesn't belong in either half
      of this split.
- [x] 1.5.12 Updated `tests/campaigns/{test_repository,test_create_campaign,test_ownership,
      test_schema,test_use_cases}.py` import paths / test-data construction (domain entities and
      `CreateCampaignCommand` instead of `Create*Request` DTOs where the port/command signature
      changed; read models and error classes from their new modules) — no assertions changed.
- [x] 1.5.13 Gates: `uv run pytest` → 189 passed, 1 skipped (unchanged); `uv run ruff format
      --check app/ tests/` → pass; `uv run ruff check app/ tests/` → pass; `uv run mypy app` →
      pass. Acceptance greps: `grep -rn "campaigns.api" app/modules/campaigns/domain
      app/modules/campaigns/application` → empty; no `fastapi`/`JSONResponse` import in
      `domain/`/`application/` (a naive grep for the literal substring `Request` false-positived
      on the docstring phrase "Create*Request DTOs" in `create_campaign.py` — confirmed with a
      precise `^from fastapi|^import fastapi|JSONResponse` grep that this is not an actual
      import); `app/modules/campaigns/errors.py` no longer exists.
- [x] 1.5.14 Docs: this entry, `design.md` §Decision 4 (full final tree + binding **Layering /
      dependency-direction rules** subsection), `tasks.md` (WU1.5 follow-up section + updated
      WU3 layout note), `docs/04-architecture.md` (campaigns tree), `docs/adrs/
      ADR-05-modular-monolith-hexagonal.md` (extended "Refined" note).

### Judgment calls (WU1.5 follow-up)

- **`CreateCampaignResponse`** stays in `api/schemas/campaign/responses.py` rather than moving to
  `application/`. Rationale: it is a pure presentation wrapper (`{"id": str}`) around the
  command's raw `str` return value — there is no application-side consumer of this shape, unlike
  the query read models which the query handlers construct and return directly. Requests and this
  one response DTO are the only things left in `api/schemas/`.
- **`NewArc` lives in `domain/arc.py`**, not an application-layer DTO, even though its fields
  diverge from the persisted `Arc` entity (no `status`). Rationale: "an arc pending its
  persistence-assigned status" is a domain-shaped concept (CP-003's rule — status is never
  client/LLM-supplied — is a domain/business rule, not an HTTP-boundary concern), and keeping it
  in `domain/` lets `domain/ports.py` depend on `domain/` exclusively with zero application
  imports, which is the stricter/preferred direction.
- **`NPC` and `Faction` domain entities are reused directly** (no new command DTOs needed) for
  `insert_npcs`/`insert_factions` and `CreateCampaignCommand.npcs`/`.factions` — their fields are
  an exact match with the former `CreateNpcRequest`/`CreateFactionRequest` DTOs (this was these
  two entities' first real usage anywhere in the codebase; previously `domain/{npc,faction}.py`
  were defined and exported but never instantiated on the write path — see design.md's original
  Decision 1 constraint-check note "frozen domain models not in write path").

## Remaining Tasks

- Work Unit 2 — Frontend read paths + shared primitives.
- Work Unit 3 — Migrations + write paths.
- Work Unit 4 — Docs / ENV sweep.
