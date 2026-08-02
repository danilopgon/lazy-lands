# Proposal: Motion unification and loading/pending feedback

One change, two labeled capability areas, kept separable so `sdd-tasks` can slice them into
distinct PRs:

- **Area A — Motion unification** — GitHub issue
  [#99](https://github.com/danilopgon/lazy-lands/issues/99), post-MVP polish.
- **Area B — Loading / pending feedback** — perceived-reliability **and data-integrity** gap;
  higher urgency than Area A.

**Area B Unit 1 is the highest-priority deliverable in the whole change.**

Critical-path steps affected (Login → Campaign → Session → Memory → Generate): **Session**
(`GeneratedSessionView` save paths, Unit 1) and **Memory** (`SuggestionCard` migration, Unit 5);
route-navigation feedback (Unit 2) spans the entire path. Domain docs:
`docs/02-requirements-and-acceptance.md`, `docs/04-architecture.md`, `DESIGN.md`, `PRODUCT.md`.

## Intent

**Area B.** `apps/web/components/sessions/generated-session-view.tsx` is the app's one
non-conforming mutation surface: `saveSection` (line 275) and `saveAll` (line 332) are hand-rolled
`async`/`try-catch` functions rather than `useMutation`, so no `isPending` exists to render. The
button never disables, there is no in-flight label, and on a slow link the DM can click again and
fire a duplicate PATCH against persisted draft content mid-flight. Ten-plus sibling surfaces
already conform to the house pattern, which sharpens rather than dilutes this outlier. Separately,
zero `loading.tsx` files and no `useLinkStatus` usage exist app-wide, so the click → paint window
carries no acknowledgment at all.

**Area A.** `motion` (`^12.42.0`) is used only in the hero scene. Everything else is CSS split
across three uncoordinated vocabularies (`data-motion`-gated `globals.css` classes, raw Tailwind
`motion-safe:` utilities in `modal.tsx`, and manual `setTimeout` choreography in memory review).
Issue #99's "shared vocabulary" does not exist: `apps/web/lib/motion/timings.ts` holds three
constants tied to one screen.

**Non-goals (verbatim from issue #99):** No visual identity redesign. No animation on every
component or route. No GSAP, Lenis, Rive or Three.js — no second animation runtime. No marketing-site
scroll rewrite. No change to domain behavior, API contracts, persistence or generation flows. No
client-component conversion purely for cosmetic animation. No dependency on Motion+ or the paid
Motion AI Kit. No RAG, embeddings, billing or multi-user collaboration.

## Scope

### In Scope

**Area B**

- Convert `saveSection` / `saveAll` to `useMutation`; disable the button and swap its label while
  pending, matching `NpcModal` / `WorldStateEditor`.
- Add an **explicit double-submit guard clause** inside `saveSection` / `saveAll`, in addition to
  the disabled button. Deliberate defence in depth, chosen because this path writes persisted draft
  content.
- Per-`Link` navigation pending feedback via **`useLinkStatus`** on **every in-app navigation
  `<Link>`, wherever declared** (most live in `apps/web/components/**`, not in the route files),
  whose target is a route under `apps/web/app/[locale]/**`. In-page anchor/hash links and external
  links are excluded — `useLinkStatus` is meaningless there.

**Area A**

- `apps/web/lib/motion/` token module (durations, easings, stagger) + a shared `useMotionMode()`
  hook reading `data-motion` off `<html>` plus `prefers-reduced-motion`.
- A **few, thin** primitives under `apps/web/components/motion/` over that module.
- Migrate `modal.tsx` entrance/exit to `AnimatePresence`, **including fixing its pre-existing
  `data-motion="subtle"` gap** (open question 4 resolved: in scope, inside Unit 4).
- Migrate `SuggestionCard` / the `fx` state machine and its `setTimeout` orchestration.

### Out of Scope

- All issue #99 non-goals above.
- `apps/web/components/hero/*` — read as the existing Motion idiom precedent, not migrated.
- `.ll-view-enter` stays CSS: route entrance is a one-shot mount animation with no unmount or
  layout concern, which is exactly issue #99's own CSS-ownership rule.
- Backend, API contracts, React Query keys, data models, translations beyond new pending labels.
- Elapsed-time / progress signals for long AI generation (`prepare-session-form.tsx` already
  acknowledges immediately).
- Reopening the conforming surfaces listed in the exploration audit.

## Capabilities

> `openspec/specs/` holds `repository-bootstrap`, `campaign-view`, `entity-management`,
> `pdf-export`. `campaign-view` already owns campaign-detail **section**-loading requirements from
> `campaign-detail-loading-feedback`; the new `loading-feedback` spec **generalizes** the same house
> pattern app-wide and must reference, not restate or contradict, those requirements. No existing
> spec owns the generated-session save paths or the app shell, so nothing is Modified.

### New Capabilities

- `motion-system`: all animation in `apps/web` MUST respect the app's `data-motion` mode
  (`full` / `subtle` / `off`) and OS `prefers-reduced-motion`, regardless of whether it is driven by
  CSS or by JavaScript. A requirement **currently violated** by `modal.tsx`.
- `loading-feedback`: every user-initiated mutation and navigation MUST produce immediate,
  accessible, layout-stable acknowledgment, and MUST NOT be re-submittable while in flight.

### Modified Capabilities

- None.

## Approach

Exploration approach 2: thin primitives in `apps/web/components/motion/` over a
`apps/web/lib/motion/` token module plus a shared `useMotionMode()` hook. It is the only option that
structurally prevents the mode-gating gap from recurring per call site. Keep the primitives few and
thin — issue #99 explicitly warns against building an internal framework over Motion.

Unit 2's mechanism is **`useLinkStatus`**, the native Next 16 primitive (Next `16.2.9`,
`apps/web/package.json:24`). A global top-of-page progress bar was explicitly rejected. Rationale to
carry into design: `useLinkStatus` is per-`Link` and **involves no Motion at all**, so it sidesteps
the CSS-gating constraint below entirely. Do not reopen this.

`useLinkStatus` must be read from a Client Component rendered as a descendant of `<Link>` (design
MUST confirm the exact Next 16.2.9 requirement). Where that forces a small client boundary, the
#99 non-goal "no client-component conversion **purely for cosmetic animation**" does **not** apply:
by the derived rule below, pending feedback is essential state feedback, not decoration.

**Derived rule, binding on both areas: loading feedback is essential state feedback, NOT
decoration.** It MUST remain perceivable in every motion mode. That is why constraint 1 below
applies to Area B and not only to Area A.

## Handoff Acceptance Constraints

- **Constraint 1 — CSS-only mode gating does not govern Motion.** `apps/web/app/globals.css:248-253`
  enforces `data-motion="off"` with a blanket `animation: none !important` rule. Motion animates
  inline styles from JavaScript, so that rule has **no effect** on Motion-driven animation. Every
  component migrated to Motion, and every new affordance built with Motion, silently escapes the
  `subtle` / `off` / `prefers-reduced-motion` contract unless the primitive reads the mode itself via
  the shared `useMotionMode()` hook. `apps/web/components/ui/modal.tsx:113,122` already exhibits a
  sibling instance of this bug class: it uses Tailwind `motion-safe:` / `motion-reduced:` variants
  (OS-level only) and ignores the app's own `data-motion="subtle"` mode entirely.
- **Constraint 2 — the `.ll-stamp` gotcha.** `.ll-stamp` / `.ll-strike` / `.ll-discarding` /
  `.ll-accepting` are **static** under `data-motion="subtle"` and `"off"` (`globals.css:432-460`), so
  `animationend` never fires there. Current code correctly uses `window.setTimeout` for this reason
  (`apps/web/lib/motion/timings.ts` documents it). Any migration of `SuggestionCard` MUST keep
  teardown timer-driven, or use Motion's `onAnimationComplete` — which DOES fire even at
  `duration: 0`, but the design phase MUST verify that explicitly. **Never gate DOM removal on a CSS
  `animationend` listener.**
- Preserve `modal.tsx`'s portal, focus trap, Escape handling, scroll lock and focus restoration
  exactly; only entrance/exit visual state migrates.
- Preserve per-card `isSubmitting` busy isolation in `memory-review-parts.tsx` (siblings stay
  interactive).
- Preserve the house loading pattern: section-shaped skeleton, `aria-busy`, localized
  `role="status"`, `aria-hidden` decoration, reserved height (no CLS).

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `apps/web/components/sessions/generated-session-view.tsx` | Modified | `useMutation` + pending UI + double-submit guard (Unit 1) |
| `apps/web/app/[locale]/**` (all routes) | Modified | `useLinkStatus` navigation pending affordance for `<Link>`s declared in route files (Unit 2) |
| `apps/web/components/**` | Modified | Where most in-app navigation `<Link>`s actually live — the primary Unit 2 edit surface |
| `apps/web/lib/motion/` | New/Modified | Token module (durations, easings, stagger) + `useMotionMode()` (Unit 3) |
| `apps/web/components/motion/` | New | Few, thin Motion primitives (Unit 3) |
| `apps/web/components/ui/modal.tsx` | Modified | `AnimatePresence` entrance/exit + `data-motion="subtle"` fix (Unit 4) |
| `apps/web/app/[locale]/{campaigns/[id],demo}/{npcs,factions,arcs}/page.tsx` | Modified | Persistent presence boundaries above conditional entity/delete modals (Unit 4) |
| `apps/web/components/sessions/memory-review-parts.tsx` | Modified | `SuggestionCard` `fx` state machine (Unit 5) |
| `apps/web/app/[locale]/campaigns/[id]/memory/review/page.tsx` | Modified | `setTimeout` stamp/exit sequencing (Unit 5) |
| `apps/web/app/globals.css` | Modified | Retire migrated classes; `.ll-view-enter` retained |
| `apps/web/messages/{en,es}.json` | Modified | Pending/navigation labels |
| `apps/web/**/__tests__/**` | Modified | Vitest + RTL coverage per unit (strict TDD) |

## Unit / PR slicing

`delivery_strategy = exception-ok`.

| Unit | Area | Scope | Forecast | Dependencies |
|---|---|---|---|---|
| 1 | B | `GeneratedSessionView` `useMutation` + pending UI + double-submit guard | ~120–200 lines | None. **Highest priority in the change** |
| 2 | B | `useLinkStatus` on every in-app navigation `<Link>` (mostly in `apps/web/components/**`) targeting `apps/web/app/[locale]/**` | >400 lines, **single PR, pre-approved `size:exception`** | Independent of Area A |
| 3 | A | Token module + `useMotionMode()` + primitive scaffolding, **zero call-site migrations** | ~150–250 lines | Independent of Unit 1 |
| 4 | A | `modal.tsx` → Motion + persistent presence boundaries in six entity routes + `subtle` gap fix | ~180–300 lines | Unit 3 |
| 5 | A | `SuggestionCard` / `fx` / `setTimeout` migration | ~200–350 lines | Unit 3; highest risk (largest existing test surface) |

Unit 2 is the pre-approved `size:exception`: the user settled that it covers all routes and ships as
one PR. `sdd-tasks` MUST NOT stop at the Review Workload Guard to re-ask about splitting it.

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Motion-driven animation escapes `data-motion` / reduced-motion gating (constraint 1) | High if unmitigated | Every Motion primitive reads `useMotionMode()`; add a test per primitive asserting `duration: 0` under `subtle`/`off` |
| `SuggestionCard` migration strands a card in the DOM under `subtle`/`off` (constraint 2) | Medium | Keep teardown timer-driven, or prove `onAnimationComplete` fires at `duration: 0` in design before choosing it |
| `modal.tsx` a11y mechanics (focus trap, Escape, scroll lock, restoration) regress during migration | Medium | Surgical migration of visual state only; assert existing modal a11y tests stay green |
| Modal exit never runs because the parent conditional unmounts the presence boundary | High if presence stays internal | Keep `ModalPresence` mounted above entity/delete conditionals in all six production/demo routes; prove a real conditional close in an integration test |
| Unit 2 exceeds the review budget | Certain | Pre-approved `size:exception`; one repeated mechanical pattern, reviewable by sampling |
| Inherited manual-verification debt: `campaign-detail-loading-feedback/apply-progress.md` tasks 3.3 (visual inspection ≤900px) and 4.1 (verification receipt) were never checked | Certain | **Recommendation:** track the prior change's 3.3/4.1 as a **separate follow-up** that does NOT block Area B sign-off (coupling new work to a shipped change's debt is scope creep). Each new Area B unit instead carries its own explicit acceptance item: manual ≤900px + three-motion-mode check. For Unit 2 this verification is **pattern-level on a representative sample of route classes, not exhaustive per-`Link`** — otherwise the criterion is unsatisfiable and stalls apply |
| Two motion systems coexist during migration | Certain | Expected and accepted; Unit 3 ships zero behavior change |
| Scope creep into an "internal framework over Motion" | Medium | Primitives capped to those Units 4–5 actually consume; issue #99 non-goal cited in spec |

## Rollback Plan

Each unit is an independent revert. Units 1 and 2 touch presentation and mutation wiring only — no
schema, API contract, query key or persisted data changes, so `git revert` restores prior behavior
exactly. Units 4 and 5 revert to the CSS classes retained in `globals.css` until their migration
lands; do not delete a migrated class in the same PR that migrates it if the revert path depends on
it. Unit 3 is additive and inert on its own.

## Dependencies

- `motion` `^12.42.0` and Next `16.2.9` (`useLinkStatus`) — both already installed; no new runtime
  dependency.
- Existing `data-motion` mode switch and Print Chronicle tokens in `globals.css` / `DESIGN.md`.
- Existing house loading pattern from `campaign-detail-loading-feedback`.

## Success Criteria

- [ ] `saveSection` / `saveAll` disable their button, show a pending label, and reject a second
      submit while in flight via an explicit guard clause.
- [ ] Every in-app navigation `<Link>` targeting a route under `apps/web/app/[locale]/**`
      acknowledges a pending navigation, wherever that `<Link>` is declared (hash and external links
      excluded).
- [ ] A single shared `useMotionMode()` hook governs every Motion-driven animation; no Motion
      animation runs at full duration under `data-motion="subtle"` or `"off"`.
- [ ] `modal.tsx` honours `data-motion="subtle"` (pre-existing gap closed) with portal, focus trap,
      Escape, scroll lock and focus restoration unchanged.
- [ ] `SuggestionCard` tears down correctly in all three motion modes; no `animationend`-gated DOM
      removal.
- [ ] Loading feedback remains perceivable in every motion mode.
- [ ] `pnpm --filter web test`, `pnpm lint`, `pnpm typecheck` green per unit.
- [ ] Units 1, 3, 4, 5 each land under the 400-line budget; Unit 2 lands as the pre-approved
      `size:exception`.

## Proposal question round

Open questions 1–3 from exploration were settled by the user and are closed. Two assumptions were
made by this proposal and are awaiting confirmation:

1. **(was open question 4)** The `modal.tsx` `data-motion="subtle"` gap is fixed **inside Unit 4**,
   not filed as a separate pre-existing bug. Rationale: it is the same bug class as constraint 1 and
   Unit 4 already rewrites those exact lines. Confirm, or split it into its own bugfix PR.
2. **(was open question 5)** The prior change's unchecked manual verification (3.3, 4.1) is tracked
   as a **separate follow-up** and does **not** block Area B sign-off; new units carry their own
   ≤900px + three-motion-mode acceptance item, pattern-level for Unit 2. Confirm, or require the
   prior debt to be closed first.
