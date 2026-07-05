# Campaign View Specification

## Purpose

Give an authenticated DM read access to their own campaigns: a list (`/dashboard`), a
detail view (`/campaigns/:id`) showing world state, system/tone, NPCs/factions/arcs
summaries and Block-7 placeholder slots, and dedicated NPC (`/campaigns/:id/npcs`),
faction (`/campaigns/:id/factions`), and arc (`/campaigns/:id/arcs`) list screens. Route
naming per locked decision: list stays at `/dashboard`; the handoff's `/campaigns` list
route maps 1:1 to `/dashboard` in this app.

Mutation behavior for NPCs/factions/arcs (create, edit, delete, and the shared
`Field`/`Modal` primitives) is specified in the `entity-management` capability. This
capability owns the read paths and the screen-level rendering checklists; it references
`entity-management` for each screen's create/edit/delete affordances.

## Requirements

### Requirement: List owned campaigns

The system MUST expose `GET /api/campaigns` returning only campaigns owned by the
authenticated user, ordered by `updated_at` descending.

Response item: `{ id, title, description, updated_at }` (existing contract, unchanged).
Campaign `status` is out of MVP scope and MUST NOT appear in this response.

#### Scenario: DM has campaigns

- GIVEN an authenticated DM owns 2 campaigns
- WHEN they call `GET /api/campaigns`
- THEN the response is 200 with exactly those 2 campaigns, newest `updated_at` first

#### Scenario: DM owns no campaigns

- GIVEN an authenticated DM owns 0 campaigns
- WHEN they call `GET /api/campaigns`
- THEN the response is 200 with an empty array

#### Scenario: Unauthenticated request

- GIVEN no valid Supabase JWT is provided
- WHEN `GET /api/campaigns` is called
- THEN the response is 401

### Requirement: Read campaign detail with children

The system MUST expose `GET /api/campaigns/{id}` returning the campaign's fields
(`id`, `title`, `description`, `world_state`, `system`, `tone`, `updated_at`) plus
`npcs[]`, `factions[]`, and `arcs[]` (**all** arcs regardless of `status` — the arcs list
screen and the detail's "needing attention" slice both derive from this same array;
there is no separate `GET /arcs` endpoint), scoped to the requesting user's ownership via
RLS. `sessions[]` and `memory_facts[]` are Block 7 and MUST NOT be expected in this
capability's scope; if present in the payload for forward-compatibility they are not
asserted on here.

#### Scenario: Owner reads their campaign

- GIVEN campaign `c1` belongs to user A
- WHEN user A calls `GET /api/campaigns/c1`
- THEN the response is 200 including `world_state`, `system`, `tone`, `npcs[]`,
  `factions[]`, `arcs[]` (all statuses)

#### Scenario: Non-owner attempts to read

- GIVEN campaign `c1` belongs to user A
- WHEN user B calls `GET /api/campaigns/c1`
- THEN the response is 404 (not-found-vs-forbidden convention: see below)

#### Scenario: Campaign does not exist

- GIVEN no campaign with id `unknown-id` exists
- WHEN an authenticated user calls `GET /api/campaigns/unknown-id`
- THEN the response is 404

**Locked design decision** (was open, now resolved by proposal amendment A6): non-owner
access returns **404**, indistinguishable from not-found, never 403. This convention is
applied uniformly across every Block 6 endpoint — all reads AND all writes (POST/PATCH/DELETE)
on campaigns, NPCs, factions, and arcs.

### Requirement: Persist and edit campaign `system` and `tone`

The system MUST persist `system` (required) and `tone` (optional) as structured fields on
`campaigns`, in addition to (not instead of) the existing Block-5 behavior of folding them
into `raw_text` via `composeRawText` for extraction. `GET /api/campaigns/{id}` MUST
include `system` and `tone`. `PATCH /api/campaigns/{id}` MUST accept partial updates to
`system` and `tone` alongside `world_state` (see Requirement below in `entity-management`
for the shared partial-PATCH contract). Campaign `status` remains out of MVP scope and is
never accepted or returned by any Block 6 endpoint.

**Constraint (non-negotiable, protects shipped Block 5 behavior):** the campaign creation
flow (`POST /api/campaigns`, out of this change's endpoint list but affected by this
requirement) MUST continue to fold `system`/`tone` into the composed `raw_text` exactly as
today, so Block-5 extraction behavior and its tests are unchanged, AND additionally carry
`system`/`tone` as structured fields on the create payload for structural persistence.

#### Scenario: Detail shows system and tone

- GIVEN campaign `c1` has `system = "D&D 5e"` and `tone = "Grim, low-magic"`
- WHEN `GET /api/campaigns/c1` is called
- THEN the response includes `"system": "D&D 5e"` and `"tone": "Grim, low-magic"`

#### Scenario: System and tone are editable

- GIVEN campaign `c1` belongs to user A
- WHEN user A calls `PATCH /api/campaigns/c1` with `{ "tone": "Hopeful, high fantasy" }`
- THEN the response is 200 with the updated `tone` and unchanged `system`/`world_state`

### Requirement: Dashboard campaign list screen

The system MUST render `/dashboard` per the `Dashboard` handoff prototype
(`handoff/app/views-dashboard.jsx`), replacing the current placeholder.

Field-by-field checklist (source of truth: handoff):
- Breadcrumb: "Your chronicles" (`ll-crumb`)
- Header: `Kicker` "Campaigns", H1 "Your chronicles", subtitle summarizing campaign count
- Primary action: "+ New campaign" button → navigates to `/campaigns/new`
- Search input: placeholder "Search campaigns…", client-side filter by name/system, helper
  text "{shown} of {total}"
- Campaign cards (`CampaignCard`): title, system + tone line, 5 stat columns (Sessions,
  NPCs, Factions, Memories, Open arcs), "Updated {date}" footer, "Open chronicle →" link;
  entire card clickable → `/campaigns/:id`
  - **Deferred, do not implement as data-bound**: the handoff's status pill (campaign
    `status` — Out of MVP, no backend field); the Sessions and Memories stat columns
    (Block 7 — no session/memory data exists yet). Render NPCs, Factions, and Open-arcs
    counts live from `GET /api/campaigns` list data or, if the list endpoint does not
    include counts, treat the remaining columns as a follow-up rather than silently
    fabricating numbers — this MUST be called out in the implementation's adversarial
    self-review if counts require an endpoint shape not specced here.
- Shared components used: `Shell`, `Kicker`, `EmptyState`
- Grid: 2 columns desktop, collapses to 1 column ≤760px

States (each MUST be implemented individually, per contract skill):
- **loading**: initial fetch in flight → use `Loading` primitive (quill animation) while
  `GET /api/campaigns` resolves
- **error**: fetch fails → `ErrorNotice` with retry action
- **empty**: 0 campaigns → `EmptyState` with title "Your chronicle starts here", CTA
  "+ Create your first campaign" → `/campaigns/new`
- **empty-search**: search yields 0 matches → `EmptyState` orn "✦", title "No campaigns
  match that search"
- **success**: populated grid of `CampaignCard`

Motion (data-motion="full"): page enters with `.ll-view-enter` (fade + 10px rise, 0.34s);
cards use `.ll-rise` entrance; buttons follow standard press physics. Respect
`prefers-reduced-motion: reduce` and `data-motion` levels (subtle/off).

#### Scenario: Campaigns load successfully

- GIVEN the DM has 3 campaigns
- WHEN `/dashboard` mounts
- THEN a `Loading` state renders first, then 3 `CampaignCard`s render in a 2-column grid

#### Scenario: No campaigns yet

- GIVEN the DM has 0 campaigns
- WHEN `/dashboard` mounts and the fetch resolves
- THEN the `EmptyState` "Your chronicle starts here" renders with the create CTA

#### Scenario: Fetch fails

- GIVEN `GET /api/campaigns` returns a 5xx or network error
- WHEN `/dashboard` mounts
- THEN `ErrorNotice` renders with a retry action that re-triggers the fetch

#### Scenario: Search filters client-side

- GIVEN the DM has campaigns "The Salt Road" and "Sombras sobre Phandalin"
- WHEN they type "salt" into the search input
- THEN only "The Salt Road" renders, and the helper text reads "1 of 2"

### Requirement: Campaign detail screen

The system MUST render `/campaigns/:id` per the `CampaignDetail` handoff prototype
(`handoff/app/views-detail.jsx`), showing system/tone, world state (view + edit), and arcs
needing attention as live sections, with recent sessions and active memories rendered as
static, dimmed "coming in a later chapter" placeholder cards (Block 7) that preserve the
two-column layout rhythm (do not collapse to a single column).

Field-by-field checklist:
- Breadcrumb: Campaigns / {campaign name}
- Header: `Kicker` "Campaign · {system} · {tone}" (live, from `GET /api/campaigns/{id}`),
  H1 campaign name, subtitle with update info
  - **Deferred**: "Log session" and "Prepare next session" header buttons → Block 7
    (sessions/generation). MUST NOT be wired to live endpoints; either omit or render
    disabled with no implied functionality.
- Stat bar (`ll-statbar`): NPCs, Factions, Arcs metrics are live and clickable, routing to
  `/campaigns/:id/npcs`, `/factions`, `/arcs` respectively.
  - **Deferred**: the Memory metric → Block 7 (memory review UI is out of scope). Omit or
    render as a non-interactive placeholder.
- World-state section (`/01 The state of the world`): serif paragraph display by default;
  "Edit" link toggles into a `textarea` + "Save changes"/"Cancel" buttons — this is the
  in-scope editable field for this capability (mutation mechanics: see this capability's
  own `PATCH /api/campaigns/{id}` requirement above)
- **Deferred, static placeholder** — `ScribeNotice` block above the two-column layout →
  Block 7 (memory review). Omit for Block 6; do not render a `ScribeNotice` with fabricated
  content.
- **Deferred, static placeholder** — `/02 Recent sessions` (left column) → Block 7. Render
  a dimmed card with a "coming in a later chapter" message; MUST NOT fetch or display
  session data.
- **Deferred, static placeholder** — `/04 Active memories` (right column) → Block 7. Same
  treatment: dimmed static card, not data-bound.
- `/03 Arcs needing attention` (right column) is **live**: renders up to 3 arcs from
  `GET /api/campaigns/{id}`'s `arcs[]`, filtered client-side to `status` in
  (`active`, `dormant`), with a "All arcs →" link to `/campaigns/:id/arcs`.
- Shared components used: `Shell`, `Kicker`

States:
- **loading**: initial detail fetch → `Loading` primitive
- **error**: fetch fails → `ErrorNotice` with retry
- **not-found**: campaign doesn't exist or isn't owned → distinct not-found state (backed
  by the 404-on-RLS-miss convention)
- **success**: full detail render (live sections populated, placeholder sections static)
- **world-state editing**: textarea + Save/Cancel, autofocus on entering edit mode
- **world-state save success**: returns to display mode with updated text
- **world-state save error**: inline error, textarea stays open with unsaved draft intact

Motion: `.ll-view-enter` on route change; `.ll-rule-anim` on section reveals; button press
physics on Save/Cancel/Edit links.

#### Scenario: Detail loads successfully

- GIVEN campaign `c1` belongs to the requesting DM
- WHEN `/campaigns/c1` mounts
- THEN `system`, `tone`, world state, stat bar (NPCs/Factions/Arcs), and the arcs-needing-
  attention section render with data from `GET /api/campaigns/c1`, while Recent sessions
  and Active memories render as dimmed static placeholders

#### Scenario: Campaign not found or not owned

- GIVEN campaign `c1` does not belong to the requesting DM (or does not exist)
- WHEN `/campaigns/c1` mounts
- THEN a not-found state renders instead of campaign content

### Requirement: NPC list screen

The system MUST render `/campaigns/:id/npcs` per the `NpcsView` handoff prototype
(`handoff/app/views-entities.jsx`), listing NPCs with name, status pill, description, and
motivation, with "+ New NPC", per-row "Edit", and per-row "Delete" actions (mutation
behavior specified in `entity-management`).

Checklist:
- Breadcrumb: Campaigns / {campaign name} / NPCs
- Header: `Kicker` "Campaign · NPCs", H1 "NPCs", subtitle with count, "+ New NPC" primary
  action button
- Filter bar: status filters (All, Active, Scheming, Anxious, Threat) — MAY be
  implemented; not required for MVP if adds scope, but MUST NOT hide entities silently
  without a visible active filter
- Entity row: name, status pill (color-coded per handoff), `OriginBadge`, "Edit" link,
  "Delete" link, description, Motivation
  - **Deferred**: `relation` (relation to party), `faction` (related faction link), and
    `sessions` count columns → Out of MVP (NPC relation/party-relation, NPC↔faction,
    NPC↔session refs — confirmed out-of-MVP per proposal A7). MUST NOT render fabricated
    values for these; omit the columns entirely rather than showing a placeholder dash.
- Shared components: `Shell`, `Kicker`, `EmptyState`, `OriginBadge`, `Modal`, `Field`

States:
- **loading**: `Loading` while fetching campaign detail (NPCs are part of the detail
  payload)
- **error**: `ErrorNotice` with retry
- **empty**: 0 NPCs → `EmptyState` orn "◈", title "No NPCs yet", action "+ Add your first
  NPC"
- **success**: list of entity rows
- **creating** / **editing** (add/edit modal open), **deleting**: see `entity-management`
  capability

#### Scenario: NPCs load

- GIVEN campaign `c1` has 2 NPCs
- WHEN `/campaigns/c1/npcs` mounts
- THEN both NPCs render with name, status, description, and motivation

#### Scenario: No NPCs yet

- GIVEN campaign `c1` has 0 NPCs
- WHEN `/campaigns/c1/npcs` mounts
- THEN `EmptyState` "No NPCs yet" renders with a "+ Add your first NPC" action

### Requirement: Faction list screen

The system MUST render `/campaigns/:id/factions` per the `FactionsView` handoff
prototype, listing factions with name, posture, description, and objective, with
"+ New faction", per-row "Edit", and per-row "Delete" actions (mutation behavior
specified in `entity-management`).

Checklist:
- Breadcrumb: Campaigns / {campaign name} / Factions
- Header: `Kicker` "Campaign · Factions", H1 "Factions", subtitle with count, "+ New
  faction" primary action button
- Entity row: name, posture indicator (color-coded: Hostile=danger, Friendly=good,
  else=accent), `OriginBadge`, "Edit" link, "Delete" link, description, Objective
  - **Deferred**: `influence`, `npcs`/`arcs` related counts, and `lastReaction` →
    Out of MVP / Block 8 per proposal A7 (faction `influence`, faction↔NPC/arc counts,
    `lastReaction` → Block 8). Omit these columns; do not fabricate placeholder values.
  - **Deviation flagged, not silently dropped**: the handoff's inline `PostureSelect`
    (dropdown directly on the row for posture-only changes) is NOT implemented as a
    separate write path in Block 6. Posture editing happens exclusively through the edit
    `Modal` (see `entity-management`), since inline posture change is not enumerated as a
    distinct PATCH contract. This MUST be called out explicitly in the implementation's
    adversarial self-review.
- Shared components: `Shell`, `Kicker`, `EmptyState`, `OriginBadge`, `Modal`, `Field`

States:
- **loading**: `Loading` while fetching
- **error**: `ErrorNotice` with retry
- **empty**: 0 factions → `EmptyState` orn "⬡", title "No factions yet", action "+ Add a
  faction"
- **success**: list of entity rows

#### Scenario: Factions load

- GIVEN campaign `c1` has 1 faction
- WHEN `/campaigns/c1/factions` mounts
- THEN the faction renders with name, posture, description, and objective

#### Scenario: No factions yet

- GIVEN campaign `c1` has 0 factions
- WHEN `/campaigns/c1/factions` mounts
- THEN `EmptyState` "No factions yet" renders

### Requirement: Arc list screen (NEW)

The system MUST render `/campaigns/:id/arcs` per the `ArcsView` handoff prototype
(`handoff/app/views-arcs.jsx`), listing arcs with title, status pill, priority flag, and
description, with "+ New arc", per-row "Edit", and per-row "Delete" actions (mutation
behavior specified in `entity-management`).

Checklist:
- Breadcrumb: Campaigns / {campaign name} / Arcs
- Header: `Kicker` "Campaign · Open arcs", H1 "Open arcs", subtitle counting arcs with
  `status` in (`active`, `dormant`) ("N threads still in play"), "+ New arc" primary
  action button
- Filter bar: status filters (All, Active, Dormant, Resolved, Discarded) mapped to the
  four stable enum codes — MAY be implemented; not required for MVP if adds scope, but
  MUST NOT hide entities silently without a visible active filter
- Entity row: title, status pill (color-coded: active=good, dormant=accent,
  resolved=muted, discarded=danger — handoff naming; map to the lowercase codes),
  priority flag (high=danger, medium/low=muted), `OriginBadge`, "Edit" link, "Delete"
  link, description; rows with `status` in (`resolved`, `discarded`) render at reduced
  opacity (dimmed) per the handoff
  - **Deferred, Out of MVP**: `npcs` and `factions` related-count columns and the modal's
    "Related NPCs"/"Related factions" free-text fields → Out of MVP (relationship graph,
    confirmed out-of-MVP per proposal A2/A7). MUST NOT render or persist these.
  - **Deferred, Block 7**: `lastSession` column → Block 7 (no session data exists yet).
    Omit; do not fabricate a placeholder value.
  - **Deferred, later block (generation)**: the "Include in next session generation"
    checkbox → session-generation feature, out of Block 6 scope (no domain field backs
    it). Omit entirely.
  - **Deviation flagged, not silently dropped**: the handoff's inline "Resolve" /
    "Discard" / "Reopen" quick-action links (status-only PATCH shortcuts) are NOT
    implemented as separate write paths in Block 6. Status changes happen exclusively
    through the edit `Modal` (see `entity-management`), consistent with the same
    deviation already accepted for the faction `PostureSelect`. This MUST be called out
    explicitly in the implementation's adversarial self-review.
- Shared components: `Shell`, `Kicker`, `EmptyState`, `OriginBadge`, `Modal`, `Field`,
  `FilterBar`

States:
- **loading**: `Loading` while fetching campaign detail (arcs are part of the detail
  payload)
- **error**: `ErrorNotice` with retry
- **empty**: 0 arcs → `EmptyState` orn "↝", title "No arcs here", action "+ Add an arc"
- **success**: list of entity rows

Motion: consistent with the other entity list screens (`.ll-view-enter` on route change,
`.ll-rise` on row entrance, standard button press physics).

#### Scenario: Arcs load

- GIVEN campaign `c1` has 2 arcs, one `status="active"` and one `status="resolved"`
- WHEN `/campaigns/c1/arcs` mounts
- THEN both arcs render with title, status pill, priority flag, and description, and the
  resolved arc renders at reduced opacity

#### Scenario: No arcs yet

- GIVEN campaign `c1` has 0 arcs
- WHEN `/campaigns/c1/arcs` mounts
- THEN `EmptyState` "No arcs here" renders with a "+ Add an arc" action

### Requirement: Ownership enforced via existing RLS

The system MUST enforce campaign/NPC/faction/arc ownership through the per-user Supabase
client and RLS policies already established in Block 5, without introducing new policies.
This applies uniformly to reads AND to every create/update/delete endpoint specified in
`entity-management`.

#### Scenario: RLS blocks cross-user reads at the data layer

- GIVEN campaign `c1` belongs to user A
- WHEN user B's per-user Supabase client queries `c1` directly
- THEN RLS returns zero rows, independent of the API layer's own ownership check
