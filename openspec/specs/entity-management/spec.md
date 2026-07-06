# Entity Management Specification

> Renamed from `entity-editing` (proposal amendment A1). Was light-edit-only for NPCs and
> factions; now full **create + edit + delete** for NPCs, factions, AND arcs, per
> product-owner-confirmed scope. The old `entity-editing/spec.md` is tombstoned — see that
> file.

## Purpose

Let a DM fully manage the entities the Scribe tracks for a campaign: create, edit, and
delete NPCs, factions, and arcs through modal dialogs, and overwrite a campaign's
`world_state` / `system` / `tone`. No provenance history, no soft-delete. Introduces the
shared `Field` and `Modal` primitives required by the handoff.

Screen-level rendering (list layout, states, breadcrumbs) for NPCs, factions, and arcs is
specified in `campaign-view`; this capability owns the request/response contracts for
every mutation and the modal UX that triggers them.

## Requirements

### Requirement: Overwrite campaign world state, system, and tone

The system MUST expose `PATCH /campaigns/{id}` accepting a partial body of
`{ world_state?: string, system?: string, tone?: string }` — only supplied fields are
updated (`model_dump(exclude_unset=True, exclude_none=True)` semantics) — for a campaign
owned by the requesting user. Campaign `status` is out of MVP scope and MUST be rejected
or ignored if sent (not a supported field).

Request: any non-empty subset of `{ "world_state": "string", "system": "string", "tone": "string" }`.
Response: updated campaign detail fields (at minimum, the changed field(s) and
`updated_at`).

Validation:

- `world_state`, when supplied, MUST be a non-empty string after trimming.
- `system`, when supplied, MUST be a non-empty string after trimming (mirrors its
  required-on-create constraint).
- `tone`, when supplied, MUST be a non-empty string after trimming. Optional means it may be omitted, not blanked.
- An empty request body (no fields supplied) MUST be rejected with 422.
- Exact max-length bounds are a design/implementation detail consistent with existing
  free-text fields in this codebase, not a spec-level constraint here.

#### Scenario: Owner overwrites world state

- GIVEN campaign `c1` belongs to user A with `world_state = "old text"`
- WHEN user A calls `PATCH /campaigns/c1` with `{ "world_state": "new text" }`
- THEN the response is 200 with `world_state = "new text"`
- AND a subsequent `GET /campaigns/c1` reflects `"new text"`

#### Scenario: Partial update touches only supplied fields

- GIVEN campaign `c1` has `world_state = "w"`, `system = "D&D 5e"`, `tone = "Grim"`
- WHEN user A calls `PATCH /campaigns/c1` with `{ "tone": "Hopeful" }`
- THEN the response is 200 with `tone = "Hopeful"` and `world_state`/`system` unchanged

#### Scenario: Empty tone rejected

- GIVEN campaign `c1` belongs to user A
- WHEN user A calls `PATCH /campaigns/c1` with `{ "tone": "   " }`
- THEN the response is 422 and `tone` is unchanged

#### Scenario: Empty world state rejected

- GIVEN campaign `c1` belongs to user A
- WHEN user A calls `PATCH /campaigns/c1` with `{ "world_state": "   " }`
- THEN the response is 422 and `world_state` is unchanged

#### Scenario: Empty request body rejected

- GIVEN campaign `c1` belongs to user A
- WHEN user A calls `PATCH /campaigns/c1` with `{}`
- THEN the response is 422 and nothing is changed

#### Scenario: Non-owner cannot patch

- GIVEN campaign `c1` belongs to user A
- WHEN user B calls `PATCH /campaigns/c1` with any body
- THEN the write MUST NOT apply
- AND the response is 404 (uniform not-found-vs-forbidden convention, see `campaign-view`)

### Requirement: Create, edit, and delete NPCs

The system MUST expose:

- `POST /npcs` — create an NPC under a campaign, accepting
  `{ campaign_id, name, description?, current_state?, motivation? }` in the body (only `campaign_id`
  and `name` required; blank optional fields are treated as omitted; field names per the
  domain model — the handoff's "Current status" maps to `current_state`). The server
  assigns `content_source = "manual"` on the created NPC; the response is the created NPC
  representation including its new `id`.
- `PATCH /npcs/{id}` — partial update of `{ name?, description?, current_state?, motivation? }`
  for an NPC belonging to a campaign owned by the requesting user. Edits stamp `content_source =
"edited"` (✦ → ✎ per PRODUCT P1); full provenance history stays out of Block 6 scope. Empty body → 422.
- `DELETE /npcs/{id}` — permanently removes the NPC. No confirmation step is enforced
  server-side (the handoff's delete action has no confirmation dialog); response is 204
  on success.

#### Scenario: Owner creates an NPC

- GIVEN campaign `c1` belongs to user A
- WHEN user A calls `POST /npcs` with
  `{ "campaign_id": "c1", "name": "Toblen Stonehill", "description": "Innkeeper", "current_state": "Active", "motivation": "Protect the inn" }`
- THEN the response is 201 with the new NPC including its `id` and `content_source = "manual"`

#### Scenario: Create under a campaign not owned by the caller

- GIVEN campaign `c1` belongs to user A
- WHEN user B calls `POST /npcs` with a valid body containing `{ "campaign_id": "c1" }`
- THEN the write MUST NOT apply and the response is 404

#### Scenario: Create with missing name rejected

- GIVEN campaign `c1` belongs to user A
- WHEN user A calls `POST /npcs` with `{ "campaign_id": "c1" }` (missing `name`)
- THEN the response is 422 and no NPC is created

#### Scenario: Create accepts omitted optional add-mode fields

- GIVEN campaign `c1` belongs to user A
- WHEN user A calls `POST /npcs` with `{ "campaign_id": "c1", "name": "Toblen" }`
- THEN the response is 201 with nullable `description`, `current_state`, and `motivation`

#### Scenario: Owner edits an NPC

- GIVEN NPC `n1` belongs to a campaign owned by user A
- WHEN user A calls `PATCH /npcs/n1` with
  `{ "name": "Toblen Stonehill", "current_state": "Anxious", "motivation": "Protect the inn" }`
- THEN the response is 200 reflecting the new values
- AND a subsequent read of the campaign detail shows the updated NPC

#### Scenario: Invalid NPC id or not owned (PATCH)

- GIVEN NPC `n1` does not belong to a campaign owned by user A (or does not exist)
- WHEN user A calls `PATCH /npcs/n1`
- THEN the write MUST NOT apply and the response is 404

#### Scenario: Empty name rejected

- GIVEN NPC `n1` belongs to a campaign owned by user A
- WHEN user A calls `PATCH /npcs/n1` with `{ "name": "" }`
- THEN the response is 422 and the NPC is unchanged

#### Scenario: Empty PATCH body rejected

- GIVEN NPC `n1` belongs to a campaign owned by user A
- WHEN user A calls `PATCH /npcs/n1` with `{}`
- THEN the response is 422 and the NPC is unchanged

#### Scenario: Owner deletes an NPC

- GIVEN NPC `n1` belongs to a campaign owned by user A
- WHEN user A calls `DELETE /npcs/n1`
- THEN the response is 204
- AND a subsequent `GET /campaigns/{id}` no longer lists `n1`

#### Scenario: Non-owner cannot delete

- GIVEN NPC `n1` belongs to a campaign owned by user A
- WHEN user B calls `DELETE /npcs/n1`
- THEN the delete MUST NOT apply and the response is 404

### Requirement: Create, edit, and delete factions

The system MUST expose:

- `POST /factions` — create a faction under a campaign, accepting
  `{ campaign_id, name, description?, current_stance?, goals? }` in the body (only
  `campaign_id` and `name` required; blank optional fields are treated as omitted; the
  handoff's "posture" and "objective" map to `current_stance` and `goals` respectively). Server assigns
  `content_source = "manual"`; response is the created faction including its `id`.
- `PATCH /factions/{id}` — partial update of `{ name?, description?, current_stance?, goals? }`
  for a faction belonging to a campaign owned by the requesting user. Edits stamp `content_source =
"edited"` (✦ → ✎ per PRODUCT P1); full provenance history stays out of Block 6 scope. Empty body → 422.
- `DELETE /factions/{id}` — permanently removes the faction. No server-side
  confirmation step. Response is 204 on success.

#### Scenario: Owner creates a faction

- GIVEN campaign `c1` belongs to user A
- WHEN user A calls `POST /factions` with
  `{ "campaign_id": "c1", "name": "Black Bear Guild", "description": "Dock smugglers", "current_stance": "Neutral", "goals": "Control the docks" }`
- THEN the response is 201 with the new faction including its `id` and
  `content_source = "manual"`

#### Scenario: Create under a campaign not owned by the caller

- GIVEN campaign `c1` belongs to user A
- WHEN user B calls `POST /factions` with a valid body containing `{ "campaign_id": "c1" }`
- THEN the write MUST NOT apply and the response is 404

#### Scenario: Create with missing name rejected

- GIVEN campaign `c1` belongs to user A
- WHEN user A calls `POST /factions` with `{ "campaign_id": "c1" }`
- THEN the response is 422 and no faction is created

#### Scenario: Create accepts omitted optional add-mode fields

- GIVEN campaign `c1` belongs to user A
- WHEN user A calls `POST /factions` with `{ "campaign_id": "c1", "name": "Black Bear Guild" }`
- THEN the response is 201 with nullable `description`, `current_stance`, and `goals`

#### Scenario: Owner edits a faction

- GIVEN faction `f1` belongs to a campaign owned by user A
- WHEN user A calls `PATCH /factions/f1` with
  `{ "name": "Black Bear Guild", "current_stance": "Hostile", "goals": "Control the docks" }`
- THEN the response is 200 reflecting the new values

#### Scenario: Invalid faction id or not owned (PATCH)

- GIVEN faction `f1` does not belong to a campaign owned by user A (or does not exist)
- WHEN user A calls `PATCH /factions/f1`
- THEN the write MUST NOT apply and the response is 404

#### Scenario: Empty name rejected

- GIVEN faction `f1` belongs to a campaign owned by user A
- WHEN user A calls `PATCH /factions/f1` with `{ "name": "" }`
- THEN the response is 422 and the faction is unchanged

#### Scenario: Empty PATCH body rejected

- GIVEN faction `f1` belongs to a campaign owned by user A
- WHEN user A calls `PATCH /factions/f1` with `{}`
- THEN the response is 422 and the faction is unchanged

#### Scenario: Owner deletes a faction

- GIVEN faction `f1` belongs to a campaign owned by user A
- WHEN user A calls `DELETE /factions/f1`
- THEN the response is 204
- AND a subsequent `GET /campaigns/{id}` no longer lists `f1`

#### Scenario: Non-owner cannot delete

- GIVEN faction `f1` belongs to a campaign owned by user A
- WHEN user B calls `DELETE /factions/f1`
- THEN the delete MUST NOT apply and the response is 404

### Requirement: Create, edit, and delete arcs (NEW)

The system MUST expose:

- `POST /arcs` — create an arc under a campaign, accepting
  `{ campaign_id, title, description?, priority?, status? }` in the body (`campaign_id` and
  `title` required; blank optional `description` is treated as omitted; reduced-scope field set per
  proposal A2 — `npcs`/`factions` cross-refs and `lastSession` are Out of MVP / Block 7
  and MUST NOT be accepted). `priority` MUST validate against the codes `high`, `medium`,
  `low`. `status` MUST validate against the codes `active`, `dormant`, `resolved`,
  `discarded` (see Requirement below). If `status` is omitted, the server defaults it to
  `active`. Server assigns `content_source = "manual"`; response is the created arc
  including its `id`.
- `PATCH /arcs/{id}` — partial update of `{ title?, description?, priority?, status? }`
  for an arc belonging to a campaign owned by the requesting user. Edits stamp `content_source =
"edited"` (✦ → ✎ per PRODUCT P1); full provenance history stays out of Block 6 scope. Empty body → 422.
- `DELETE /arcs/{id}` — permanently removes the arc. No server-side confirmation step.
  Response is 204 on success.

There is no separate `GET /arcs` endpoint; arcs are read as part of
`GET /campaigns/{id}` (see `campaign-view`).

#### Scenario: Owner creates an arc

- GIVEN campaign `c1` belongs to user A
- WHEN user A calls `POST /arcs` with
  `{ "campaign_id": "c1", "title": "The missing caravan", "description": "...", "priority": "high", "status": "active" }`
- THEN the response is 201 with the new arc including its `id` and
  `content_source = "manual"`

#### Scenario: Create defaults status to active when omitted

- GIVEN campaign `c1` belongs to user A
- WHEN user A calls `POST /arcs` with
  `{ "campaign_id": "c1", "title": "The missing caravan", "description": "...", "priority": "medium" }`
- THEN the response is 201 with `status = "active"`

#### Scenario: Create under a campaign not owned by the caller

- GIVEN campaign `c1` belongs to user A
- WHEN user B calls `POST /arcs` with a valid body containing `{ "campaign_id": "c1" }`
- THEN the write MUST NOT apply and the response is 404

#### Scenario: Create with missing title rejected

- GIVEN campaign `c1` belongs to user A
- WHEN user A calls `POST /arcs` with `{ "campaign_id": "c1" }` (missing `title`)
- THEN the response is 422 and no arc is created

#### Scenario: Create accepts omitted optional add-mode fields

- GIVEN campaign `c1` belongs to user A
- WHEN user A calls `POST /arcs` with `{ "campaign_id": "c1", "title": "The missing caravan" }`
- THEN the response is 201 with `status = "active"`, default priority, and nullable `description`

#### Scenario: Create with invalid priority or status code rejected

- GIVEN campaign `c1` belongs to user A
- WHEN user A calls `POST /arcs` with
  `{ "campaign_id": "c1", "title": "X", "description": "Y", "priority": "urgent", "status": "active" }`
- THEN the response is 422 (`"urgent"` is not a valid priority code) and no arc is created

#### Scenario: Owner edits an arc

- GIVEN arc `a1` belongs to a campaign owned by user A with `status = "active"`
- WHEN user A calls `PATCH /arcs/a1` with `{ "status": "resolved" }`
- THEN the response is 200 with `status = "resolved"`

#### Scenario: Invalid arc id or not owned (PATCH)

- GIVEN arc `a1` does not belong to a campaign owned by user A (or does not exist)
- WHEN user A calls `PATCH /arcs/a1`
- THEN the write MUST NOT apply and the response is 404

#### Scenario: Empty title rejected

- GIVEN arc `a1` belongs to a campaign owned by user A
- WHEN user A calls `PATCH /arcs/a1` with `{ "title": "" }`
- THEN the response is 422 and the arc is unchanged

#### Scenario: Empty PATCH body rejected

- GIVEN arc `a1` belongs to a campaign owned by user A
- WHEN user A calls `PATCH /arcs/a1` with `{}`
- THEN the response is 422 and the arc is unchanged

#### Scenario: Owner deletes an arc

- GIVEN arc `a1` belongs to a campaign owned by user A
- WHEN user A calls `DELETE /arcs/a1`
- THEN the response is 204
- AND a subsequent `GET /campaigns/{id}` no longer lists `a1`

#### Scenario: Non-owner cannot delete

- GIVEN arc `a1` belongs to a campaign owned by user A
- WHEN user B calls `DELETE /arcs/a1`
- THEN the delete MUST NOT apply and the response is 404

### Requirement: Arc status enum uses stable lowercase codes

The system MUST validate and expose `arc.status` using the four stable lowercase codes
`active`, `dormant`, `resolved`, `discarded` (i18n-stable — never localized/display
strings at the API boundary). Display labels ("Active", "Dormant", "Resolved",
"Discarded") are a presentation-layer concern in the frontend, not part of this contract.
The underlying `arc_status` Postgres enum migration (rename `open`→`active`,
`dropped`→`discarded`, add `dormant`, backfill existing rows) is a `sdd-design`/migration
concern; this requirement only specifies the API-level validation surface.

#### Scenario: Valid status codes accepted

- GIVEN campaign `c1` belongs to user A
- WHEN user A calls `PATCH /arcs/a1` with `{ "status": "dormant" }` for an arc `a1` in
  that campaign
- THEN the response is 200 with `status = "dormant"`

#### Scenario: Invalid status code rejected

- GIVEN arc `a1` belongs to a campaign owned by user A
- WHEN user A calls `PATCH /arcs/a1` with `{ "status": "open" }` (legacy pre-migration
  code, no longer valid)
- THEN the response is 422 and the arc is unchanged

### Requirement: Reusable Field primitive

The system MUST provide a reusable `Field` component (`components/ui/field` or
equivalent) matching the handoff contract: renders a label, optional "· optional" marker,
children (the input/textarea/select), and either help text or an error message (never
both simultaneously).

#### Scenario: Field renders help text

- GIVEN a `Field` with `label="Motivation"` and `help="What drives them"` and no error
- WHEN rendered
- THEN the label and help text both appear, and no error text appears

#### Scenario: Field renders error over help

- GIVEN a `Field` with both `help` and `error` set
- WHEN rendered
- THEN only the error text appears, not the help text

### Requirement: Reusable Modal primitive

The system MUST provide a reusable `Modal` component matching the handoff contract:
renders a title, a close button, body content, an optional footer, closes on Escape key,
closes on backdrop click (click outside the modal panel), traps focus while open,
returns focus to the invoking trigger on close, and exposes dialog semantics with
`role="dialog"`, `aria-modal="true"`, and `aria-labelledby`.

#### Scenario: Modal closes on Escape

- GIVEN an open `Modal`
- WHEN the user presses Escape
- THEN `onClose` fires

#### Scenario: Modal closes on backdrop click

- GIVEN an open `Modal`
- WHEN the user clicks outside the modal panel
- THEN `onClose` fires

#### Scenario: Modal does not close on inner click

- GIVEN an open `Modal`
- WHEN the user clicks inside the modal panel body
- THEN `onClose` does NOT fire

#### Scenario: Modal traps and restores focus

- GIVEN an open `Modal` launched from a trigger button
- WHEN the user tabs past the last focusable control or shift-tabs before the first
- THEN focus cycles within the modal
- WHEN the modal closes
- THEN focus returns to the trigger button

#### Scenario: Modal exposes ARIA dialog semantics

- GIVEN an open `Modal` with title "Edit NPC"
- WHEN assistive technology inspects the modal
- THEN the dialog has `role="dialog"`, `aria-modal="true"`, and an accessible name from `aria-labelledby`

### Requirement: NPC create/edit modal UX

The system MUST render an NPC modal (`NpcModal` per handoff) in two modes:

- **Add** — reachable from "+ New NPC" on `/campaigns/:id/npcs`, opens empty (default
  `current_state = "Active"`), submits via `POST /npcs` with `campaign_id` in the body.
- **Edit** — reachable from the "Edit" action per row, pre-filled with the NPC's current
  `name`, `description`, `current_state` ("Current status" select: Active/Scheming/
  Anxious/Threat), and `motivation`, submits via `PATCH /npcs/{id}`.

**Deferred, Out of MVP** (per proposal A7): the handoff's `relation` (relation to party)
and `faction` (related faction) fields have no backing persistence contract. The
implementation MUST NOT render them as if they persist; omit them from the modal rather
than showing a silently no-op input.

Footer: "Cancel" (closes without saving, no request made) and "Add NPC"/"Save changes"
(submits the request, disabled while `name` is empty).

Motion: modal appears via standard overlay pattern; primary button follows press physics;
on success, modal closes and the list reflects the created/updated NPC, with
`OriginBadge` showing "✎ Edited by you" per the server-assigned `content_source`.

#### Scenario: Add modal opens empty

- GIVEN the DM clicks "+ New NPC" on `/campaigns/c1/npcs`
- WHEN the modal opens
- THEN `name`, `description`, and `motivation` are empty and `current_state` defaults to
  "Active"

#### Scenario: Add persists and closes

- GIVEN the add modal is open with `name = "Toblen"`, `description = "Innkeeper"`,
  `motivation = "Protect the inn"`
- WHEN the DM clicks "Add NPC"
- THEN `POST /npcs` is called with `campaign_id` and those fields
- AND on success the modal closes and the new NPC appears in the list

#### Scenario: Edit modal pre-fills current values

- GIVEN NPC `n1` has `name="Toblen"`, `description="Innkeeper"`,
  `current_state="Active"`, `motivation="Keep the inn safe"`
- WHEN the DM clicks "Edit" on `n1`
- THEN the modal opens with those four fields pre-filled

#### Scenario: Edit persists and closes

- GIVEN the edit modal is open for NPC `n1` with a changed `motivation`
- WHEN the DM clicks "Save changes"
- THEN `PATCH /npcs/n1` is called with the updated fields
- AND on success the modal closes and the list shows the new motivation

#### Scenario: Cancel discards changes

- GIVEN the add or edit modal is open with unsaved edits
- WHEN the DM clicks "Cancel"
- THEN the modal closes and no request is made

#### Scenario: Delete removes the row

- GIVEN NPC `n1` is listed on `/campaigns/c1/npcs`
- WHEN the DM clicks "Delete" on `n1`
- THEN `DELETE /npcs/n1` is called and, on success, `n1` no longer renders in the list

### Requirement: Faction create/edit modal UX

The system MUST render a faction modal (`FactionModal` per handoff) in two modes:

- **Add** — reachable from "+ New faction" on `/campaigns/:id/factions`, opens empty
  (default `current_stance = "Neutral"`), submits via
  `POST /factions` with `campaign_id` in the body.
- **Edit** — reachable from the "Edit" action per row, pre-filled with `name`,
  `description`, `current_stance` ("Current posture" select: Hostile/Transactional/
  Opportunistic/Friendly/Neutral), and `goals` ("Objective" field), submits via
  `PATCH /factions/{id}`.

**Deferred, Out of MVP / Block 8** (per proposal A7): the handoff's `influence`
("Resources / influence"), `npcs`, `arcs`, and `lastReaction` fields have no backing
persistence contract. Omit them from the modal.

Footer and motion: same pattern as the NPC modal (Cancel / Add faction·Save changes,
disabled while `name` is empty).

#### Scenario: Add modal opens empty

- GIVEN the DM clicks "+ New faction" on `/campaigns/c1/factions`
- WHEN the modal opens
- THEN `name`, `description`, and `goals` are empty and `current_stance` defaults to
  "Neutral"

#### Scenario: Add persists and closes

- GIVEN the add modal is open with `name = "Black Bear Guild"`,
  `description = "Dock smugglers"`, `goals = "Control the docks"`
- WHEN the DM clicks "Add faction"
- THEN `POST /factions` is called with `campaign_id` and those fields
- AND on success the modal closes and the new faction appears in the list

#### Scenario: Edit modal pre-fills current values

- GIVEN faction `f1` has `name="Black Bear Guild"`, `description="Dock smugglers"`,
  `current_stance="Neutral"`, `goals="Expand smuggling routes"`
- WHEN the DM clicks "Edit" on `f1`
- THEN the modal opens with those four fields pre-filled

#### Scenario: Edit persists and closes

- GIVEN the edit modal is open for faction `f1` with a changed `current_stance`
- WHEN the DM clicks "Save changes"
- THEN `PATCH /factions/f1` is called with the updated fields
- AND on success the modal closes and the list shows the new stance

#### Scenario: Cancel discards changes

- GIVEN the add or edit modal is open with unsaved edits
- WHEN the DM clicks "Cancel"
- THEN the modal closes and no request is made

#### Scenario: Delete removes the row

- GIVEN faction `f1` is listed on `/campaigns/c1/factions`
- WHEN the DM clicks "Delete" on `f1`
- THEN `DELETE /factions/f1` is called and, on success, `f1` no longer renders in the
  list

### Requirement: Arc create/edit modal UX (NEW)

The system MUST render an arc modal (`ArcModal` per handoff) in two modes:

- **Add** — reachable from "+ New arc" on `/campaigns/:id/arcs`, opens with defaults
  `priority = "Medium"` / `status = "Active"` (mapped to codes `medium` / `active`),
  submits via `POST /arcs` with `campaign_id` in the body.
- **Edit** — reachable from the "Edit" action per row, pre-filled with `title`,
  `description`, `priority` (select: High/Medium/Low), and `status` (select:
  Active/Dormant/Resolved/Discarded), submits via `PATCH /arcs/{id}`.

**Deferred, Out of MVP** (per proposal A2/A7): the handoff's "Related NPCs" and "Related
factions" free-text fields have no backing persistence contract (relationship graph,
confirmed out-of-MVP). Omit them from the modal.

Footer: "Cancel" (closes without saving, no request made) and "Add arc"/"Save changes"
(submits the request, disabled while `title` is empty).

Motion: same pattern as the NPC/faction modals.

#### Scenario: Add modal opens with defaults

- GIVEN the DM clicks "+ New arc" on `/campaigns/c1/arcs`
- WHEN the modal opens
- THEN `title` and `description` are empty, `priority` defaults to "Medium", and `status`
  defaults to "Active"

#### Scenario: Add persists and closes

- GIVEN the add modal is open with `title = "The missing caravan"`,
  `description = "..."`, `priority = "High"`, `status = "Active"`
- WHEN the DM clicks "Add arc"
- THEN `POST /arcs` is called with
  `{ "campaign_id": "c1", "title": "The missing caravan", "description": "...", "priority": "high", "status": "active" }`
  (UI display values mapped to lowercase codes)
- AND on success the modal closes and the new arc appears in the list

#### Scenario: Edit modal pre-fills current values

- GIVEN arc `a1` has `title="The missing caravan"`, `description="..."`,
  `priority="high"`, `status="active"`
- WHEN the DM clicks "Edit" on `a1`
- THEN the modal opens with those four fields pre-filled (displayed as "High"/"Active")

#### Scenario: Edit persists and closes

- GIVEN the edit modal is open for arc `a1` with `status` changed to "Resolved"
- WHEN the DM clicks "Save changes"
- THEN `PATCH /arcs/a1` is called with `{ "status": "resolved" }` (plus any other
  changed fields)
- AND on success the modal closes and the list shows the new status, dimmed per the
  resolved-state styling

#### Scenario: Cancel discards changes

- GIVEN the add or edit modal is open with unsaved edits
- WHEN the DM clicks "Cancel"
- THEN the modal closes and no request is made

#### Scenario: Delete removes the row

- GIVEN arc `a1` is listed on `/campaigns/c1/arcs`
- WHEN the DM clicks "Delete" on `a1`
- THEN `DELETE /arcs/a1` is called and, on success, `a1` no longer renders in the list
