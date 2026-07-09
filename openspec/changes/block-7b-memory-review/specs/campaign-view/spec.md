# Delta for Campaign View

## MODIFIED Requirements

### Requirement: Campaign detail screen

The system MUST render `/campaigns/:id` per the `CampaignDetail` handoff prototype (`handoff/app/views-detail.jsx`), showing system/tone, world state (view + edit), the existing recent-sessions behavior, live active memories, and arcs needing attention. Active memories MUST come from `GET /campaigns/{id}/memory-facts?status=active`, show only active rows, and link or navigate to `/campaigns/:id/memory/review`. The campaign navigation MUST include a Memory affordance once the review route exists.
(Previously: Active memories were a dimmed Block 7 placeholder and the Memory metric/nav affordance was deferred.)

Field-by-field checklist:
- Breadcrumb: Campaigns / {campaign name}
- Header: `Kicker` "Campaign · {system} · {tone}", H1 campaign name, subtitle with update info
- Stat bar: NPCs, Factions, Arcs live and clickable; Memory MAY show live active count and navigate to memory review
- World-state section: display plus Edit textarea with Save changes/Cancel
- Recent sessions: unchanged by this delta
- Active memories: live active MemoryFacts, count, content/type/source metadata, empty state equivalent to “No memories yet”, and Memory review navigation
- Arcs needing attention: up to 3 arcs with `status` in (`active`, `dormant`), plus “All arcs” link
- Shared components: `Shell`, `Kicker`, `Loading`, `ErrorNotice`, `EmptyState`, `OriginBadge` where applicable

States:
- **loading**: initial detail and active-memory fetches → `Loading` primitive
- **error**: fetch fails → `ErrorNotice` with retry
- **not-found**: campaign does not exist or is not owned → distinct not-found state
- **success**: campaign detail renders with live active memories
- **active-memories-empty**: no active MemoryFacts → empty memory card
- **world-state editing/save success/save error**: textarea flow preserves unsaved draft on error

Motion: `.ll-view-enter` on route change; `.ll-rule-anim` on section reveals; button press physics; reduced-motion/`data-motion` respected.

#### Scenario: Detail loads successfully
- GIVEN campaign `c1` belongs to the requesting DM
- WHEN `/campaigns/c1` mounts
- THEN campaign data, arcs, unchanged session behavior, and active memories render from owned data sources

#### Scenario: Campaign not found or not owned
- GIVEN campaign `c1` does not belong to the requesting DM or does not exist
- WHEN `/campaigns/c1` mounts
- THEN a not-found state renders instead of campaign content

#### Scenario: Active memories are shown live
- GIVEN `c1` has 2 active memories and 1 archived memory
- WHEN the detail screen loads active memories
- THEN only the 2 active memories render and the Memory affordance points to review

#### Scenario: No active memories
- GIVEN `c1` has no active MemoryFacts
- WHEN the detail screen loads
- THEN the active memories section shows the empty state without fabricated rows
