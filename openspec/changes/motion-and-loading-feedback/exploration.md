# Exploration: motion-and-loading-feedback

Two clearly-labeled capability areas in one change:

- **Area A — Motion unification** (GitHub issue #99, post-MVP polish)
- **Area B — Loading / pending feedback audit** (perceived-reliability gap, higher urgency)

They share technical surface (`apps/web`, Motion, `data-motion` modes) but carry different
acceptance criteria, so the tasks phase must be able to slice them into separate PRs.

---

## AREA A — Motion unification (issue #99)

### Current state

`motion` (`^12.42.0`, `apps/web/package.json:23`) is used only in the hero scene component
(scroll transforms, springs, SVG reveals). The rest of the app's animation is CSS-only, split
across three uncoordinated vocabularies:

1. **The app's own `data-motion`-gated CSS system** in `apps/web/app/globals.css`:
   `.ll-view-enter` (route entrance, lines 319-337), `.ll-panel-settle` (lines 349-365),
   `.ll-stamp` / `.ll-strike` / `.ll-discarding` / `.ll-accepting` (lines 370-460+),
   `.ll-rise` / `.ll-enter-1..5` (lines 206-277), `.ll-quill` / `.ll-ellip` (lines ~163-201,
   unscoped by `data-motion`).
2. **Tailwind animation utilities** (`motion-safe:animate-in motion-safe:fade-in
   motion-reduced:animate-none`) used directly in `apps/web/components/ui/modal.tsx:113,122` —
   a second, parallel vocabulary that does not read `data-motion` at all. Under
   `data-motion="subtle"` the modal still runs its full entrance animation.
3. **Manual `window.setTimeout` choreography** in
   `apps/web/app/[locale]/campaigns/[id]/memory/review/page.tsx` (lines 289-299, 397-402),
   sequencing stamp-pop -> hold -> exit using constants from `apps/web/lib/motion/timings.ts`.

`apps/web/lib/motion/timings.ts` exports only three constants tied to the memory-review
choreography. There is no shared duration/easing/stagger token file; issue #99's "shared
vocabulary" does not exist today. That file's comments already document the `.ll-stamp` gotcha —
prior institutional knowledge, not a new finding.

`apps/web/components/sessions/memory-review-parts.tsx` (`SuggestionCard`, lines 131-217) is the
primary lifecycle-migration target: an `fx` prop (`'stamping' | 'accepting' | 'discarding'`)
drives CSS classes rather than `AnimatePresence` / `layout`. Per-card busy isolation
(`isSubmitting` keyed per suggestion id) already works correctly and must be preserved.

`apps/web/components/ui/modal.tsx` handles portal, focus trap (lines 66-95), Escape (67-71),
scroll lock (97-103) and focus restoration (62) manually in `useEffect`s. None of that is
Motion's concern; only the entrance/exit visual state (lines 113, 122) is a migration target.
This is a surgical migration, not a rewrite.

### Affected areas

| Path | Impact |
|---|---|
| `apps/web/lib/motion/timings.ts` | Extend into the shared vocabulary, or add a sibling module |
| `apps/web/components/ui/modal.tsx` | Tailwind-utility entrance/exit -> `AnimatePresence`; a11y mechanics untouched |
| `apps/web/components/sessions/memory-review-parts.tsx` | `SuggestionCard` CSS-class fx state machine -> `AnimatePresence` / `layout` |
| `apps/web/app/[locale]/campaigns/[id]/memory/review/page.tsx` | The `setTimeout` stamp/exit sequencing driving the `fx` prop |
| `apps/web/app/globals.css` | `.ll-view-enter`, `.ll-rise`/`.ll-enter-*`, `.ll-quill`/`.ll-ellip`, and the `[data-motion='off'] *` blanket rule |
| `apps/web/components/hero/*` | Read as the existing Motion idiom precedent; not itself in scope (issue non-goal) |

### CROSS-CUTTING CONSTRAINT — CSS-only mode gating does not govern Motion

`apps/web/app/globals.css:248-253` enforces `data-motion="off"` with a blanket CSS rule:

```css
[data-motion='off'] *,
[data-motion='off'] *::before,
[data-motion='off'] *::after {
  animation: none !important;
  transition-duration: 0.01ms !important;
}
```

Every existing motion-gated class relies on this selector mechanism, either the blanket rule or
an explicit `[data-motion='subtle'] .foo, [data-motion='off'] .foo { animation: none !important }`
override (lines 231-246, 360-365, 432-460).

**Motion animates via inline styles set from JavaScript (`transform`, `opacity`), not via the
`animation` / `transition` properties these selectors target.** `[data-motion='off'] * {
animation: none !important }` has **no effect** on a Motion-driven animation. Any component
migrated to Motion under Area A — and any Area B affordance built with Motion instead of CSS —
silently escapes the `subtle` / `off` / `prefers-reduced-motion` contract unless the new
primitives **read the mode themselves** (a `useMotionMode()` hook reading `data-motion` off
`<html>`, plus `window.matchMedia('(prefers-reduced-motion: reduce)')`) and feed that into
`transition: { duration: 0 }` or disabled variants.

This is the actual mechanism by which "loading feedback vanishes exactly where it matters" would
happen in practice, and it is why the hook must be designed once and shared, not reinvented per
component.

`modal.tsx` already demonstrates a related gap: it uses `motion-safe:` / `motion-reduced:`
Tailwind variants (OS-level `prefers-reduced-motion` only) and ignores the app's own
`data-motion="subtle"` mode entirely — a live instance of the same bug class via a different
mechanism.

### Approaches

1. **Extend `timings.ts` into a token module + `useMotionMode()` hook; migrate `Modal` and
   `SuggestionCard`; leave `.ll-view-enter` as CSS.**
   Pros: incremental, testable per component; keeps non-lifecycle route transitions as CSS per
   the issue's own responsibility split. Cons: two motion systems coexist during migration
   (expected and acceptable). Effort: medium + medium.
2. **Introduce thin `components/motion/` primitives (`<Reveal>`, `<ExitCard>`,
   `<ModalPresence>`) wrapping Motion + the mode hook.**
   Pros: centralizes the mode-gating fix at the source, so every future Motion usage inherits
   mode-awareness; easier to audit for reduced-motion compliance. Cons: one more layer to design
   correctly up front; scope-creep risk into the "internal framework" the issue warns against.
   Effort: medium-high upfront, low per call site.
3. **Migrate only the lifecycle-aware interactions named in the issue; touch no CSS.**
   Pros: minimal footprint, matches "no animation on every component". Cons: leaves the timing
   vocabulary fragmented unless folded into 1 or 2.

**Recommendation: approach 2 over approach 1's foundation.** It is the only option that
structurally prevents the CSS-mode-gating gap from recurring per call site. `.ll-view-enter`
survives as CSS: route entrance is a one-shot mount animation with no unmount or layout concern,
which is exactly the issue's CSS-ownership rule.

---

## AREA B — Loading / pending feedback audit

### House pattern (from `campaign-detail-loading-feedback`, already applied)

Section-specific skeleton calibrated to the final geometry, `aria-busy` + localized
`role="status"` + `aria-hidden` decoration, reserved height (no CLS), and `.ll-panel-settle`
(180ms, `[data-motion='full']` only) on the resolved state. Confirmed live in
`apps/web/components/campaigns/recent-sessions.tsx:46-77` and
`apps/web/components/campaigns/campaign-detail-view.tsx:313-346` (`ActiveMemoriesPanel`).

Un-closed follow-up from that change (`apply-progress.md`): task 3.3 (browser visual inspection
at <=900px) and 4.1 (final verification receipt) were never checked off. Any Area B
generalization inherits the same manual-verification cost per surface.

### Audit table (ordered by severity on a slow connection)

| Surface / route | Interaction | Current feedback | Gap | Severity |
|---|---|---|---|---|
| `generated-session-view.tsx` — `/campaigns/:id/sessions/:sid` | "Save section changes" (`saveSection`, line 275), "Save changes" (`saveAll`, line 332) | None. Both are plain `async` functions with local `try/catch`, not `useMutation` — the mechanical reason no `isPending` exists to render | Button never disables, no in-flight label, no spinner. On a slow link the DM gets zero acknowledgment and can click again, firing a duplicate PATCH against persisted draft content mid-flight. Data-integrity-adjacent, not merely perceived reliability | **P1** |
| Same file — `copyAll` (line 350) | "Copy" button | None; clipboard write is fire-and-forget | Near-instant locally, but the clipboard API can stall behind a permissions prompt with no feedback either way | P3 |
| Whole app — App Router | Every route under `apps/web/app/[locale]/**` | Zero `loading.tsx` files exist and no route uses Suspense boundaries. Every screen is a client component fetching via React Query and rendering its own loading branch after mount | Real but narrow: the window between click and the component mounting its own (already good) loading branch — server-render / JS-parse / hydration time on a slow link, not the full fetch window | **P2**, systemic |
| Route-level navigation | Every `<Link>` / `router.push` to a page whose fetch has not started | No `useLinkStatus` or transition-based pending affordance anywhere. Next is `16.2.9` (`apps/web/package.json:24`), which supports `useLinkStatus` | Click -> paint gap has no visual acknowledgment before the target route's own loading branch appears | P2 |
| `campaign-detail-view.tsx`, `recent-sessions.tsx` | Campaign detail sections | Full house pattern | None | Conforms |
| `log-session-form.tsx:214-218` | "Log session" submit | Full-form swap to `LoadingScribe` on `mutation.isPending \|\| isNavigating`, held through the route swap (comment 166-169) to avoid a "save failed" flash | None | Conforms — good takeover precedent |
| `prepare-session-form.tsx:183-196` | Session generation (long AI call) | Immediate full-view swap to `LoadingScribe` on `phase === 'loading'` | Feedback starts immediately and is accessible; no elapsed-time or progress signal for a genuinely long generation. Not a "did it start" gap | Low |
| `campaigns/new/page.tsx:162-171,330-332` | Premise extraction submit | `LoadingScribe` swap + all fields and button disabled while `isSubmitting` | None | Conforms |
| `campaigns/new/review/page.tsx:246-255,383-388` | Confirm campaign creation | `LoadingScribe` swap on `isCreating`, button disabled and labeled during `mutation.isPending` | None | Conforms |
| `npc-modal.tsx:114-127` (pattern shared by faction/arc modals) | Save/create entity | `disabled={mutation.isPending}`, label swaps to "Saving…" | None | Conforms |
| `world-state-editor.tsx:110-119` | Save world state | Same disabled + label pattern | None | Conforms |
| `confirm-delete-modal.tsx:70-77` | Confirm delete | `isDeleting` disables the button, "Deleting…" label | None | Conforms |
| `session-export-view.tsx:209-269,330-336` | PDF download (worst-case long link) | Label swaps to "Downloading…", disabled via `canDownload`, and the whole preview panel swaps to `LoadingScribe` during `isExporting` | None — best-covered long-running surface in the app | Conforms |
| `memory/review/page.tsx:552-585` | "Recover suggestions" | `recoverMutation.isPending` disables the button and renders `InlineScribeBusy` | None | Conforms |
| `memory-review-parts.tsx:199-213` | Accept / edit / dismiss a suggestion | Per-card `isSubmitting` disables that card's buttons and renders `InlineScribeBusy`; siblings stay interactive | None — correct per-item isolation | Conforms |
| `entity-list-screen.tsx:63-75` | NPC / faction / arc list load | `LoadingScribe` swap + error and retry | None | Conforms |
| `dashboard/page.tsx:56-75` | Campaign list load | `LoadingScribe` swap, error/retry, "New Campaign" hidden until loaded | None | Conforms |
| `login/page.tsx:143-149` | Auth submit | `isSubmitting` disables the button, "Logging in…" label | None | Conforms |

**Overall**: the app's form and mutation surfaces are unusually well covered (10+ conforming
surfaces sampled), which sharpens rather than dilutes the one real gap. `GeneratedSessionView`'s
hand-rolled `async` / `try-catch` save paths are the outlier precisely because they did not go
through `useMutation` like every sibling surface did.

---

## Hard constraints for the design phase

1. **The `.ll-stamp` gotcha.** `.ll-stamp` (and `.ll-strike` / `.ll-discarding` /
   `.ll-accepting`) are static under `data-motion="subtle"` and `"off"` (`globals.css:432-460`);
   `animationend` never fires there. `lib/motion/timings.ts` documents this and the current code
   uses `window.setTimeout` for exactly that reason. Any migration of `SuggestionCard` to
   `AnimatePresence` must keep teardown timer-driven — or driven by Motion's own
   `onAnimationComplete`, which does fire even at `duration: 0`; verify that explicitly in design,
   because it changes the safe migration path. Never gate DOM removal on a CSS `animationend`
   listener.

2. **Loading feedback is essential state feedback, not decoration — and CSS-only mode gating does
   not reach Motion.** A loading indicator must remain perceivable in every motion mode. The
   mechanism that guarantees this today is that all existing loading affordances
   (`LoadingScribe`, skeletons, `InlineScribeBusy`) are content — `role="status"` text and static
   skeleton bars — whose *visibility* never depended on animation. Only the decorative pulse
   (`.ll-quill`, `.ll-ellip`, `.ll-panel-settle`) is gated, and gated via CSS that the blanket
   rule correctly kills. Any new Area B affordance built with Motion must independently read the
   motion mode via the same `useMotionMode()` hook rather than relying on CSS gating.

---

## Candidate slicing (400-line review budget)

| Unit | Scope | Forecast | Notes |
|---|---|---|---|
| 1. Area B critical | `GeneratedSessionView`: convert `saveSection` / `saveAll` to `useMutation`, add disabled + label pending state matching `NpcModal` / `WorldStateEditor`, plus tests | ~120-200 lines | Highest priority; smallest and most self-contained; strict-TDD friendly |
| 2. Area B systemic | Route-level navigation feedback (`useLinkStatus` given Next 16.2.9, or a lightweight progress affordance) across `apps/web/app/[locale]/**` | ~150-300 lines, possibly chained | Needs a product decision on which navigations to instrument |
| 3. Area A foundation | `useMotionMode()` hook + extended `lib/motion/` token module + `components/motion/` primitive scaffolding, **zero call-site migrations** | ~150-250 lines | Scoped to ship no behavior change; most likely to blow budget if migrations are dragged in |
| 4. Area A — Modal | Migrate `modal.tsx` entrance/exit to `AnimatePresence`, preserving portal / focus trap / Escape / scroll lock / focus restoration exactly; fix the `data-motion="subtle"` gap | ~100-200 lines | Depends on Unit 3 |
| 5. Area A — Memory review | Migrate `SuggestionCard` / `fx` state machine and its `setTimeout` orchestration to `AnimatePresence` / `layout`, preserving static-mode teardown safety | ~200-350 lines | Depends on Unit 3; highest risk — largest existing test surface |

Units 1 and 3 are independent of each other; Unit 2 is independent of Area A entirely.
Units 4 and 5 must follow Unit 3.

---

## Open questions requiring a product decision

1. Should Unit 2 instrument every route, or only the primary DM loop (dashboard -> campaign
   detail -> memory review)? Full coverage raises the line count and may need its own chained-PR
   sequence.
2. Should `useLinkStatus` (Next 16 native primitive) be the mechanism for Unit 2, or a simpler
   top-of-page progress affordance? This changes whether Motion is involved at all, which bears
   on the cross-cutting constraint.
3. Should Unit 1 also add an explicit double-submit guard, or is disabling the button during
   `isPending` sufficient mitigation?
4. Should the modal's `data-motion="subtle"` gap be fixed inside Unit 3/4, or filed as a separate
   pre-existing bug, since it is a correctness gap independent of the Motion migration?
5. Does the never-closed manual-verification debt from `campaign-detail-loading-feedback`
   (tasks 3.3, 4.1) block sign-off on new Area B units, or is it tracked as separate follow-up?

---

## Ready for proposal

Yes. Resolve open questions 1-3 with the user before `sdd-tasks` locks unit boundaries, since
they materially change the changed-line forecast for Units 1-2.
