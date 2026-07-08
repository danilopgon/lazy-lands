# Session Log UI Specification

## Purpose

Give the DM a screen to log what happened in a session (`/campaigns/:id/sessions/new` →
`LogSession`, `handoff/app/views-sessions.jsx`) and wire the campaign detail's session
history placeholder to live data. Source of truth for field-by-field behavior is the
handoff prototype; deviations (dropped fields) are documented below and MUST NOT be
silently reintroduced.

## Requirements

### Requirement: Log Session form screen

The system MUST render `/campaigns/:id/sessions/new` with:
- Breadcrumb "Campaigns / {campaign name} / Log session"
- `Kicker` "After the table clears", H1 "Log what happened"
- Subtitle: "Write it the way you'd tell a friend. The Scribe will read your record and
  propose memories; you decide what the campaign keeps."
- Two fields only: "What happened" (`summary`, required textarea) and "Consequences"
  (`consequences`, optional textarea)
- Submit button (accent): "Save session & review memories"
- Shared components: `Shell`, `Kicker`, `Field` (label/optional/help/error), `Loading`,
  `ErrorNotice`

**Deferred, do not implement** (handoff deviation, documented per proposal/design): the
handoff's "Session title" field, the editable "Session #" field, separate world-state /
NPC-changes / faction-changes / arcs-touched / private-notes fields. `session_number` is
always server-assigned (see `session-registration`); there is no client-side concatenation
of these dropped fields into `summary`/`consequences`.

#### Scenario: Form renders with only the two in-scope fields

- GIVEN a DM navigates to `/campaigns/c1/sessions/new`
- WHEN the form renders
- THEN only "What happened" and "Consequences" fields are shown, with no "Session title"
  or "Session #" input

### Requirement: Form states

Each state MUST be implemented individually:

- **form** (default): both fields editable, submit enabled
- **summary-required**: submitting with an empty `summary` shows the field error "The
  summary is the one thing the Scribe can't work without." and blocks submission (no
  request sent)
- **saving**: full `Loading` state, title "Chronicling the session", sub "Saving your
  record and asking the Scribe what's worth remembering", quill motion; form fields are
  not editable
- **error**: `ErrorNotice` with a retry action; the DM's typed `summary`/`consequences`
  text MUST be preserved (not cleared) with copy "Your text is safe; nothing you wrote was
  lost. Try again."
- **success**: navigates to `/campaigns/:id` (campaign detail) — NOT `/memory/review`;
  returned `memory_suggestions` have no 7a UI consumer

#### Scenario: Empty summary blocks submit

- GIVEN the DM leaves "What happened" empty
- WHEN they click "Save session & review memories"
- THEN the field error "The summary is the one thing the Scribe can't work without."
  renders and no request is sent

#### Scenario: Successful save navigates to campaign detail

- GIVEN the DM fills a valid `summary`
- WHEN the save request succeeds
- THEN the app navigates to `/campaigns/:id`, not to a memory-review screen

#### Scenario: Save failure preserves typed text

- GIVEN the DM has typed a `summary` and `consequences`
- WHEN the save request fails
- THEN `ErrorNotice` renders with retry, and the typed text remains in both fields
  unchanged

#### Scenario: Saving state shows Scribe-in-progress feedback

- GIVEN the DM submits a valid form
- WHEN the request is in flight
- THEN the full `Loading` state renders with "Chronicling the session" and the quill motion,
  and the form is not interactive

### Requirement: Motion and accessibility

The route MUST enter with the standard `fadeInRise` transition; the submit button MUST
follow standard press physics; the `saving` state MUST use the quill loading motion.
All motion MUST respect `prefers-reduced-motion: reduce` and the app's `data-motion`
levels (full/subtle/off).

#### Scenario: Reduced motion is respected

- GIVEN the user has `prefers-reduced-motion: reduce` set
- WHEN the Log Session screen renders and transitions
- THEN entrance and loading animations are suppressed or minimized per the app's existing
  motion contract

### Requirement: Localized copy

All user-facing copy on this screen (breadcrumb, kicker, headings, subtitle, field labels,
errors, loading copy, button text) MUST be present in both English and Spanish message
catalogs, with no hard-coded English strings. Spanish copy MUST use "Dungeon Master"/"DM"
terminology and MUST NOT use em dashes.

#### Scenario: Spanish locale renders localized copy

- GIVEN the active locale is `es`
- WHEN `/es/campaigns/c1/sessions/new` renders
- THEN all screen copy is Spanish, uses "Dungeon Master"/"DM", and contains no em dashes

### Requirement: Campaign detail session history

The campaign detail screen's "Recent sessions" area (previously a static "coming in a
later chapter" placeholder) MUST be replaced with a live list sourced from
`GET /campaigns/{id}/sessions`, rendered in chronological order, with an empty state when
no sessions exist yet, and a "Log session" call to action.

#### Scenario: Recent sessions render live data

- GIVEN campaign `c1` has 2 sessions
- WHEN `/campaigns/c1` mounts
- THEN the "Recent sessions" area shows both sessions (no longer the static placeholder)

#### Scenario: No sessions yet

- GIVEN campaign `c1` has 0 sessions
- WHEN `/campaigns/c1` mounts
- THEN the "Recent sessions" area shows an empty state with a "Log session" call to action
