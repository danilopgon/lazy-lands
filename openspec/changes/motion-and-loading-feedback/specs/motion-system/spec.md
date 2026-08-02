# Delta for Motion System

> Area A (motion unification, GitHub issue #99). Non-goals carried verbatim from the issue and
> binding on every requirement below: no visual identity redesign, no animation added to every
> component or route, no GSAP/Lenis/Rive/Three.js, no marketing-site scroll rewrite, no change to
> domain behavior/API contracts/persistence/generation flows, no client-component conversion purely
> for cosmetic animation, no Motion+ / paid Motion AI Kit dependency, no internal animation
> framework beyond a few thin primitives. `.ll-view-enter` stays CSS and is explicitly NOT migrated
> (one-shot mount animation, no unmount/layout concern — the issue's own CSS-ownership rule).
> `apps/web/components/hero/*` is read as the existing Motion idiom precedent and is NOT itself
> migrated.

## Unit → Requirement map

| Unit | Area | Requirements in this file |
|---|---|---|
| 3 | A | A single shared motion-mode hook governs every Motion-driven animation |
| 4 | A | `Modal` entrance/exit is mode-aware and preserves its accessibility mechanics |
| 5 | A | `SuggestionCard` fx state machine is mode-aware and preserves teardown safety |

Units 4 and 5 depend on Unit 3. The perceivability and teardown-safety contract these units must
also satisfy is owned by `loading-feedback/spec.md` (cross-referenced inline below); this file owns
the animation mechanics only.

## ADDED Requirements

### Requirement: A single shared motion-mode hook governs every Motion-driven animation (Area A, Unit 3)

`apps/web/lib/motion/` MUST expose a token module (durations, easings, stagger values) and a
`useMotionMode()` hook that reads the app's `data-motion` attribute off `<html>`
(`"full" | "subtle" | "off"`) and OS `prefers-reduced-motion` via
`window.matchMedia('(prefers-reduced-motion: reduce)')`, combining them into one effective mode.
Every component that animates via the `motion` library (not plain CSS) MUST read this hook and
MUST run at `duration: 0` (or an equivalent disabled/instant variant) whenever the effective mode is
`"subtle"`, `"off"`, or reduced-motion is set at the OS level. This is the structural fix for the
constraint that CSS-only mode gating (`apps/web/app/globals.css:248-253`'s blanket
`[data-motion='off'] * { animation: none !important }` rule) has no effect on Motion, because Motion
animates inline `transform`/`opacity` styles from JavaScript, not the `animation`/`transition` CSS
properties that selector targets.

#### Handoff checklist (non-negotiable)

- The token module (`apps/web/lib/motion/`, extending `timings.ts`) SHALL export shared durations,
  easings, and stagger values; `components/motion/` primitives SHALL be few and thin (wrappers over
  `motion` + `useMotionMode()`), not an internal framework.
- `useMotionMode()` SHALL combine `data-motion` (`"full" | "subtle" | "off"`) read off `<html>` with
  `window.matchMedia('(prefers-reduced-motion: reduce)')` into one effective mode.
- No existing call site SHALL change behavior in this unit; it is scaffolding only.
- No new copy is introduced by this unit, so no `en.json` / `es.json` change is required here.
- Manual acceptance: confirm zero visual/behavioral diff at ≤900px viewport width across all three
  `data-motion` modes after this unit lands (regression check, not a new-feature check).

#### Scenario: A Motion-driven primitive runs full duration under full motion

- GIVEN `data-motion="full"` and no OS reduced-motion preference
- WHEN a `components/motion/` primitive mounts or transitions
- THEN it animates using the token module's durations and easings

#### Scenario: A Motion-driven primitive runs zero duration under subtle motion

- GIVEN `data-motion="subtle"`
- WHEN a `components/motion/` primitive mounts or transitions
- THEN it renders its resolved state at `duration: 0` (or an equivalent instant/disabled variant),
  with no animated transform or opacity ramp

#### Scenario: A Motion-driven primitive runs zero duration under motion off

- GIVEN `data-motion="off"`
- WHEN a `components/motion/` primitive mounts or transitions
- THEN it renders its resolved state at `duration: 0`, identically to the subtle case

#### Scenario: A Motion-driven primitive respects OS reduced motion regardless of app mode

- GIVEN `data-motion="full"` but the OS reports `prefers-reduced-motion: reduce`
- WHEN a `components/motion/` primitive mounts or transitions
- THEN it renders at `duration: 0`, because the effective mode combines both signals

#### Scenario: Unit 3 ships zero behavior change

- GIVEN the token module, `useMotionMode()` hook, and `components/motion/` primitive scaffolding
  are added
- WHEN no existing call site is migrated to consume them yet
- THEN no rendered output, animation, or interaction anywhere in the app changes

### Requirement: `Modal` entrance/exit is mode-aware and preserves its accessibility mechanics (Area A, Unit 4)

`apps/web/components/ui/modal.tsx` MUST migrate its entrance/exit visual state from the Tailwind
`motion-safe:` / `motion-reduced:` utility classes (OS-level only, and blind to the app's own
`data-motion="subtle"` mode — the pre-existing gap this requirement closes) to `AnimatePresence`
driven by `useMotionMode()`. The migration MUST be surgical: portal rendering via
`createPortal(..., document.body)`, the focus trap (initial focus + Tab/Shift+Tab cycling), Escape
key close, backdrop-click close, body-scroll lock, and focus restoration on close MUST all continue
to work exactly as before. Because production parents conditionally unmount the complete modal
subtree, each entity route MUST keep `ModalPresence` mounted above its entity-modal and delete-modal
conditionals so Motion can complete the exit. Only presence ownership and the entrance/exit
transform/opacity state change. See
`loading-feedback/spec.md`'s "Modal open/close state is perceivable in every motion mode" scenario
for the accompanying perceivability contract this migration must also satisfy.

#### Handoff checklist (non-negotiable)

- Motion SHALL replace the `motion-safe:`/`motion-reduced:` Tailwind classes at `modal.tsx:113`
  (backdrop) and `:122` (panel); no `Modal` prop or a11y attribute SHALL change.
- `ModalPresence` SHALL remain mounted above both conditional modal boundaries in each shipped and
  demo NPC, faction, and arc route. These six route edits SHALL be the same mechanical wrapper
  pattern and SHALL NOT change modal selection, CRUD behavior, or copy.
- Portal target (`document.body`), `role="dialog"`, `aria-modal="true"`, `aria-labelledby`, the
  `FOCUSABLE_SELECTOR` focus trap, Escape handling, backdrop-click close, `body.style.overflow`
  scroll lock, and focus restoration to `previousFocusRef` SHALL remain byte-for-byte behaviorally
  identical.
- The `subtle`-mode gap SHALL be closed inside this unit (not filed as a separate bugfix PR) — a
  scope decision the exploration/proposal already settled and this spec reflects.
- No visual token (border, shadow, radius, Print Chronicle palette) changes; only the
  animation-driving mechanism changes.
- No new copy is introduced by this unit.
- Manual acceptance: verify modal open/close visually at ≤900px viewport width, under all three
  `data-motion` modes, confirming portal/focus-trap/Escape/backdrop/scroll-lock/restoration are
  unaffected.

#### Scenario: Modal animates its entrance under full motion

- GIVEN `data-motion="full"`
- WHEN a `Modal` opens
- THEN its backdrop and panel animate in via `AnimatePresence`

#### Scenario: A conditionally rendered modal completes its exit

- GIVEN a shipped entity route keeps `ModalPresence` mounted above its conditional modal subtree
- WHEN closing changes the route's modal state to `null`
- THEN the exiting dialog remains present only for the configured exit transition
- AND it is removed after completion without changing the route's CRUD state or `Modal` props

#### Scenario: Modal honours subtle motion (the pre-existing gap, now closed)

- GIVEN `data-motion="subtle"`
- WHEN a `Modal` opens
- THEN it appears without a decorative entrance animation — closing the gap where the prior
  Tailwind-utility implementation ran its full entrance animation regardless of `data-motion`

#### Scenario: Modal honours motion off

- GIVEN `data-motion="off"`
- WHEN a `Modal` opens or closes
- THEN no entrance or exit animation runs

#### Scenario: Modal focus trap is unchanged

- GIVEN a `Modal` is open
- WHEN the DM presses Tab from the last focusable element, or Shift+Tab from the first
- THEN focus cycles to the first, or last, focusable element respectively, exactly as before
  migration

#### Scenario: Modal Escape and backdrop close are unchanged

- GIVEN a `Modal` is open
- WHEN the DM presses Escape, or clicks the backdrop outside the panel
- THEN `onClose` fires, exactly as before migration

#### Scenario: Modal scroll lock and focus restoration are unchanged

- GIVEN a `Modal` is opened while the page is scrolled
- WHEN the modal is open, and then closed
- THEN body scroll is locked while open and restored on close, and focus returns to the element
  that had focus before the modal opened

### Requirement: `SuggestionCard` fx state machine is mode-aware and preserves teardown safety (Area A, Unit 5)

`apps/web/components/sessions/memory-review-parts.tsx`'s `SuggestionCard` `fx` prop
(`'stamping' | 'accepting' | 'discarding'`) and the `setTimeout` orchestration in
`apps/web/app/[locale]/campaigns/[id]/memory/review/page.tsx` that drives it MUST migrate from CSS
classes (`.ll-stamp`, `.ll-strike`, `.ll-discarding`, `.ll-accepting`) to `AnimatePresence` /
`layout` animation driven by `useMotionMode()`. The migration MUST preserve: per-card `isSubmitting`
busy isolation (siblings stay interactive), the stamp-pop → hold → file-away sequencing for accept,
the strike → slide-out sequencing for dismiss, and timer-driven (not `animationend`-driven) DOM
teardown in every motion mode, per `loading-feedback/spec.md`'s "Suggestion-card teardown never
depends on `animationend`" requirement, which this unit must jointly satisfy.

#### Handoff checklist (non-negotiable)

- `InlineScribeBusy` (used for `isSubmitting`) and `OriginBadge` rendering inside `SuggestionCard`
  SHALL be unaffected by the `fx`-machine migration; only the `.ll-stamp`/`.ll-strike`/
  `.ll-discarding`/`.ll-accepting` visual mechanics change.
- Teardown SHALL remain timer-driven (`window.setTimeout`, current `CARD_EXIT_MS` /
  `STAMP_LIFETIME_MS` constants) or driven by Motion's `onAnimationComplete` ONLY after the design
  phase has explicitly verified `onAnimationComplete` fires at `duration: 0`; it SHALL NEVER be
  gated on a CSS `animationend` listener.
- Per-card `isSubmitting` isolation SHALL be verified unchanged (see the dedicated requirement in
  `loading-feedback/spec.md`).
- No new copy is introduced by this unit; `MemoryReview.acceptedStamp`, `.stamping`, and feedback
  strings remain unchanged.
- Manual acceptance: verify accept/dismiss animation quality at ≤900px viewport width under
  `data-motion="full"`, and verify static-but-correct teardown under `"subtle"` and `"off"`.

#### Scenario: Suggestion card animates its accept sequence under full motion

- GIVEN `data-motion="full"`
- WHEN a suggestion is accepted
- THEN the stamp pops in, holds, and the card animates out via `AnimatePresence`/`layout`

#### Scenario: Suggestion card renders a static accept sequence under subtle and off motion

- GIVEN `data-motion="subtle"` or `"off"`
- WHEN a suggestion is accepted
- THEN the stamp renders as a static badge with no pop animation, and the card is removed from
  the DOM after the same hold-and-exit timing, without any CSS or Motion animation running

#### Scenario: Suggestion card animates its dismiss sequence under full motion

- GIVEN `data-motion="full"`
- WHEN a suggestion is dismissed
- THEN the strike-through is applied and the card then slides out via Motion, with the strike
  readable before the card starts leaving

The strike is a static `text-decoration`, not an animated draw: the quote wraps to several lines
and a single scaled element cannot strike wrapped text. The sequencing the draw existed to provide
is preserved by delaying the card's exit instead.

#### Scenario: Suggestion card renders a static dismiss sequence under subtle and off motion

- GIVEN `data-motion="subtle"` or `"off"`
- WHEN a suggestion is dismissed
- THEN the strike-through renders as a static text-decoration with no draw animation, and the card
  is removed from the DOM after the same exit timing, without any CSS or Motion animation running
