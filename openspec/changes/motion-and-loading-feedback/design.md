# Design: Motion unification and loading/pending feedback

## Technical Approach

Two areas, five units. **Area B** makes pending state real: Unit 1 converts the app's one
non-conforming mutation surface to `useMutation` + an explicit guard; Unit 2 adds per-`Link`
navigation feedback through a single shared `NavLink` wrapper. **Area A** builds one mode-aware
foundation (Unit 3) and migrates two surfaces onto it (Units 4, 5). No new dependency.

The whole design turns on one invariant, because it is the mechanism by which every other guarantee
holds:

> **Motion primitives never branch their element tree on motion mode — only their transition
> config.** Mode changes what animates, never what renders.

## Evidence for the two mandated obligations

Context7 MCP is not exposed to this executor. Both obligations were discharged against the
**installed package source**, which is stronger evidence than docs.

| Obligation | Source | Finding |
|---|---|---|
| Does `onAnimationComplete` fire at `duration: 0`? | `node_modules/.../motion-dom@12.42.0/dist/es/animation/interfaces/motion-value.mjs:63-97` | **Yes.** At `duration === 0` and `delay === 0` Motion sets `shouldSkip`, creates no animation, and still schedules `options.onUpdate(final)` + `options.onComplete()` inside `frame.update()`. Completion is rAF-scheduled, not synchronous. |
| `useLinkStatus` topology | `node_modules/.../next@16.2.9/dist/client/app-dir/link.js:97, 376-384` | `LinkComponent` holds `useOptimistic(IDLE_LINK_STATUS)` and returns `<LinkStatusContext.Provider value={linkStatus}>{<a>…children…</a>}</LinkStatusContext.Provider>`. The reader **must be a Client Component rendered inside `<Link>`'s children**. Called anywhere else it returns the context default `{pending:false}` — **silently, never an error**. |
| `useLinkStatus` on non-prefetched routes | `.../next/dist/client/components/links.js:150-160` | Works. Comment: *"If the link is not prefetchable, we still create an instance so we can track its optimistic state (i.e. useLinkStatus)."* |
| Flicker risk | `link.js:97` + `links.js:66-78` (`startTransition`) | `pending` is optimistic state bound to the navigation transition, so a warm/prefetched navigation can flip `true→false` inside one frame. A grace delay is required. Next publishes no specific number — ours is a project decision, not a cited recommendation. |
| Motion's own `useReducedMotion` | `framer-motion@12.42.0/dist/es/utils/reduced-motion/use-reduced-motion.mjs:32-45` | `useState(prefersReducedMotion.current)` — a one-shot snapshot; the in-source `TODO` confirms it never updates. Not reusable for a reactive hook. |

## Architecture Decisions

| Decision | Choice | Alternatives rejected | Rationale |
|---|---|---|---|
| Mode source of truth | `layout.tsx` passes its existing `motion` value into `<MotionModeProvider>` **and** `data-motion`, from the **same expression** | Read `document.documentElement.dataset.motion` in a hook | DOM read is not SSR-safe and desynchronises from CSS. One expression, two consumers, zero hydration mismatch. `layout.tsx:120-121` hardcodes `full` (`off` only under `VISUAL_REGRESSION_TEST_MODE`); no runtime toggle exists and none is added. |
| Reduced-motion reader | Own `useSyncExternalStore` over `matchMedia`, `getServerSnapshot = () => false` | Motion's `useReducedMotion()` | It is a non-reactive snapshot (evidence above). `getServerSnapshot = () => false` is **only** safe because of the no-DOM-branching invariant — these two decisions are a pair; breaking either breaks the other. |
| **Precedence: app mode vs OS preference** | OS reduce is a hard floor **for Motion-driven animation only**. It disables JS animation; it does **not** rewrite `data-motion`. | Clamp `effectiveMode` to `'off'` | Clamping would swap the stamp from centred-animated (`globals.css:400-416`) to top-right static (`432-446`) for reduced-motion users — a geometry change today's CSS does *not* make (`464-472` kills duration only). Scoping precedence to the JS path changes **zero** rendered output. |
| Unit 5 teardown | **Timer-driven state removal stays authoritative and unchanged.** `AnimatePresence` is visual-only. | Drive removal from `onAnimationComplete` | One code path in all three modes. Even if an exit failed to complete, the worst case is a lingering *visual* node, never a stranded interactive card. Preserves the existing `timings.ts` contract and its test surface. |
| Unit 2 topology | One `'use client'` `NavLink` wrapper rendering `<Link>{children}<LinkPending/></Link>` | `useLinkStatus` per call site | 73 `<Link>`s across 33 files. The silent-`false` failure mode makes per-site correctness unauditable; one wrapper makes it structural and the edit mechanical. |
| Unit 1 guard | `useMutation` + `disabled={isPending}` + explicit `if (mutation.isPending) return` | Disabled button alone | Per decision #942.3: this path writes persisted draft content. |
| `.ll-view-enter` | Stays CSS | Migrate | One-shot mount animation, no unmount or layout concern. |

## Module and API shape (Unit 3)

```ts
// apps/web/lib/motion/tokens.ts
export const DURATION = { instant: 0, fast: 0.14, base: 0.22, slow: 0.26 } as const
export const EASE = {
  out: [0.16, 1, 0.3, 1],
  in: [0.4, 0, 1, 1],
} as const
export const STAGGER = { tight: 0.04, base: 0.06 } as const
/** Grace before a navigation is shown as pending. Project decision — see evidence table. */
export const NAV_PENDING_DELAY_MS = 150

// apps/web/lib/motion/use-motion-mode.ts
export type MotionMode = 'full' | 'subtle' | 'off'
export function useMotionMode(): {
  mode: MotionMode              // the app's data-motion value, verbatim
  prefersReducedMotion: boolean // OS-level, reactive, false on server
  animationsEnabled: boolean    // mode === 'full' && !prefersReducedMotion
  /** Resolved transition: `{ duration: 0 }` whenever animationsEnabled is false. */
  transition: (t?: Transition) => Transition
}
```

`transition()` is the single gate. Because it is a returned value, tests can assert
`duration === 0` under `subtle`/`off` **without asserting on utility classes** — this is the API
consequence of the proposal's per-primitive risk mitigation.

Primitives — few and thin, capped to what Units 4-5 consume (issue #99 non-goal):

| Primitive | Props | Used by |
|---|---|---|
| `<ModalPresence>` | `open: boolean`, `children` | Unit 4 |
| `<ExitPresence>` | `children` (keyed list), `mode?: 'popLayout'` | Unit 5 |
| `<NavLink>` | `LinkProps` + `pendingLabel?: string` | Unit 2 |

`NavLink` renders a plain `<Link>` with **no** status affordance when `href` is a hash or external
URL — a quiet no-op, never a runtime error. `<LinkPending>` reserves its footprint in both states
(no CLS), exposes `role="status"` text, and is **not** Motion-driven, so it stays perceivable in
every mode by construction — preserving the property that makes `LoadingScribe` / `InlineScribeBusy`
mode-proof today.

## Data flow

```
layout.tsx  ──┬── data-motion={motion} on <html>  ──→ CSS-owned animation (unchanged)
              └── <MotionModeProvider mode={motion}> ──→ useMotionMode() ──→ transition()
                                                                 ↑            ↓
                                          matchMedia(reduce) ────┘   components/motion/*

Unit 5:  accept ──→ setFx('stamping') ──→ setTimeout(STAMP_LIFETIME_MS)
                 ──→ setFx('accepting') ──→ setTimeout(CARD_EXIT_MS) ──→ remove from state
                                                                          ↓ (visual only)
                                                              AnimatePresence exit
```

## File changes

| File | Action | Description |
|---|---|---|
| `apps/web/lib/motion/tokens.ts` | Create | Durations, easings, stagger, `NAV_PENDING_DELAY_MS` (U3) |
| `apps/web/lib/motion/use-motion-mode.ts` | Create | Provider + hook + `transition()` (U3) |
| `apps/web/components/motion/{modal-presence,exit-presence}.tsx` | Create | Thin primitives (U3) |
| `apps/web/components/navigation/nav-link.tsx` | Create | `NavLink` + `LinkPending` (U2) |
| `apps/web/app/[locale]/layout.tsx` | Modify | Mount provider from the same `motion` expression (U3) |
| `apps/web/components/sessions/generated-session-view.tsx` | Modify | `useMutation` + guard + pending label (U1) |
| `apps/web/components/**`, `apps/web/app/[locale]/**` (33 files) | Modify | `Link` → `NavLink` for in-app targets (U2) |
| `apps/web/components/ui/modal.tsx` | Modify | Lines 113/122 → `ModalPresence`; a11y `useEffect`s untouched (U4) |
| `apps/web/app/[locale]/{campaigns/[id],demo}/{npcs,factions,arcs}/page.tsx` | Modify | Keep `ModalPresence` mounted above each conditional entity/delete modal boundary so exits can complete (U4) |
| `apps/web/components/sessions/memory-review-parts.tsx` | Modify | `SuggestionCard` fx → `ExitPresence` (U5) |
| `apps/web/app/globals.css` | Modify | Retire migrated classes **one PR after** their migration (rollback path) |
| `apps/web/lib/motion/timings.ts` | Keep | Teardown timings unchanged — still authoritative |
| `apps/web/messages/{en,es}.json` | Modify | Pending + navigation labels |

## Testing strategy (Strict TDD)

| Unit | Layer | What / How |
|---|---|---|
| 1 | Unit (RTL) | Deferred promise holds the PATCH: assert button `disabled`, pending label, and that a second click issues **no** second `updateSessionFn` call. Error and success paths unchanged. |
| 2 | Unit (RTL) | `NavLink` renders `role="status"` only after `NAV_PENDING_DELAY_MS`; hash/external `href` renders a bare anchor with no status node; footprint reserved in both states. |
| 2 | E2E (Playwright) | Throttled navigation on a representative sample of route classes — **not** exhaustive per-`Link` (proposal risk row). |
| 3 | Unit | `transition()` returns `duration: 0` for `subtle`, `off`, and `prefersReducedMotion`; provider value tracks `layout.tsx`'s expression. |
| 4 | Unit | Existing modal a11y suite (portal, focus trap, Escape, scroll lock, restoration) stays green **unmodified**; new test asserts `duration: 0` under `subtle`. |
| 5 | Unit | Fake timers: card is removed from the DOM after `STAMP_LIFETIME_MS + CARD_EXIT_MS` in **all three modes**; per-card `isSubmitting` isolation preserved. |

Follow the house rule (`campaign-detail-loading-feedback/design.md:60`): assert semantics
(`role="status"`, `aria-busy`, `data-testid`), never utility classes.

**Non-blocking spike (Unit 5, test infrastructure only):** Motion's `onComplete` is scheduled
through `frame.update()`, i.e. rAF. Confirm whether it fires under Vitest/JSDOM. This decides
whether Unit 5 tests assert on timer flush (expected) or may also assert Motion callbacks. It does
**not** gate the architecture — the timer path is authoritative either way.

## Threat matrix

N/A — no routing logic, shell, subprocess, VCS/PR automation, executable-file classification, or
process-integration boundary. Unit 2 changes navigation *presentation* only; `href` resolution,
route definitions and middleware are untouched.

## Migration / rollout

No data migration, no API/schema/query-key change. Each unit is an independent `git revert`. Do not
delete a `globals.css` class in the same PR that migrates it — the revert path depends on it.
Unit 3 is additive and inert. Two motion systems coexisting during Units 4-5 is expected and
accepted; likewise two reduced-motion readers, since `hero-graph-scene.tsx:3` keeps Motion's
`useReducedMotion` and is out of scope.

Forecast: U1 ~120-200, U3 ~150-250, U4 ~100-200, U5 ~200-350 lines (each under budget).
U2 >400 lines — **pre-approved `size:exception`**, `delivery_strategy = exception-ok`. Do not
re-ask.

## Must be verified in a real browser (JSDOM cannot measure this)

1. **CLS** — that `LinkPending` and the Unit 1 pending label shift no layout.
2. **All three motion modes** — visual behaviour under `full` / `subtle` / `off` and with OS
   reduced-motion enabled, including that the stamp geometry is unchanged from today.
3. **≤900px collapse** — the `llg` breakpoint, per the inherited house-pattern acceptance item.

Each Area B unit carries its own ≤900px + three-mode acceptance item; for Unit 2 this is
**pattern-level on a sample of route classes**. The prior change's unclosed 3.3/4.1 debt is tracked
as a separate follow-up and does **not** block sign-off.

## Open questions

**Resolved 2026-07-27 — Unit 4 presence boundary.** Production pages conditionally unmount
`ArcModal`, `NpcModal`, `FactionModal`, and `ConfirmDeleteModal`; an `AnimatePresence` inside that
subtree cannot run a close transition. The user approved widening Unit 4 so `ModalPresence` remains
mounted above those conditionals in all six production/demo entity routes. `Modal` keeps its current
props and accessibility mechanics. Entrance-only was rejected because it would violate the exit
requirement. Engram decision: #951.

## Impeccable `animate` decision record

This section records the mandatory pre-implementation `impeccable animate` pass. It was completed
against the shipped `SuggestionCard`, `Modal`, motion CSS, teardown timers, Print Chronicle design
system, and the `product` register. It is the provenance for Unit 3's token values and supersedes
the preliminary timing direction; the module sketch above now reflects these final values.

### Motion vocabulary and budget

- Motion communicates state only. There is no page choreography, decorative reveal, blur, soft
  shadow, gradient, or new runtime.
- Shared durations are `fast = 140ms`, `base = 220ms`, and `slow = 260ms`. `instant = 0` is the
  resolved duration for `subtle`, `off`, and OS reduced-motion.
- Entrances and layout settling use exponential deceleration
  (`out = cubic-bezier(0.16, 1, 0.3, 1)`). Exits use a direct acceleration
  (`in = cubic-bezier(0.4, 0, 1, 1)`).
- Stagger presets are `tight = 40ms` and `base = 60ms`, capped by the consuming primitive. None of
  the four current targets staggers sibling removal: list reflow is simultaneous.
- No spring token is exported. Springs and overshooting cubic-bezier curves would make teardown
  timing harder to reason about and would turn state feedback into decorative bounce. The stamp's
  physical impact comes from explicit keyframes instead.
- `NAV_PENDING_DELAY_MS = 150` is a perception grace period, not an animation duration.

### Unit 5: Scribe signature choreography

**Accept** keeps the existing deterministic timeline:

1. Stamp pop (`260ms`): opacity `0 -> 1`; scale `1.4 -> 0.94 -> 1`; rotation
   `-10deg -> -7deg -> -7deg`; keyframe offset `0 / 0.65 / 1`, using `EASE.out` rather than an
   overshooting easing curve. Its centred placement, paper fill, green border, and hard ink shadow
   remain unchanged.
2. Readable hold (`800ms`): no motion. The stamp remains mounted and legible.
3. File-away (`220ms`): the card moves `y: 0 -> -10px`, scales `1 -> 0.985`, and fades
   `1 -> 0` with `EASE.in`.
4. Reflow (`220ms`): remaining keyed cards settle together through Motion `layout` with
   `EASE.out`; there is no stagger, bounce, or height animation.

**Dismiss** fits the complete strike-and-slide sequence inside the existing `220ms` teardown
window: the danger strike draws left-to-right with `scaleX: 0 -> 1` over `140ms`; at `80ms` the
card begins a `140ms` exit to `x: 18px`, `rotate: 0.4deg`, and `opacity: 0` using `EASE.in`.
The overlap keeps the strike perceptible without delaying removal. Remaining cards use the same
simultaneous `220ms` layout settle as accept.

The existing timers remain authoritative. The `fx` state animates each card to its terminal visual
state during `CARD_EXIT_MS`; removing the keyed item must not start a second visible `220ms` exit or
extend the DOM lifetime. `AnimatePresence` coordinates presence/layout only, while timer-driven
state removal remains the safety boundary.

For `subtle`, `off`, or OS reduced-motion, all Motion transitions resolve at `duration: 0`. Accept
still renders the stamp for the unchanged `STAMP_LIFETIME_MS = 1060ms` before removal, preserving
at least the documented `800ms` readable hold. Dismiss still renders the completed danger strike
before timer-driven removal. Full mode keeps the centred stamp; `subtle`/`off` keep the current
top-right static placement; OS reduced-motion does not rewrite the app mode or its placement.
Feedback never disappears merely because movement is disabled.

### Unit 4: Modal choreography

- Open backdrop: opacity `0 -> 1` over `140ms` with `EASE.out`.
- Open panel: opacity `0 -> 1`, `y: 8px -> 0`, and scale `0.985 -> 1` over `220ms` with
  `EASE.out`.
- Close panel: reverse to opacity `0`, `y: 4px`, and scale `0.99` over `140ms` with `EASE.in`.
- Close backdrop: opacity `1 -> 0` over the same `140ms`; panel and backdrop close concurrently.
- Under `subtle`, `off`, or OS reduced-motion, backdrop and panel render directly at their resolved
  states. Portal, focus, Escape, backdrop click, scroll lock, and focus restoration are untouched.

The small vertical displacement reads as a sheet being placed on the desk; hard borders and ink
shadow remain static so the modal never becomes a floating soft-shadow surface.

### Unit 2: Navigation pending affordance

The affordance is deliberately **not Motion-driven**. After the `150ms` grace period, a fixed-width
inline slot switches immediately from an `aria-hidden`, invisible quill placeholder to a visible
`role="status"` quill plus screen-reader pending label. The slot exists in both states, so the link
does not shift. The existing CSS `.ll-quill` may animate the glyph under `full`, but the glyph and
status text remain statically perceivable when CSS animation is disabled. There is no fade, slide,
progress bar, or Motion import.

`LinkPending` must be rendered as an actual child of Next's `<Link>`. Unit tests must render that
real topology; testing the reader in isolation is invalid because `useLinkStatus` silently returns
`{ pending: false }` outside the provider subtree.

### Implementation acceptance checklist

- [ ] Unit 3 exports exactly the documented durations, easings, stagger values, and pending delay.
- [ ] Every Motion primitive resolves to `duration: 0` for `subtle`, `off`, and OS reduced-motion
      without branching its rendered element tree.
- [ ] Suggestion accept preserves `260ms pop + 800ms hold + 220ms file-away`; dismiss remains
      bounded to `220ms`; both retain timer-authoritative teardown.
- [ ] Suggestion-card reflow uses simultaneous layout animation and never animates `height`.
- [ ] Modal changes only backdrop/panel transform and opacity.
- [ ] Navigation pending feedback uses no Motion runtime and reserves its footprint.
- [ ] Full, subtle, off, OS reduced-motion, CLS, and the <=900px collapse are verified in a real
      browser before the corresponding unit is signed off.
