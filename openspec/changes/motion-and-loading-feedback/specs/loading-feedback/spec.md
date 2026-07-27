# Delta for Loading Feedback

> Generalizes the house loading pattern already owned by `campaign-view`'s
> `campaign-detail-loading-feedback` requirements (section-shaped skeleton, `aria-busy`,
> localized `role="status"`, `aria-hidden` decoration, reserved height, no CLS,
> `recent-sessions.tsx:46-77` skeleton shape). This spec does not restate or contradict those
> requirements; it applies the same contract to the generated-session save paths (Area B, Unit 1)
> and to app-wide route navigation (Area B, Unit 2), and layers the mode-perceivability and
> teardown-safety contract onto the Area A motion migrations (Units 4-5), none of which any
> existing spec owns.

## Unit → Requirement map

| Unit | Area | Requirements in this file |
|---|---|---|
| 1 | B | Generated session save paths use `useMutation` pending state; Generated session save paths reject a duplicate submit while in flight |
| 2 | B | Every in-app navigation `<Link>` shows pending feedback |
| — (cross-cutting) | A + B | Loading and pending feedback remains perceivable in every motion mode |
| 5 | A | Suggestion-card teardown never depends on `animationend`; Per-card busy isolation is preserved through migration |

Unit 3 (token module + hook, zero call-site migrations) and Unit 4 (Modal migration) are owned by
`motion-system/spec.md`; this file only states the perceivability/teardown contract those units
must satisfy, not their animation mechanics.

## Out of Scope (this file)

- No feedback added to `copyAll` (clipboard write stays fire-and-forget per proposal §Non-goals).
- No elapsed-time or progress signal for long AI generation
  (`prepare-session-form.tsx` already acknowledges immediately; unaffected).
- No reopening of the conforming surfaces the exploration audit already found compliant
  (`NpcModal`, `WorldStateEditor`, `ConfirmDeleteModal`, `SessionExportView`, `LogSessionForm`,
  `PrepareSessionView`, `campaigns/new`, `campaigns/new/review`, `EntityListScreen`,
  `dashboard/page.tsx`, `login/page.tsx`, `memory/review` recover action, existing per-card
  `SuggestionCard` isolation logic itself).
- No `loading.tsx` files or Suspense-boundary route conversion (Unit 2's mechanism is
  `useLinkStatus`, not route-level Suspense; see `motion-system` non-goals for the full list
  carried from GitHub issue #99).
- No change to data, queries, APIs, query keys, caching, ordering, provenance, or persisted content.

## ADDED Requirements

### Requirement: Generated session save paths use `useMutation` pending state (Area B, Unit 1)

`GeneratedSessionView`'s `saveSection` and `saveAll` actions MUST be implemented as
TanStack Query `useMutation` calls, matching the house pattern already used by `NpcModal` and
`WorldStateEditor`. While either mutation is pending, its triggering button MUST be disabled and
MUST relabel to an in-flight copy (localized in `en` and `es`, e.g. "Saving…" per the existing
`Entities.saving` / `MemoryReview.saving` precedent). This state MUST be perceivable in every
`data-motion` mode (`full`, `subtle`, `off`) and under `prefers-reduced-motion: reduce`, because a
disabled button and a relabelled button are DOM/text state, not CSS animation.

Disabled + relabel — not a full-view `LoadingScribe` takeover — is the deliberate pattern here,
matching the inline, per-section nature of this edit surface (the DM stays looking at the section
they are editing) rather than the full-screen mutations that `LoadingScribe` takeovers gate
elsewhere (e.g. `campaigns/new`, `PrepareSessionView`). This is not a weaker-pattern gap; it mirrors
`NpcModal` / `WorldStateEditor`, which use the same inline pattern for the same reason.

#### Handoff checklist (non-negotiable)

- Both buttons (`Save section changes`, `Save changes`) SHALL disable via the `useMutation`
  `isPending` flag and SHALL relabel to an in-flight copy string, matching the `NpcModal` /
  `WorldStateEditor` disabled+label pattern — not a `LoadingScribe` full-view takeover.
- New in-flight labels SHALL be added to both `apps/web/messages/en.json` and
  `apps/web/messages/es.json` under the `SessionGeneration.generated` namespace; no hard-coded
  English literal SHALL ship.
- Existing success/error copy (`toast.sectionSaved`, `toast.allSaved`, `sectionSaveError`,
  `saveAllError`) and the existing `Notice` error rendering SHALL remain unchanged in text and
  trigger condition.
- The pending state SHALL use no new color, radius, or shadow token; only `disabled` attribute
  styling already defined for `Button` applies.
- Manual acceptance: verify the pending/disabled/relabel state visually at ≤900px viewport width,
  and under all three `data-motion` modes (`full`, `subtle`, `off`), before sign-off.

#### Scenario: Save section changes shows pending state

- GIVEN a DM is editing a section and clicks "Save section changes"
- WHEN the `useMutation` for `saveSection` is pending
- THEN the button is disabled and its label switches to the in-flight copy
- AND the pending state renders identically under `data-motion="full"`, `"subtle"`, and `"off"`

#### Scenario: Save all changes shows pending state

- GIVEN a DM clicks "Save changes" with one or more sections edited
- WHEN the `useMutation` for `saveAll` is pending
- THEN the button is disabled and its label switches to the in-flight copy
- AND the pending state renders identically in every motion mode

#### Scenario: Save section changes resolves to success

- GIVEN the `saveSection` mutation is pending
- WHEN the PATCH resolves successfully
- THEN the button re-enables, its label reverts, the section closes its editor, and the existing
  "section saved" toast renders

#### Scenario: Save all changes resolves to success

- GIVEN the `saveAll` mutation is pending
- WHEN the PATCH resolves successfully
- THEN the button re-enables, its label reverts, and the existing "all saved" toast renders

#### Scenario: Save section changes resolves to error

- GIVEN the `saveSection` mutation is pending
- WHEN the PATCH rejects
- THEN the button re-enables, its label reverts, and the existing localized section-save error
  `Notice` renders without discarding the DM's draft text

#### Scenario: Save all changes resolves to error

- GIVEN the `saveAll` mutation is pending
- WHEN the PATCH rejects
- THEN the button re-enables, its label reverts, and the existing localized save-all error `Notice`
  renders without discarding the DM's draft text

### Requirement: Generated session save paths reject a duplicate submit while in flight (Area B, Unit 1)

In addition to disabling the triggering button, `saveSection` and `saveAll` MUST each contain an
explicit guard clause that returns without issuing a second PATCH request when that same mutation
is already pending for the same section (or for the whole-session save). This is deliberate defence
in depth beyond the disabled button, because this path writes persisted draft content and a race
between the disabled-attribute paint and a fast second click, a keyboard-triggered submit, or a
programmatic call MUST NOT be able to fire two in-flight PATCHes against the same session.

#### Handoff checklist (non-negotiable)

- The guard clause SHALL be an explicit early return inside `saveSection` / `saveAll` (or their
  `useMutation` wrapper), independent of and in addition to the disabled button — not a
  replacement for it.
- No new user-visible copy is introduced by the guard itself; a blocked duplicate call SHALL be
  silent (no error `Notice`), since it is not a failure, it is a no-op.
- Manual acceptance: verify no duplicate PATCH fires under a rapid double-click at ≤900px viewport
  width, in at least one motion mode.

#### Scenario: A second click on Save section changes while pending is a no-op

- GIVEN `saveSection` is pending for section `synopsis`
- WHEN `saveSection('synopsis')` is invoked again before the first call resolves
- THEN the guard clause returns immediately
- AND only one PATCH request for that section is issued for the pending window

#### Scenario: A second click on Save changes while pending is a no-op

- GIVEN `saveAll` is pending
- WHEN `saveAll()` is invoked again before the first call resolves
- THEN the guard clause returns immediately
- AND only one PATCH request for the whole-session save is issued for the pending window

#### Scenario: Guard clause does not block a save once the prior mutation has settled

- GIVEN `saveSection` for section `synopsis` has resolved (success or error)
- WHEN the DM triggers `saveSection('synopsis')` again
- THEN the guard clause does not block the new call and a new PATCH request is issued

### Requirement: Every in-app navigation `<Link>` shows pending feedback (Area B, Unit 2)

Every `<Link>` under `apps/web/components/**` and `apps/web/app/[locale]/**` whose `href` targets a
route under `apps/web/app/[locale]/**` MUST render a pending-navigation affordance via Next.js
`useLinkStatus`, read from a Client Component descendant of that `<Link>`, for the window between
click and the target route mounting its own loading branch. This includes `<Link>`s declared inside
`apps/web/components/layout/app-header.tsx` (the app shell's persistent top nav) as well as those
inside individual screens and cards. In-page anchor/hash links and external links (any `href` not
resolving to an in-app route) are excluded — `useLinkStatus` reports nothing useful for them. This
affordance MUST be perceivable in every `data-motion` mode and under `prefers-reduced-motion:
reduce`, because pending navigation feedback is essential state feedback, not decoration (Derived
rule, proposal §Approach).

#### Handoff checklist (non-negotiable)

- Every qualifying `<Link>` SHALL gain a `useLinkStatus`-driven pending affordance, wherever it is
  declared — `apps/web/components/layout/app-header.tsx`, card/list components under
  `apps/web/components/**`, and any inline `<Link>` in a route `page.tsx`.
- No global top-of-page progress bar SHALL be introduced (rejected mechanism, Engram #942 / proposal
  §Approach); the affordance is per-`Link`, not a shared/global indicator.
- New pending-navigation copy or `aria-label`, if any, SHALL be added to both `en.json` and
  `es.json`.
- Verification for this unit is pattern-level, over a representative sample of route-declaration
  classes, NOT exhaustive per-`Link` — otherwise the criterion is unsatisfiable and stalls apply
  (proposal risk table). The representative sample SHALL include at minimum: one breadcrumb link,
  one card/list-row link, one `app-header.tsx` nav link, and one CTA button-styled link.
- Manual acceptance per representative sample class: verify the pending affordance visually at
  ≤900px viewport width and under all three `data-motion` modes.

#### Scenario: Clicking an in-app Link shows a pending affordance

- GIVEN a DM clicks a `<Link>` targeting a route under `apps/web/app/[locale]/**`
- WHEN `useLinkStatus` reports `pending: true` for that link
- THEN a pending-navigation affordance renders on or adjacent to that link

#### Scenario: Pending affordance clears once the target route paints

- GIVEN a pending-navigation affordance is showing for a clicked Link
- WHEN the target route mounts and takes over the loading state
- THEN the Link's pending affordance is no longer shown

#### Scenario: Hash and external links are excluded

- GIVEN a `<Link>` targets an in-page hash anchor or an external URL
- WHEN the DM clicks it
- THEN no `useLinkStatus`-driven pending affordance is required or rendered for that link

#### Scenario: Pending affordance is perceivable in every motion mode

- GIVEN a `<Link>` navigation is pending
- WHEN `data-motion` is `"full"`, `"subtle"`, or `"off"`, or `prefers-reduced-motion: reduce` is set
- THEN the pending affordance is visible/perceivable in all four conditions, because it involves no
  Motion animation and is not subject to the CSS-only mode-gating constraint

#### Scenario: Verification is pattern-level, not exhaustive per-`Link`

- GIVEN Unit 2's single PR touches every qualifying `<Link>` across the app
- WHEN acceptance is verified
- THEN it is verified by sampling one representative `<Link>` per declaration class (breadcrumb,
  card/list row, `app-header.tsx` nav item, CTA button-link), not by individually verifying every
  `<Link>` instance in the codebase

### Requirement: Loading and pending feedback remains perceivable in every motion mode

Every essential state-feedback affordance introduced or migrated by this change — mutation
pending state (Unit 1), navigation pending state (Unit 2), modal open/close state (Unit 4), and
suggestion-card accepted/dismissed state (Unit 5) — MUST remain perceivable under
`data-motion="full"`, `"subtle"`, `"off"`, and under OS `prefers-reduced-motion: reduce`. Only
decorative movement (entrance choreography, stagger, stamp-pop, strike-draw, slide-out) MAY be
reduced or removed in `subtle`/`off`/reduced motion; the underlying state change
(disabled/enabled, labelled/unlabelled, open/closed, present/removed) MUST NOT depend on that
movement running. This requirement exists because `apps/web/app/globals.css:248-253`'s blanket
`[data-motion='off'] * { animation: none !important }` rule has no effect on Motion-driven
animation (Motion sets inline `transform`/`opacity` styles from JavaScript, not CSS
`animation`/`transition` properties), so any new or migrated Motion-driven affordance that does not
independently read `useMotionMode()` (see `motion-system/spec.md`) would silently escape this
contract.

#### Scenario: Save pending state is perceivable under full motion

- GIVEN `data-motion="full"`
- WHEN `saveSection` or `saveAll` is pending
- THEN the disabled state and in-flight label are visible

#### Scenario: Save pending state is perceivable under subtle motion

- GIVEN `data-motion="subtle"`
- WHEN `saveSection` or `saveAll` is pending
- THEN the disabled state and in-flight label are visible, with no decorative entrance animation

#### Scenario: Save pending state is perceivable under motion off

- GIVEN `data-motion="off"`
- WHEN `saveSection` or `saveAll` is pending
- THEN the disabled state and in-flight label are visible, with no animation of any kind

#### Scenario: Modal open/close state is perceivable in every motion mode

- GIVEN `Modal` is opened or closed
- WHEN `data-motion` is `"full"`, `"subtle"`, or `"off"`, or `prefers-reduced-motion: reduce` is set
- THEN the modal is present (open) or absent (closed) from the DOM/accessibility tree in every
  condition, independent of whether its entrance/exit transition animates. See
  `motion-system/spec.md` for the animation mechanics themselves.

#### Scenario: Suggestion card accepted state is perceivable in every motion mode

- GIVEN a suggestion is accepted
- WHEN `data-motion` is `"full"`, `"subtle"`, or `"off"`
- THEN the accepted stamp text is rendered and readable in all three modes (as a static badge under
  `subtle`/`off`, animated under `full`), and the card is subsequently removed from the DOM in all
  three modes

#### Scenario: Suggestion card dismissed state is perceivable in every motion mode

- GIVEN a suggestion is dismissed
- WHEN `data-motion` is `"full"`, `"subtle"`, or `"off"`
- THEN the strike-through indication is rendered in all three modes (as a static text-decoration
  under `subtle`/`off`, animated under `full`), and the card is subsequently removed from the DOM in
  all three modes

### Requirement: Suggestion-card teardown never depends on `animationend` (Area A, Unit 5)

`SuggestionCard` accept and dismiss teardown MUST NOT be gated on a CSS `animationend` listener.
`.ll-stamp`, `.ll-strike`, `.ll-discarding`, and `.ll-accepting` are static (non-animated) under
`data-motion="subtle"` and `"off"` (`apps/web/app/globals.css:432-460`), so `animationend` never
fires there; a migration that gated DOM removal on that event would strand the card on screen
forever in those two modes. Teardown MUST instead be driven by `window.setTimeout` (as today) or by
Motion's `onAnimationComplete` callback, and only after verifying `onAnimationComplete` fires at
`duration: 0` (the `subtle`/`off` case) in the target Motion version. See `motion-system/spec.md`
for the accompanying animation-mechanics requirement over the same migration.

#### Handoff checklist (non-negotiable)

- Per-card `isSubmitting` busy isolation SHALL remain unchanged (siblings interactive during
  another card's in-flight accept) — see the dedicated requirement below.
- The stamp-pop → hold → file-away and strike → slide-out sequencing SHALL preserve their existing
  timing constants (`STAMP_POP_MS`, `STAMP_HOLD_MS`, `CARD_EXIT_MS`, `STAMP_LIFETIME_MS`) unless
  the design phase documents and justifies a change.
- Manual acceptance: verify accept and dismiss teardown visually at ≤900px viewport width, under
  all three `data-motion` modes, confirming no card is ever stranded on screen.

#### Scenario: Accepted card tears down under full motion

- GIVEN a suggestion is accepted under `data-motion="full"`
- WHEN the stamp-hold window elapses
- THEN the card is removed from the DOM via a timer or `onAnimationComplete`, not an
  `animationend` listener

#### Scenario: Accepted card tears down under subtle motion

- GIVEN a suggestion is accepted under `data-motion="subtle"`
- WHEN the stamp-hold window elapses
- THEN the card is removed from the DOM even though `.ll-stamp` ran no CSS animation and no
  `animationend` event fired

#### Scenario: Accepted card tears down under motion off

- GIVEN a suggestion is accepted under `data-motion="off"`
- WHEN the stamp-hold window elapses
- THEN the card is removed from the DOM even though `.ll-stamp` ran no CSS animation and no
  `animationend` event fired

#### Scenario: Dismissed card tears down under subtle and off motion

- GIVEN a suggestion is dismissed under `data-motion="subtle"` or `"off"`
- WHEN the exit window elapses
- THEN the card is removed from the DOM even though `.ll-discarding` / `.ll-strike` ran no CSS
  animation and no `animationend` event fired

### Requirement: Per-card busy isolation is preserved through migration (Area A, Unit 5)

`SuggestionCard`'s existing per-suggestion `isSubmitting` isolation (siblings stay interactive
while one card's accept is in flight) MUST be preserved unchanged through the `fx`
state-machine migration to `AnimatePresence`/`layout`.

#### Scenario: Accepting one card leaves siblings interactive

- GIVEN two suggestion cards are both pending review
- WHEN the DM accepts the first card
- THEN the second card's Accept, Edit, and Dismiss controls remain enabled and unaffected
