# Tasks: Motion Unification and Loading/Pending Feedback

## Review Workload Forecast

| Field | Value |
|---|---|
| Delivery strategy | `exception-ok` |
| Chain strategy | Five independent PRs. Units 1, 2, 3 are mutually independent and may land in any order. Units 4 and 5 both depend on Unit 3 (they consume `useMotionMode()` / the `components/motion/` primitives it ships) and MUST NOT be started before Unit 3 has merged. |
| 400-line budget risk | Low for Units 1, 3, 4, 5. **Certain** for Unit 2 — pre-approved. |

| Unit | Area | Estimated changed lines | Edit surface | Budget status |
|---|---|---|---|---|
| 1 | B | ~120–200 | `generated-session-view.tsx` + its test file + `en.json`/`es.json` | Under budget |
| 2 | B | **>400** | Primarily `apps/web/components/**` (most `<Link>`s live there, not in route files) plus `apps/web/app/[locale]/**` route files, new `apps/web/components/navigation/nav-link.tsx`, tests, `en.json`/`es.json` | **`size:exception` — PRE-APPROVED by the user. Do not stop to re-ask or recommend splitting.** |
| 3 | A | ~150–250 | New `apps/web/lib/motion/{tokens,use-motion-mode}.ts`, new `apps/web/components/motion/*`, `apps/web/app/[locale]/layout.tsx`, tests | Under budget |
| 4 | A | ~180–300 | `apps/web/components/ui/modal.tsx`, six mechanical entity-route presence boundaries, and focused tests | Under budget |
| 5 | A | ~200–350 | `apps/web/components/sessions/memory-review-parts.tsx`, `apps/web/app/[locale]/campaigns/[id]/memory/review/page.tsx` + tests | Under budget |

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Dependencies |
|---|---|---|---|---|
| 1 | `useMutation` + pending UI + double-submit guard for generated-session saves | Single PR | `pnpm --filter web test -- components/sessions/__tests__/generated-session-view.test.tsx` | None. Highest priority in the whole change |
| 2 | `useLinkStatus` pending affordance on every in-app `<Link>` | Single PR (`size:exception`, pre-approved) | `pnpm --filter web test -- components/navigation/__tests__/nav-link.test.tsx` + Playwright pattern-level sample | Independent of Units 1, 3 |
| 3 | `useMotionMode()` + token module + thin `components/motion/` primitives, zero call-site migrations | Single PR | `pnpm --filter web test -- lib/motion/__tests__/use-motion-mode.test.tsx` | None |
| 4 | `Modal` → `AnimatePresence`, route-level exit boundaries, close the `subtle`-mode gap | Single PR | `pnpm --filter web test -- components/ui/__tests__/modal.test.tsx` | **Depends on Unit 3 (merged)** |
| 5 | `SuggestionCard` `fx` state machine → `AnimatePresence`/`layout` | Single PR | `pnpm --filter web test -- components/sessions/__tests__/memory-review-parts.test.tsx` | **Depends on Unit 3 (merged)** |

---

## Unit 1 (Area B) — `GeneratedSessionView` pending state and double-submit guard

### Phase 1.1: Frontend RED tests

- [x] 1.1.1 In `apps/web/components/sessions/__tests__/generated-session-view.test.tsx`, add a deferred-promise helper and failing tests asserting: while `saveSection`'s `useMutation` is pending, the "Save section changes" button is `disabled` and its label switches to the in-flight copy; on resolve it re-enables, reverts its label, closes the editor, and the existing "section saved" toast still renders; on reject it re-enables, reverts its label, and the existing localized section-save error `Notice` renders without discarding the draft text.
- [x] 1.1.2 Add the same failing coverage for `saveAll` / "Save changes" (pending disable+relabel, success re-enable + existing "all saved" toast, error re-enable + existing save-all error `Notice`).
- [x] 1.1.3 Add failing tests for the double-submit guard clause: invoking `saveSection('synopsis')` a second time while the first call for that same section is still pending issues no second PATCH; invoking `saveAll()` a second time while pending issues no second PATCH; once a prior mutation has settled (success or error), a new call is not blocked and issues a new PATCH.

### Phase 1.2: Implementation

- [x] 1.2.1 Convert `saveSection` and `saveAll` in `apps/web/components/sessions/generated-session-view.tsx` to TanStack Query `useMutation` calls, matching the `NpcModal` / `WorldStateEditor` pattern.
- [x] 1.2.2 Add an explicit early-return guard clause inside `saveSection` / `saveAll` (or their `useMutation` wrapper) that no-ops silently (no `Notice`) when that same mutation is already pending — independent of, and in addition to, the disabled button.
- [x] 1.2.3 Wire `isPending` to disable each triggering button and swap its label to the in-flight copy; leave existing success/error toast and `Notice` copy and trigger conditions unchanged.
- [x] 1.2.4 In `apps/web/messages/en.json` and `apps/web/messages/es.json`, add the new in-flight labels under `SessionGeneration.generated` (no hard-coded English literal).

### Phase 1.3: Quality gates

- [x] 1.3.1 Run `pnpm --filter web test -- components/sessions/__tests__/generated-session-view.test.tsx`, `pnpm lint`, `pnpm typecheck`, and `pnpm format:check`; all green.

### Phase 1.4: Manual verification (JSDOM cannot measure this)

- [x] 1.4.1 At ≤900px viewport width, verify the pending/disabled/relabel state for both buttons under `data-motion="full"`, `"subtle"`, and `"off"`, and confirm a rapid double-click fires only one PATCH in at least one motion mode.

---

## Unit 2 (Area B) — `useLinkStatus` navigation pending feedback (all routes, `size:exception`)

> Pre-approved single-PR `size:exception`. Do not split. Real edit surface is `apps/web/components/**` (where most `<Link>`s are declared), not the route files under `apps/web/app/[locale]/**`.

### Phase 2.1: Frontend RED tests

- [x] 2.1.1 In `apps/web/components/navigation/__tests__/nav-link.test.tsx`, add failing tests for a new `NavLink` component: it renders `<Link>{children}</Link>` with a Client Component `LinkPending` reader inside `<Link>`'s children (per Next 16.2.9's `useLinkStatus` topology — reading it anywhere else silently returns `{pending:false}`); it shows a `role="status"` pending affordance only after `NAV_PENDING_DELAY_MS` has elapsed while `pending: true` (grace delay against flicker); the affordance clears once `pending` flips back to `false`; the affordance's footprint is reserved in both pending and non-pending states (no CLS).
- [x] 2.1.2 Add failing tests asserting `NavLink` renders a bare anchor with no status node for hash (`#anchor`) and external (`https://...`) `href` values — a quiet no-op, never a runtime error.
- [x] 2.1.3 Add a failing test asserting the pending affordance renders identically in every `data-motion` mode (it involves no Motion animation, so this is a straightforward DOM/text assertion, not a `transition()`/duration assertion).

### Phase 2.2: Implementation

- [x] 2.2.1 Create `apps/web/lib/motion/tokens.ts`'s `NAV_PENDING_DELAY_MS` constant (or add it if Unit 3 has not yet merged; coordinate ownership — see Unit 3 Phase 3.2.1) and `apps/web/components/navigation/nav-link.tsx` exporting `NavLink` (`LinkProps` + optional `pendingLabel`) and its internal `LinkPending` Client Component reader.
- [x] 2.2.2 Replace `<Link>` with `<NavLink>` at every call site under `apps/web/components/**` and `apps/web/app/[locale]/**` whose `href` targets an in-app route (excluding hash/external links), including `apps/web/components/layout/app-header.tsx`'s persistent nav links.
- [x] 2.2.3 In `apps/web/messages/en.json` and `apps/web/messages/es.json`, add any new pending-navigation copy or `aria-label` introduced by `LinkPending`.

### Phase 2.3: Quality gates

- [x] 2.3.1 Run `pnpm --filter web test -- components/navigation/__tests__/nav-link.test.tsx`, the full `pnpm --filter web test` suite (regression check on all migrated call sites), `pnpm lint`, `pnpm typecheck`, and `pnpm format:check`; all green.

### Phase 2.4: E2E and manual verification (pattern-level, not exhaustive per-`Link`)

- [ ] 2.4.1 Add a Playwright test exercising throttled navigation on a representative sample of route-declaration classes: one breadcrumb link, one card/list-row link, one `app-header.tsx` nav link, and one CTA button-styled link.
- [ ] 2.4.2 Manually verify, at ≤900px viewport width and under all three `data-motion` modes, the pending affordance for that same representative sample (not every `<Link>` instance in the codebase).

---

## Unit 3 (Area A) — `useMotionMode()` hook, token module, thin primitives (zero call-site migrations)

### Phase 3.1: Frontend RED tests

- [x] 3.1.1 In `apps/web/lib/motion/__tests__/use-motion-mode.test.tsx`, add failing tests asserting `transition()` returns `{ duration: 0 }` (or the documented instant/disabled variant) under `data-motion="subtle"`, `"off"`, and under `prefersReducedMotion: true` even when `data-motion="full"`; and returns the token module's real durations/easings under `data-motion="full"` with no reduced-motion preference.
- [x] 3.1.2 Add a failing test asserting the provider's `mode` value tracks the same expression `apps/web/app/[locale]/layout.tsx` passes to `data-motion` on `<html>` (no drift between the two consumers).
- [x] 3.1.3 Add a failing test asserting `getServerSnapshot` for the reduced-motion reader returns `false` (SSR-safe, no hydration mismatch).

### Phase 3.2: Implementation

- [x] 3.2.1 Create `apps/web/lib/motion/tokens.ts` exporting `DURATION`, `EASE`, `STAGGER`, and `NAV_PENDING_DELAY_MS`.
- [x] 3.2.2 Create `apps/web/lib/motion/use-motion-mode.ts` exporting `MotionMode`, a `MotionModeProvider`, and `useMotionMode()` (`mode`, `prefersReducedMotion` via a `useSyncExternalStore` over `matchMedia` — NOT Motion's own `useReducedMotion()`, which is a one-shot non-reactive snapshot per the design's verified evidence — `animationsEnabled`, and `transition()`).
- [x] 3.2.3 Create the thin `apps/web/components/motion/{modal-presence,exit-presence}.tsx` primitives (`<ModalPresence>`, `<ExitPresence>`), consumed only by Units 4 and 5, not by this unit.
- [x] 3.2.4 Mount `<MotionModeProvider>` in `apps/web/app/[locale]/layout.tsx` from the same expression already passed to `data-motion` on `<html>`.

### Phase 3.3: Quality gates

- [x] 3.3.1 Run `pnpm --filter web test -- lib/motion/__tests__/use-motion-mode.test.tsx`, the full `pnpm --filter web test` suite (regression check — no existing rendered output changes), `pnpm lint`, `pnpm typecheck`, and `pnpm format:check`; all green.

### Phase 3.4: Manual verification (JSDOM cannot measure this)

- [x] 3.4.1 At ≤900px viewport width, confirm zero visual or behavioral diff anywhere in the app across all three `data-motion` modes after this unit lands — this is a regression check, not a new-feature check, since no call site consumes the new hook yet.

---

## Unit 4 (Area A) — `Modal` → `AnimatePresence` (depends on Unit 3)

> Do not start until Unit 3 has merged; this unit consumes `useMotionMode()` and `<ModalPresence>`.

### Phase 4.1: Frontend RED tests

- [ ] 4.1.1 In `apps/web/components/ui/__tests__/modal.test.tsx`, add a failing test asserting the backdrop/panel transition resolves at `duration: 0` under `data-motion="subtle"` (the pre-existing gap this unit closes) and under `"off"`.
- [ ] 4.1.2 Confirm the existing modal a11y test suite (portal target, `role="dialog"`, `aria-modal`, `aria-labelledby`, focus trap Tab/Shift+Tab cycling, Escape close, backdrop-click close, `body.style.overflow` scroll lock, focus restoration to `previousFocusRef`) is captured as an explicit regression guard that MUST stay green, unmodified, through this migration.
- [ ] 4.1.3 Add a failing integration test with `ModalPresence` mounted above a real conditional `<Modal>` subtree: closing removes the condition, the dialog remains only through the configured full-motion exit, and then unmounts; under `subtle`/`off` it resolves at zero duration. A test that renders `ModalPresence` only inside the conditional is invalid.

### Phase 4.2: Implementation

- [ ] 4.2.1 In `apps/web/components/ui/modal.tsx`, replace the `motion-safe:`/`motion-reduced:` Tailwind classes at the backdrop and panel with Motion elements driven by `useMotionMode()`. Change only the entrance/exit transform/opacity mechanism; portal rendering, props, focus trap, Escape handling, backdrop-click close, scroll lock, and focus restoration MUST remain behaviorally identical.
- [ ] 4.2.2 In the six shipped/demo NPC, faction, and arc route pages, keep `<ModalPresence>` mounted above each existing entity-modal and delete-modal conditional. Apply one mechanical wrapper pattern only; do not change route state, CRUD callbacks, copy, or modal component props.

### Phase 4.3: Quality gates

- [ ] 4.3.1 Run `pnpm --filter web test -- components/ui/__tests__/modal.test.tsx`, `pnpm lint`, `pnpm typecheck`, and `pnpm format:check`; all green, including the untouched a11y suite.

### Phase 4.4: Manual verification (JSDOM cannot measure this)

- [ ] 4.4.1 At ≤900px viewport width, verify modal open/close visually under all three `data-motion` modes, confirming portal, focus trap, Escape, backdrop-click, scroll lock, and focus restoration are all unaffected.

---

## Unit 5 (Area A) — `SuggestionCard` fx state machine → `AnimatePresence`/`layout` (depends on Unit 3)

> Do not start until Unit 3 has merged; this unit consumes `useMotionMode()` and `<ExitPresence>`.

### Phase 5.1: Frontend RED tests

- [ ] 5.1.1 In `apps/web/components/sessions/__tests__/memory-review-parts.test.tsx`, using fake timers, add failing tests asserting a suggestion card is removed from the DOM after `STAMP_LIFETIME_MS + CARD_EXIT_MS` for accept, and after the existing dismiss exit window, in **all three** `data-motion` modes (`full`, `subtle`, `off`) — never gated on a CSS `animationend` listener, since `.ll-stamp`/`.ll-strike`/`.ll-discarding`/`.ll-accepting` are static under `subtle`/`off` and never fire that event.
- [ ] 5.1.2 Add a failing test asserting per-card `isSubmitting` busy isolation is preserved: accepting one card leaves a sibling card's Accept/Edit/Dismiss controls enabled and unaffected.
- [ ] 5.1.3 Add a failing test asserting `InlineScribeBusy` and `OriginBadge` rendering inside `SuggestionCard` are unaffected by the `fx`-machine migration.
- [ ] 5.1.4 Non-blocking spike task: confirm under Vitest/JSDOM whether Motion's `onAnimationComplete` fires during the fake-timer-driven test run (it is rAF-scheduled per the design's verified `motion-dom@12.42.0` source evidence). Record the finding; it decides only whether tests may additionally assert on the Motion callback, not whether the architecture changes — the timer path stays authoritative either way.

### Phase 5.2: Implementation

- [ ] 5.2.1 In `apps/web/components/sessions/memory-review-parts.tsx`, migrate `SuggestionCard`'s `fx` prop (`'stamping' | 'accepting' | 'discarding'`) visual mechanics from CSS classes to `<ExitPresence>`/`layout` animation driven by `useMotionMode()`, preserving the stamp-pop → hold → file-away sequencing for accept and the strike → slide-out sequencing for dismiss.
- [ ] 5.2.2 In `apps/web/app/[locale]/campaigns/[id]/memory/review/page.tsx`, keep the `window.setTimeout` orchestration (existing `STAMP_LIFETIME_MS` / `CARD_EXIT_MS` constants from `apps/web/lib/motion/timings.ts`) as the sole authority for state removal; `AnimatePresence` exit remains visual-only and MUST NOT gate DOM removal.
- [ ] 5.2.3 Confirm no new copy is introduced (`MemoryReview.acceptedStamp`, `.stamping`, and feedback strings remain unchanged) — no `en.json`/`es.json` edit required for this unit.

### Phase 5.3: Quality gates

- [ ] 5.3.1 Run `pnpm --filter web test -- components/sessions/__tests__/memory-review-parts.test.tsx`, `pnpm lint`, `pnpm typecheck`, and `pnpm format:check`; all green.

### Phase 5.4: Manual verification (JSDOM cannot measure this)

- [ ] 5.4.1 At ≤900px viewport width, verify accept/dismiss animation quality under `data-motion="full"`, and verify static-but-correct teardown (no card ever stranded on screen) under `"subtle"` and `"off"`.

---

## Deferred follow-up (not gating any unit above)

- [ ] F.1 Retire the migrated CSS classes in `apps/web/app/globals.css` in a follow-up PR, one PR after each of Units 4 and 5 lands (rollback path requires the classes to remain available in the same PR that migrates off them).
- [ ] F.2 The prior change's unchecked manual-verification debt (`campaign-detail-loading-feedback/apply-progress.md` tasks 3.3 and 4.1) is tracked separately and does not block sign-off on any unit in this change.
