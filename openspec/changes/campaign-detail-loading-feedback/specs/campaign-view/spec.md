# Delta for Campaign View

## MODIFIED Requirements

### Requirement: Campaign detail screen

The system SHALL render `/campaigns/:id` as the `CampaignDetail` handoff, retaining its breadcrumb, header, system/tone, world-state editing, stat ledger, and live arcs behavior. The `/02 Recent sessions` and `/04 Active memories` sections SHALL independently show local, section-shaped pending feedback instead of static placeholders. On success, each Recent sessions row SHALL present its existing title as the primary content followed by an excerpt of its existing occurrence text clamped to at most two visual lines; it SHALL NOT render the fuller body presentation. (Previously: these two sections were dimmed, static Block-7 placeholders, and Recent sessions used the fuller body presentation.)

#### Handoff checklist (non-negotiable)

- The route, page order, editorial `llg` two-column layout, 900px single-column collapse, section widths, `/02` and `/04` headings, and their existing navigation links SHALL remain unchanged and focusable.
- Neither section has fields. Loading copy SHALL come from the active locale catalog; it SHALL be concise and section-specific. A pending section SHALL expose `aria-busy="true"` and a localized `role="status"` live announcement; bars and any quill glyph SHALL be `aria-hidden`, unfocusable, and create no focus trap.
- Recent sessions loading SHALL reserve the minimum block height of three dense session rows, each shaped as one title bar and up to two excerpt bars; Active memories loading SHALL reserve roughly three record rows. Skeletons SHALL be structurally distinct, local markup or at most one small presentational primitive, and SHALL NOT use `LoadingScribe`, a global loader, a spinner, false data, or a shared component that erases either geometry.
- Print Chronicle feedback SHALL use radius `0`, `--paper`, `--border`, `--dotted`, hard `--shadow`, serif reading rhythm, mono status text, and semantic emerald only. It SHALL NOT add colors, gradients, glass, or soft shadows.
- Under `data-motion="full"`, only a 150–200ms transform/opacity or background-position settle MAY run; content SHALL be visible without it. Under `subtle`, `off`, or reduced motion, skeletons and replacement SHALL be static/instant with all new animation disabled.
- Implementation SHALL NOT change data, queries, APIs, keys, caching, ordering, provenance, other layout, or navigation destinations. Existing retry behavior and all non-loading behavior SHALL remain intact.

#### Scenario: Recent sessions loading

- GIVEN the Recent sessions query is pending
- WHEN `/campaigns/:id` renders
- THEN `/02` shows its localized status and `aria-busy="true"` three-row dense skeleton
- AND each placeholder row contains one title bar and no more than two excerpt bars

#### Scenario: Recent sessions error

- GIVEN the Recent sessions query fails
- WHEN its pending state resolves
- THEN the existing localized inline error renders without fabricated rows

#### Scenario: Recent sessions empty

- GIVEN the Recent sessions query resolves empty
- WHEN `/02` updates
- THEN the existing ornamented `EmptyState` and `Log session` CTA render

#### Scenario: Recent sessions success

- GIVEN the Recent sessions query resolves with sessions
- WHEN `/02` updates
- THEN its status is replaced by at most three rows in the existing chronological order
- AND every row renders its existing title before an existing-occurrence excerpt limited to two visual lines
- AND generated-draft links, the Resume draft affordance, and provenance remain unchanged

#### Scenario: Active memories loading

- GIVEN the Active memories query is pending
- WHEN `/campaigns/:id` renders
- THEN `/04` shows its localized status and three-record-shaped, busy skeleton

#### Scenario: Active memories error

- GIVEN the Active memories query fails
- WHEN its pending state resolves
- THEN the existing localized danger panel and keyboard-operable retry action render

#### Scenario: Active memories empty

- GIVEN the Active memories query resolves empty
- WHEN `/04` updates
- THEN the existing dashed panel and localized `No memories yet` copy render

#### Scenario: Active memories success

- GIVEN the Active memories query resolves with facts
- WHEN `/04` updates
- THEN only existing live type, content, accepted-source, and provenance values render

#### Scenario: Deferred-query replacement is testable

- GIVEN a deferred query for either section and English or Spanish locale messages
- WHEN the promise is resolved in a test
- THEN its localized loading status disappears and its corresponding existing resolved state replaces it without asserting CSS classes
