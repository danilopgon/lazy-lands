# Block 6 — Campaign View — Tasks

Strict TDD active. Every implementation task is preceded by its failing-test task
(red → green). Quality gates apply per task: backend `uv run pytest` +
`uv run ruff check app/` + `mypy` (from `services/api/`); frontend `pnpm test` +
`tsc --noEmit` + `eslint` + `prettier`.

Skills loaded: `work-unit-commits` (commit-as-work-unit), `frontend-handoff-contract`
(handoff-first for all UI tasks).

⚠ = touches shipped Block-5 surface (create path, arc enum, repository). Apply with
extra care — these are the highest-risk edits in the change.

---

## Review Workload Forecast

- **Estimated changed lines:** ~1,900–2,300 (backend routes/schemas/repo/use-cases +
  2 migrations + frontend primitives + 4 screens + 4 modals + docs sweep). This is well
  above the 400-line single-PR guideline.
- **Chained PRs recommended: No.** Delivery strategy is `single-pr` with
  `size:exception` already accepted by the product owner (proposal amendment A8). Do
  not re-ask about splitting.
- **400-line budget risk: High**, explicitly accepted via `size:exception`.
- **Decision needed before apply: No** — slicing, order, and exception are pre-settled.
- **Work-unit ordering confirmed for apply-progress continuity:** Work Unit 1 (backend
  reads) → Work Unit 2 (frontend reads + primitives) → Work Unit 3 (migrations +
  writes, itself sliced into 3A/3B/3C/3D sub-units) → Work Unit 4 (docs/ENV sweep).
  Each work unit is independently green (`uv run pytest`, `pnpm test`) before the next
  starts. `sdd-apply` should persist `apply-progress` after each work unit (and after
  each 3x sub-unit) so batches can resume safely.

---

## Work Unit 1 — Backend read paths

Commit message: `feat(campaigns): add campaign list/detail read endpoints with npc/faction/arc children`

- [x] 1.1 Write failing tests for `CampaignRepository.list_campaigns` / `get_campaign` /
      `get_campaign_children` (returns `(npcs, factions, arcs)` tuple; empty campaign →
      empty lists) in `services/api/tests/campaigns/test_repository.py`.
- [x] 1.2 Implement `list_campaigns`, `get_campaign`, `get_campaign_children` on
      `domain/ports.py::CampaignRepository` Protocol and
      `infrastructure/repository.py::SupabaseCampaignRepository` (spec: campaign-view
      "List owned campaigns", "Read campaign detail with children"; design §4.1, §4.3).
- [x] 1.3 Write failing tests for `GetCampaigns` and `GetCampaignDetail` use cases
      (mock the Protocol): list returns rows ordered by `updated_at desc`; detail
      composes campaign + npcs + factions + arcs, raises `CampaignNotFoundError` on
      `None` campaign — in `services/api/tests/campaigns/test_use_cases.py` (or
      module-appropriate test file).
- [x] 1.4 Implement `application/get_campaigns.py::GetCampaigns` and
      `application/get_campaign_detail.py::GetCampaignDetail` (design §4.2).
- [x] 1.5 Write failing tests for response schemas `CampaignSummary`,
      `CampaignDetailResponse`, `NpcResponse`, `FactionResponse`, `ArcResponse`
      (field presence, nullability) in `services/api/tests/campaigns/test_schema.py`.
- [x] 1.6 Implement schemas in `services/api/app/modules/campaigns/schemas.py`
      (design §4.4) — `CampaignSummary` gets `system`/`tone` fields now (values will be
      `None` until Migration A lands in Work Unit 3; do not block schema shape on the
      migration).
- [x] 1.7 Write failing route tests (FastAPI `TestClient`, dependency overrides) for
      `GET /campaigns` (200 list, 200 empty, 401 unauthenticated) and
      `GET /campaigns/{id}` (200 with children, 401 unauthenticated, 404 non-owner,
      404 unknown/malformed id before Supabase uuid equality) in
      `services/api/tests/campaigns/test_routes.py`.
- [x] 1.8 Implement `GET ""` and `GET "/{campaign_id}"` on the existing
      `router = APIRouter(prefix="/campaigns")` in `routes.py` (design §4.5); register
      `CampaignNotFoundError` → 404 handler in `app/main.py` if not already present
      (design §Decision 3).
- [x] 1.9 Run `uv run pytest`, `uv run ruff check app/`, `mypy` from `services/api/` —
      confirm green before starting Work Unit 2.

---

## Work Unit 1.5 — Backend campaigns module architecture refactor (mechanical, no behavior change)

Commit message(s): `refactor(campaigns): split application into queries/commands` /
`refactor(campaigns): split schemas into api/schemas and application/contracts` /
`refactor(campaigns): inject query/command handlers via Depends` /
`refactor(campaigns): remove domain/models.py compatibility barrel` /
`docs: align block-6 design/tasks with the WU1.5 module layout`

Owner-locked plan (see design §Decision 4 preamble). Behavior unchanged; the existing
test suite (green before and after) is the safety net — no new tests written, no
assertions changed except import-path-only adjustments forced by the file moves.

- [x] 1.5.1 Split `application/` into `application/queries/` (`get_campaigns.py`,
      `get_campaign_detail.py`) and `application/commands/` (`create_campaign.py`,
      `extract_campaign.py`); update all importers.
- [x] 1.5.2 Split the flat `schemas.py` into `api/schemas/{campaign,npc,faction,arc}/
      {requests,responses}.py` (HTTP DTOs) and `application/contracts.py`
      (LLM-extraction models: `ScribeExtractedModel`, `Extracted*`,
      `ExtractCampaignOutput`); `ExtractRequest` placed in
      `api/schemas/campaign/requests.py` (judgment call — pure HTTP input DTO, no LLM
      contract semantics).
- [x] 1.5.3 Add `api/dependencies.py` with one `Depends` provider per handler
      (`provide_get_campaigns`, `provide_get_campaign_detail`,
      `provide_create_campaign`, `provide_extract_campaign`, `get_llm_provider`); move
      `routes.py` → `api/routes.py` and rewire every route body to receive its handler
      via `Depends` instead of constructing `SupabaseCampaignRepository`/use cases
      inline.
- [x] 1.5.4 Remove the `domain/models.py` compatibility barrel; repoint every importer
      (`infrastructure/repository.py`, `domain/ports.py`, tests) to `domain/__init__.py`
      or the concrete `domain/{arc,campaign,faction,npc,enums}.py` modules.
- [x] 1.5.5 Update test import paths only (never assertions/logic) across
      `tests/campaigns/*.py`; the one behavior-preserving exception is
      `test_routes_extract.py::test_statelessness_no_db_writes_on_any_path`, whose
      monkeypatch target moved from `routes_module.SupabaseCampaignRepository` to
      `api.dependencies.SupabaseCampaignRepository` (the class reference moved with the
      Depends refactor; the assertion itself — extract must never construct a
      repository — is unchanged).
- [x] 1.5.6 Run `uv run pytest`, `uv run ruff format --check app/ tests/`,
      `uv run ruff check app/ tests/`, `uv run mypy app` from `services/api/` — confirm
      189 passed / 1 skipped (same as pre-refactor baseline) and all gates green.
- [x] 1.5.7 Align docs: `design.md` §Decision 4 (this file's WU1.5 preamble),
      `tasks.md` (this section), `apply-progress.md` (WU1.5 entry) — done as part of
      this work unit, not deferred to Work Unit 4.

---

## Work Unit 2 — Frontend read paths + shared primitives

Commit message: `feat(web): add Field/Modal primitives and campaign list/detail read screens`

### 2.1 Shared primitives (built first, per handoff-first contract)

- [ ] 2.1.1 Read `handoff/app/ui.jsx` (`Field`, `Modal`) and extract the Phase 1
      checklist per `frontend-handoff-contract` skill (label, optional marker,
      help/error mutual exclusivity for `Field`; title/close/body/footer/Escape/
      backdrop-click/focus-trap/return-focus for `Modal`).
- [ ] 2.1.2 Write failing tests for `components/ui/field.tsx`: renders help text when
      no error; error supersedes help; `aria-describedby` wired; error has
      `role="alert"` (entity-management spec: "Reusable Field primitive").
- [ ] 2.1.3 Implement `components/ui/field.tsx` (design §5.3).
- [ ] 2.1.4 Write failing tests for `components/ui/modal.tsx`: closes on Escape;
      closes on backdrop mousedown, not on inner click; focus traps and returns to
      trigger on close; `role="dialog"` + `aria-modal` + `aria-labelledby`
      (entity-management spec: "Reusable Modal primitive"; design §5.3 a11y list).
- [ ] 2.1.5 Implement `components/ui/modal.tsx` (hand-rolled, no Radix; design §5.3).
- [ ] 2.1.6 Adversarial self-review: `Field`/`Modal` against `handoff/app/ui.jsx` —
      Handoff Compliance Report per skill contract.

### 2.2 API client + schemas

- [ ] 2.2.1 Write failing tests for `getCampaigns`, `getCampaignDetail(id)` in
      `lib/campaigns/api.ts` tests: ok-path Zod parse, non-ok throws
      `CampaignApiError`, 404 surfaced distinctly.
- [ ] 2.2.2 Implement `getCampaigns`, `getCampaignDetail` + Zod schemas under
      `lib/campaigns/schemas/` (design §5.1).

### 2.3 `/dashboard` list screen

- [ ] 2.3.1 Read `handoff/app/views-dashboard.jsx` + `route-map.md`; extract the full
      Phase 1 checklist (breadcrumb, header, search, `CampaignCard` fields incl.
      deferred stat columns, states: loading/error/empty/empty-search/success, motion)
      per campaign-view spec "Dashboard campaign list screen".
- [ ] 2.3.2 Write failing component tests for `app/dashboard/page.tsx` +
      `CampaignList`/`CampaignCard`: loading → `Loading`; error → `ErrorNotice` with
      retry; empty → `EmptyState` with create CTA; empty-search state; success renders
      cards with title/system/tone; client-side search filters and updates
      "{shown} of {total}" helper text.
- [ ] 2.3.3 Implement `app/dashboard/page.tsx` (container) + `CampaignList`/
      `CampaignCard` (presentational), replacing the placeholder (design §5.2). Card
      shows title, system+tone line, "Updated {date}" footer, "Open chronicle →" link;
      full card clickable. Omit (do not fabricate) the status pill and
      Sessions/Memories stat columns per spec; NPCs/Factions/Open-arcs columns render
      live only if `GET /campaigns` list data includes counts — otherwise omit and
      flag in self-review (this is a spec-flagged decision point, not a silent cut).
- [ ] 2.3.4 Adversarial self-review: dashboard vs `views-dashboard.jsx` — full
      Handoff Compliance Report (states enumerated individually, motion checked).

### 2.4 `/campaigns/:id` detail screen

- [ ] 2.4.1 Read `handoff/app/views-detail.jsx`; extract Phase 1 checklist (breadcrumb,
      header w/ system/tone kicker, deferred header buttons, stat bar w/ deferred
      Memory metric, world-state view/edit, deferred `ScribeNotice`/sessions/memories
      placeholders, live arcs-needing-attention section, states) per campaign-view
      spec "Campaign detail screen".
- [ ] 2.4.2 Write failing component tests for `app/campaigns/[id]/page.tsx` +
      `CampaignDetailView`: loading, error+retry, not-found (404), success (system/
      tone/world-state/stat-bar/arcs render, dimmed placeholders present and NOT
      data-bound), world-state states (editing/save-success/save-error with draft
      preserved).
- [ ] 2.4.3 Implement `app/campaigns/[id]/page.tsx` (container) +
      `CampaignDetailView` + `WorldStateEditor` (view-only for now — PATCH wiring
      lands in Work Unit 3; render Save/Cancel as present but the mutation call itself
      is added in 3.3). Render dimmed static "coming in a later chapter" placeholder
      cards for `/02 Recent sessions` and `/04 Active memories` (do not fetch/bind).
      Render `/03 Arcs needing attention` live, filtered client-side to
      `status in (active, dormant)`, max 3, with "All arcs →" link to
      `/campaigns/:id/arcs`. Stat bar NPCs/Factions/Arcs metrics link to their list
      routes; Memory metric omitted/non-interactive placeholder.
- [ ] 2.4.4 Adversarial self-review: detail vs `views-detail.jsx` — full Handoff
      Compliance Report, explicitly listing every deferred element and why (system/
      tone kicker, header buttons, Memory metric, ScribeNotice, sessions/memories
      placeholders).

### 2.5 NPC / Faction / Arc list screens (read-only rendering; CRUD actions wired in Work Unit 3)

- [ ] 2.5.1 Read `handoff/app/views-entities.jsx` (NPCs, Factions) and
      `handoff/app/views-arcs.jsx` (Arcs); extract Phase 1 checklists per campaign-view
      spec "NPC list screen", "Faction list screen", "Arc list screen (NEW)" —
      including each screen's explicitly deferred/omitted columns.
- [ ] 2.5.2 Write failing component tests for `app/campaigns/[id]/npcs/page.tsx` +
      `NpcList`/`NpcRow`: loading, error+retry, empty (`EmptyState` + "+ Add your
      first NPC"), success renders name/status-pill/`OriginBadge`/description/
      motivation, no fabricated `relation`/`faction`/`sessions` columns.
- [ ] 2.5.3 Implement `app/campaigns/[id]/npcs/page.tsx` (container, slices detail
      query) + `NpcList`/`NpcRow` (presentational). "+ New NPC"/"Edit"/"Delete"
      controls render but are wired to modals in Work Unit 3.
- [ ] 2.5.4 Write failing component tests for `app/campaigns/[id]/factions/page.tsx` +
      `FactionList`/`FactionRow`: loading, error+retry, empty (`EmptyState` + "+ Add
      a faction"), success renders name/posture-color/`OriginBadge`/description/
      objective, no fabricated `influence`/`npcs`/`arcs`/`lastReaction` columns.
- [ ] 2.5.5 Implement `app/campaigns/[id]/factions/page.tsx` + `FactionList`/
      `FactionRow`.
- [ ] 2.5.6 Write failing component tests for `app/campaigns/[id]/arcs/page.tsx` +
      `ArcList`/`ArcRow`: loading, error+retry, empty (`EmptyState` orn "↝" + "+ Add
      an arc"), success renders title/status-pill/priority-flag/`OriginBadge`/
      description, resolved/discarded rows render at reduced opacity, no fabricated
      `npcs`/`factions`/`lastSession`/"include in generation" fields.
- [ ] 2.5.7 Implement `app/campaigns/[id]/arcs/page.tsx` + `ArcList`/`ArcRow`
      (design §5.2, §7).
- [ ] 2.5.8 Adversarial self-review per screen (NPCs, Factions, Arcs) against their
      handoff files — three separate Handoff Compliance Reports. Explicitly flag in
      each report: (a) faction inline `PostureSelect` NOT implemented as a separate
      write path (deferred to edit Modal, Work Unit 3); (b) arc inline
      Resolve/Discard/Reopen NOT implemented as separate write paths (deferred to
      edit Modal, Work Unit 3) — these are spec-mandated deviations, not gaps to fix
      here.
- [ ] 2.5.9 Run `pnpm test`, `tsc --noEmit`, `eslint`, `prettier --check` — confirm
      green before starting Work Unit 3.

---

## Work Unit 3 — Migrations + write paths

This unit is the risk-bearing core (touches shipped Block-5 create path and the arc
enum). Sub-slice 3A/3B/3C/3D internally but keep them in the same work unit per design
§9's "Migration B + its code touchpoints as one atomic work-unit" and §10 guidance —
do not let a batch boundary land mid-migration.

**Post-WU1.5 layout note:** the new `npcs_router`/`factions_router`/`arcs_router` (3C)
and their schemas land under `api/` — routes in `api/routes.py` (or a split
`api/routes/` package, implementer's discretion) and schemas in
`api/schemas/{npc,faction,arc}/{requests,responses}.py`, following the WU1.5 layout
rather than the pre-refactor flat `routes.py`/`schemas.py`. New use cases go under
`application/queries/` (reads) or `application/commands/` (writes) per their nature.

### 3A — Migration A: campaign `system`/`tone` ⚠

Commit message: `feat(campaigns): persist system/tone on campaigns without changing extraction fold`

- [ ] 3A.1 ⚠ Write the **golden fold test first**: assert `composeRawText` output for a
      fixed input is byte-identical to its pre-change output (frontend test, e.g.
      `apps/web/app/campaigns/new/__tests__/composeRawText.test.ts` or existing test
      file). This test MUST pass unmodified after 3A.5 — it is the Block-5 regression
      guard (design §8.2, risk #1).
- [ ] 3A.2 Write migration file
      `supabase/migrations/<timestamp>_add_campaign_system_tone.sql`:
      `alter table campaigns add column system text; add column tone text;`
      (additive, nullable, no backfill — design §8.1).
- [ ] 3A.3 ⚠ Write failing backend test: `CreateCampaignRequest` accepts `system`
      (required, ≤200) and `tone` (optional, ≤200); `insert_campaign` writes both keys
      into the insert dict without altering the returned `id` or existing extraction
      test assertions (`test_routes_extract.py`, `test_extract_campaign.py` must stay
      green and unmodified — pin this explicitly).
- [ ] 3A.4 ⚠ Implement: add `system`/`tone` fields to
      `schemas.py::CreateCampaignRequest`; add `"system": data.system, "tone":
      data.tone` to the insert dict in `repository.py::insert_campaign` (lines
      ~29–50). Do not touch `composeRawText` or the extract request body shape.
- [ ] 3A.5 Frontend: thread `system`/`tone` through the create draft path —
      `saveExtractionDraft` payload carries them (form already captures them);
      `/campaigns/new/review` includes them in the `POST /campaigns` body. Agree
      `max_length` (≤200) on the `/campaigns/new` Zod schema to match the API bound
      (design §8.2 consistency note, risk #8).
- [ ] 3A.6 Re-run the golden fold test (3A.1) — MUST still pass unmodified. Run the
      full Block-5 extraction suite — MUST be green and unmodified.
- [ ] 3A.7 Now that `system`/`tone` persist, write failing tests + implement:
      `GET /campaigns/{id}` returns populated `system`/`tone` for a campaign that
      has them (campaign-view spec: "Persist and edit campaign system and tone" read
      scenario). Update `CampaignDetailResponse` usage if needed (schema already
      declared in Work Unit 1.6).

### 3B — Migration B: `arc_status` enum reconciliation ⚠ (all 8 touchpoints atomically)

Commit message: `feat(campaigns): reconcile arc_status enum to active/dormant/resolved/discarded`

- [ ] 3B.1 Write migration file
      `supabase/migrations/<timestamp>_reconcile_arc_status.sql`:
      `alter type arc_status rename value 'open' to 'active'; rename value 'dropped'
      to 'discarded'; add value if not exists 'dormant';` (design §9.1 — rename
      backfills implicitly, no `UPDATE` needed).
- [ ] 3B.2 ⚠ Update failing/existing test `test_repository.py:86,97` to assert
      `status == "active"` (was `"open"`) — touchpoint #6.
- [ ] 3B.3 ⚠ Update failing/existing test `test_schema.py:35` to assert enum set
      `{"active","dormant","resolved","discarded"}` — touchpoint #7.
- [ ] 3B.4 ⚠ Implement `domain/enums.py::ArcStatus` members →
      `active/dormant/resolved/discarded` (drop `open`/`dropped`) — touchpoint #2.
- [ ] 3B.5 ⚠ Implement `infrastructure/repository.py:98` (`insert_arcs` default)
      `ArcStatus.open.value` → `ArcStatus.active.value` — touchpoint #3.
- [ ] 3B.6 ⚠ Confirm `domain/arc.py::Arc.status` typing is unchanged (still
      `ArcStatus`) — touchpoint #8, verification only, no code change expected.
- [ ] 3B.7 Run `uv run pytest` — confirm all arc-status references are consistent
      (no leftover `open`/`dropped` string anywhere in `services/api/app`) and the
      full suite is green before proceeding to 3C.

### 3C — Full CRUD write paths: campaign PATCH + npc/faction/arc create/update/delete

Commit message: `feat(campaigns): add create/update/delete for npcs, factions, arcs and campaign system/tone/world_state PATCH`

- [ ] 3C.1 Write failing tests for `UpdateCampaignRequest` (partial: `world_state?`,
      `system?`, `tone?`; empty → 422) and `update_campaign` repo method (`None` on
      RLS miss) per entity-management spec "Overwrite campaign world state, system,
      and tone".
- [ ] 3C.2 Implement `UpdateCampaignRequest` (design §Decision 2), `update_campaign`
      port + repo method (design §4.1/§4.3), `application/update_campaign.py`, and
      `PATCH /campaigns/{id}` route.
- [ ] 3C.3 ⚠ Write failing tests for the **create ownership pre-check** (design §6.4,
      risk #2 — load-bearing): a forged/non-owned `campaign_id` on
      `POST /npcs` with `campaign_id` in the body (and factions, arcs) returns 404 via the pre-check
      path, NOT a 500 from an uncaught `42501` RLS raise. This is the single most
      important security test in this unit — write it before any create use case
      exists.
- [ ] 3C.4 Write failing tests for `create_npc`/`create_faction`/`create_arc` repo
      methods (insert returns the row; forged parent raises, backstopped) and
      `CreateNpc`/`CreateFaction`/`CreateArc` use cases (pre-check via
      `get_campaign`, force `content_source=manual`, arc defaults `status=active`)
      per entity-management spec "Create, edit, and delete NPCs/factions/arcs".
- [ ] 3C.5 Implement `CreateNpcInput`/`CreateFactionInput`/`CreateArcInput` schemas
      (design §4.4), `create_npc`/`create_faction`/`create_arc` port + repo methods,
      `application/create_npc.py`/`create_faction.py`/`create_arc.py` (with the 6.4
      pre-check), and `POST ""` routes on `npcs_router`/`factions_router`/
      `arcs_router` (design §4.5) — including validation that arc `priority`/`status`
      reject invalid codes with 422.
- [ ] 3C.6 Write failing tests for `update_npc`/`update_faction`/`update_arc` use
      cases (partial PATCH, no `content_source` restamp on edit, empty→422, 404 on
      repo `None`) and repo methods.
- [ ] 3C.7 Implement `UpdateNpcRequest`/`UpdateFactionRequest`/`UpdateArcRequest`
      schemas, `update_npc`/`update_faction`/`update_arc` port + repo methods,
      `application/update_npc.py`/`update_faction.py`/`update_arc.py`, and
      `PATCH "/{id}"` routes on the three entity routers.
- [ ] 3C.8 ⚠ Write failing tests pinning `.delete().execute()` returns the deleted
      rows so `data == []` → 404 holds (design §7, risk #4) — for
      `delete_npc`/`delete_faction`/`delete_arc`.
- [ ] 3C.9 Implement `delete_npc`/`delete_faction`/`delete_arc` port + repo methods
      (bool return), `application/delete_npc.py`/`delete_faction.py`/`delete_arc.py`
      (`False` → 404), and `DELETE "/{id}"` routes on the three entity routers.
- [ ] 3C.10 Write failing route-level tests (FastAPI `TestClient`) covering the full
      201/200/204/404/422 matrix for `PATCH /campaigns/{id}`, and
      POST/PATCH/DELETE on `/npcs`, `/factions`, `/arcs` (entity-management spec
      scenarios, one test per scenario).
- [ ] 3C.11 Register `npcs_router`, `factions_router`, `arcs_router` in
      `app/main.py` (design §4.5) if not already wired from earlier steps.
- [ ] 3C.12 Run `uv run pytest`, `uv run ruff check app/`, `mypy` — confirm green.

### 3D — Frontend write paths: mutations, modals, world-state editor wiring

Commit message: `feat(web): wire campaign/npc/faction/arc create-edit-delete modals and world-state editing`

- [ ] 3D.1 Write failing API-client tests for `updateCampaign`, `createNpc`/
      `updateNpc`/`deleteNpc`, `createFaction`/`updateFaction`/`deleteFaction`,
      `createArc`/`updateArc`/`deleteArc` in `lib/campaigns/api.ts` (ok-path Zod
      parse, non-ok throws `CampaignApiError`).
- [ ] 3D.2 Implement the mutation functions in `lib/campaigns/api.ts` + Zod schemas.
- [ ] 3D.3 Write failing tests for `WorldStateEditor`: edit toggles textarea +
      autofocus; Save calls `updateCampaign`; success returns to display mode with
      updated text; error keeps textarea open with unsaved draft intact; Cancel
      discards.
- [ ] 3D.4 Wire `WorldStateEditor` to the `updateCampaign` mutation (`useMutation` +
      `invalidateQueries(['campaign', id])`) in `app/campaigns/[id]/page.tsx`.
- [ ] 3D.5 Read `handoff/app/views-entities.jsx` `NpcModal`; extract Phase 1
      checklist per entity-management spec "NPC create/edit modal UX" (add/edit
      modes, defaults, deferred `relation`/`faction` fields, footer, motion).
- [ ] 3D.6 Write failing tests for `NpcModal`: add mode opens empty with
      `current_state` defaulting to "Active"; edit mode pre-fills all four fields;
      submit calls `createNpc`/`updateNpc`; Cancel makes no request; Save disabled
      while `name` empty; on API error the modal stays open showing the error inline.
- [ ] 3D.7 Implement `NpcModal` (uses `Field` + `Modal`) and wire "+ New NPC"/"Edit"
      buttons in `app/campaigns/[id]/npcs/page.tsx` to open it; wire delete action
      through a `Modal`-based confirm calling `deleteNpc`.
- [ ] 3D.8 Read `handoff/app/views-entities.jsx` `FactionModal`; extract Phase 1
      checklist per entity-management spec "Faction create/edit modal UX".
- [ ] 3D.9 Write failing tests for `FactionModal`: add mode defaults
      `current_stance` to "Neutral"; edit pre-fills; submit calls
      `createFaction`/`updateFaction`; Cancel/disabled-Save/error-stays-open same as
      NPC modal.
- [ ] 3D.10 Implement `FactionModal` and wire "+ New faction"/"Edit"/"Delete" in
      `app/campaigns/[id]/factions/page.tsx`. **Explicitly do NOT implement** the
      handoff's inline `PostureSelect` as a separate write path — posture changes go
      through this modal only (spec-mandated deviation, already flagged in 2.5.8).
- [ ] 3D.11 Read `handoff/app/views-arcs.jsx` `ArcModal`; extract Phase 1 checklist
      per entity-management spec "Arc create/edit modal UX (NEW)" (defaults
      priority=Medium/status=Active mapped to `medium`/`active` codes, deferred
      "Related NPCs/factions" fields, UI-label ↔ lowercase-code mapping).
- [ ] 3D.12 Write failing tests for `ArcModal`: add mode defaults priority "Medium"
      / status "Active" (submits `medium`/`active`); edit pre-fills and displays
      codes as labels ("High"/"Active"); submit calls `createArc`/`updateArc` with
      lowercase codes; Cancel/disabled-Save/error-stays-open.
- [ ] 3D.13 Implement `ArcModal` and wire "+ New arc"/"Edit"/"Delete" in
      `app/campaigns/[id]/arcs/page.tsx`. **Explicitly do NOT implement** the
      handoff's inline Resolve/Discard/Reopen quick-actions as separate write paths
      — status changes go through this modal only (spec-mandated deviation, already
      flagged in 2.5.8).
- [ ] 3D.14 Adversarial self-review: `NpcModal`/`FactionModal`/`ArcModal` against
      their handoff sources — three Handoff Compliance Reports, each explicitly
      confirming the flagged deviations (PostureSelect, Resolve/Discard/Reopen) are
      intentional per spec, not oversights.
- [ ] 3D.15 Run `pnpm test`, `tsc --noEmit`, `eslint`, `prettier --check` — confirm
      green. Run `uv run pytest` once more from `services/api/` to confirm the full
      backend suite (including the untouched Block-5 extraction tests) is still
      green after all Work Unit 3 changes.

---

## Work Unit 4 — Docs / ENV sweep (no TDD — plain documentation tasks)

Commit message: `docs: document Block 6 campaign view endpoints, routes, and scope`

- [ ] 4.1 Audit existing root `.env.example` if any new env var was introduced (expected:
      none — verify and note "no change" if so). Do not create another env example.
- [ ] 4.2 Update root `README.md` with the new routes (`/dashboard` real list,
      `/campaigns/:id`, `/campaigns/:id/npcs`, `/campaigns/:id/factions`,
      `/campaigns/:id/arcs`) if the README enumerates app routes.
- [ ] 4.3 Update `services/api/README.md` with the new endpoints (`GET /campaigns`,
      `GET /campaigns/{id}`, `PATCH /campaigns/{id}`, and POST/PATCH/DELETE for
      `/npcs`, `/factions`, `/arcs`).
- [ ] 4.4 Update `docs/04-architecture.md` to reflect the new use cases/repo methods
      and the two new routers (npcs/factions/arcs).
- [ ] 4.5 Update `docs/05-ai-system.md` only if system/tone threading affects any
      documented AI-system behavior description (verify; likely no change since
      `composeRawText`/extraction is untouched).
- [ ] 4.6 Update `docs/06-api-contracts.md` with the full request/response contracts
      for all new/changed endpoints (campaign list/detail/PATCH, npc/faction/arc
      POST/PATCH/DELETE), including the arc status enum codes.
- [ ] 4.7 Update `PRODUCT.md` §5 and §10 to reflect campaign view + full entity CRUD
      now being in Block 6 scope (per proposal Scope Amendment A1–A5).
- [ ] 4.8 Update `.agents/skills/frontend-handoff-contract/references/route-map.md`
      to add `/campaigns/:id/arcs`; confirm the list route entry stays `/dashboard`
      (not `/campaigns`).
- [ ] 4.9 Update the project roadmap doc to mark Block 6 as in progress and drop the
      Block 4 smoke-test qualifier language if still present.
- [ ] 4.10 Final full-repo check: `pnpm lint`, `pnpm typecheck`, `pnpm test`,
      `pnpm format:check` at the root; `uv run pytest`, `uv run ruff check app/` from
      `services/api/`. All green before declaring the change ready for `sdd-verify`.
