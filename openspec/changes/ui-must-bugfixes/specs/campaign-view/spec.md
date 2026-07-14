# Delta for campaign-view

## MODIFIED Requirements

### Requirement: List owned campaigns

The system MUST expose `GET /campaigns` returning only campaigns owned by the
authenticated user, ordered by `updated_at` descending.

Response item: `{ id, title, description, updated_at, system, tone, npc_count, faction_count, arc_count, session_count, memory_count }`.
`session_count` MUST reflect all sessions belonging to the campaign. `memory_count` MUST
reflect only **active** memory facts (archived facts and transient, unpersisted memory
suggestions MUST NOT be counted). Campaign `status` is out of MVP scope and MUST NOT
appear in this response.
(Previously: response item only included `npc_count`, `faction_count`, `arc_count`.)

#### Scenario: DM has campaigns

- GIVEN an authenticated DM owns 2 campaigns
- WHEN they call `GET /campaigns`
- THEN the response is 200 with exactly those 2 campaigns, newest `updated_at` first

#### Scenario: DM owns no campaigns

- GIVEN an authenticated DM owns 0 campaigns
- WHEN they call `GET /campaigns`
- THEN the response is 200 with an empty array

#### Scenario: Unauthenticated request

- GIVEN no valid Supabase JWT is provided
- WHEN `GET /campaigns` is called
- THEN the response is 401

#### Scenario: Session and memory counts are correct and excludes archived memories

- GIVEN campaign `c1` has 5 sessions, 3 active memory facts, and 2 archived memory facts
- WHEN an authenticated owner calls `GET /campaigns`
- THEN the entry for `c1` has `session_count: 5` and `memory_count: 3`

#### Scenario: Zero sessions and zero memories render as numeric zero

- GIVEN campaign `c2` has 0 sessions and 0 active memory facts
- WHEN an authenticated owner calls `GET /campaigns`
- THEN the entry for `c2` has `session_count: 0` and `memory_count: 0`

### Requirement: Dashboard campaign list screen

The system MUST render `/dashboard` per the `Dashboard` handoff prototype
(`handoff/app/views-dashboard.jsx`), replacing the current placeholder.

Field-by-field checklist (source of truth: handoff):
- Breadcrumb: "Your chronicles" (`ll-crumb`)
- Header: `Kicker` "Campaigns", H1 "Your chronicles", subtitle summarizing campaign count
- Primary action: "+ New campaign" button → navigates to `/campaigns/new`
- Search input: placeholder "Search campaigns…", client-side filter by name/system, helper
  text "{shown} of {total}"
- Campaign cards (`CampaignCard`): title, system + tone line, 5 stat columns in the order
  Sessions, NPCs, Factions, Memories, Open arcs, "Updated {date}" footer, "Open
  chronicle →" link; entire card clickable → `/campaigns/:id`
  - Sessions and Memories stat columns are now **live**, sourced from `GET /campaigns`'s
    `session_count` and `memory_count`. Zero renders as the numeric `0`, matching how
    NPCs/Factions/Arcs already render zero (never a placeholder dash).
  - **Deferred, do not implement as data-bound**: the handoff's status pill (campaign
    `status` — Out of MVP, no backend field). Stat order and the visual contract
    (5-column layout, stat labels) MUST be preserved unchanged.
(Previously: Sessions and Memories were listed as deferred placeholders pending Block 7
session/memory data, rendered as `'—'`; the endpoint hedge about counts requiring a
follow-up no longer applies since `GET /campaigns` now includes both fields.)

- Shared components used: `Shell`, `Kicker`, `EmptyState`
- Grid: 2 columns desktop, collapses to 1 column ≤760px

States (each MUST be implemented individually, per contract skill):
- **loading**: initial fetch in flight → use `Loading` primitive (quill animation) while
  `GET /campaigns` resolves
- **error**: fetch fails → `ErrorNotice` with retry action
- **empty**: 0 campaigns → `EmptyState` with title "Your chronicle starts here", CTA
  "+ Create your first campaign" → `/campaigns/new`
- **empty-search**: search yields 0 matches → `EmptyState` ornament "✦", title "No campaigns
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

- GIVEN `GET /campaigns` returns a 5xx or network error
- WHEN `/dashboard` mounts
- THEN `ErrorNotice` renders with a retry action that re-triggers the fetch

#### Scenario: Search filters client-side

- GIVEN the DM has campaigns "The Salt Road" and "Sombras sobre Phandalin"
- WHEN they type "salt" into the search input
- THEN only "The Salt Road" renders, and the helper text reads "1 of 2"

#### Scenario: Card shows real Sessions and Memories counts in the correct stat order

- GIVEN campaign `c1` has `session_count: 5`, `npc_count: 2`, `faction_count: 1`,
  `memory_count: 3`, `arc_count: 4`
- WHEN its `CampaignCard` renders
- THEN the 5 stat columns display, in order, Sessions "5", NPCs "2", Factions "1",
  Memories "3", Open arcs "4"

#### Scenario: Card shows zero Sessions/Memories as numeric zero

- GIVEN campaign `c2` has `session_count: 0` and `memory_count: 0`
- WHEN its `CampaignCard` renders
- THEN the Sessions and Memories stat columns display "0", not a placeholder dash
