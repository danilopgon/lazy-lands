# Apply Handoff — `motion-and-loading-feedback`

> **HISTORICAL — do not follow the entry-point instructions below.** This was the kickoff document
> for the apply phase, kept for the `impeccable animate` setup and the per-unit background it
> records. Every unit is now implemented on `feat/session-save-pending-guard`. The authoritative
> state, including the branch to work on, is `continuation-handoff.md`; per-task evidence is in
> `apply-progress.md`.

You are picking up an SDD change whose **planning phases are complete and approved**. Your job is
the `sdd-apply` phase.

Repo root: `C:\Users\Usuario\Dev\lazy-lands`. Branch: at the time this was written, a fresh branch
off `origin/main`. That no longer applies — stay on `feat/session-save-pending-guard`.

---

## 0. FIRST ACTION — `impeccable animate`, before any implementation

Before writing implementation code, run the `impeccable` skill's `animate` command to refine and
concretely define the animations this change introduces. The planning artifacts specify
*behavior, modes and teardown safety*; they deliberately do **not** pin every easing curve,
duration or choreography detail. That is what this step is for.

Skill path (resolved from `.atl/skill-registry.md`, project scope):

```
C:\Users\Usuario\Dev\lazy-lands\.github\skills\impeccable\SKILL.md
```

Follow its Setup steps in order. Notes specific to this repo:

- Run `node .claude/skills/impeccable/scripts/context.mjs` **with cwd at the repo root**, not the
  skill directory. If the runtime reports a different loaded base directory, use that path
  instead.
- The project **has** `PRODUCT.md` and `DESIGN.md`, so it will not divert into `init`.
- Read the **`product`** register reference (`reference/product.md`), not `brand.md`. These are
  app-UI surfaces where design serves the product. The landing page is out of scope for this
  change.
- Then route to `reference/animate.md` and work the targets listed below.

### Targets for `animate`, in priority order

1. **Unit 3 primitives** (`apps/web/components/motion/`) — the durations, easing curves, spring
   configs and stagger presets that the token module will export. Everything downstream inherits
   these, so get them right first.
2. **Unit 5 — `SuggestionCard`** accept/dismiss choreography: stamp-pop, hold, strike-through
   draw, card exit and the reflow of the remaining cards. This is the product's signature Scribe
   moment and the most expressive surface in the change.
3. **Unit 4 — `Modal`** backdrop and panel entrance/exit.
4. **Unit 2 — the `useLinkStatus` pending affordance.** Constrained: see the hard rule below.

### Non-negotiable constraints on whatever `animate` proposes

- **No new animation dependency.** Motion (`^12.42.0`) is already installed and is the only
  runtime allowed. Explicitly banned by issue #99: GSAP, Lenis, Rive, Three.js, Motion+ and the
  paid Motion AI Kit. If `animate` suggests any of them, reject it and express the effect in
  Motion or CSS.
- **Every proposed animation must be expressible in all three `data-motion` modes plus OS
  reduced-motion.** If an effect has no meaningful static fallback, it does not ship.
- **The Unit 2 pending affordance must NOT be Motion-driven.** See the cross-cutting bug in
  section 3 — this is the whole reason `useLinkStatus` was chosen over a global progress bar.
- **Do not redesign the visual identity.** Print Chronicle vocabulary only: `--paper`, `--border`,
  `--dotted`, hard ink shadows, radius 0, serif reading rhythm, mono status text. No gradients,
  no soft shadows, no glass.
- **`.ll-view-enter` is not a target.** It stays as CSS by explicit decision.

Record whatever `animate` settles into the design artifact (append a section to `design.md` and
mirror it to Engram) **before** starting Unit 3 implementation, so the tokens have a documented
source.

---

## 1. Read order

Everything is in the hybrid store: files under `openspec/changes/motion-and-loading-feedback/`
**and** Engram. Prefer the files; use Engram to recover if a file is missing.

| Order | Artifact | Engram topic key |
|---|---|---|
| 1 | `proposal.md` | `sdd/motion-and-loading-feedback/proposal` |
| 2 | `specs/loading-feedback/spec.md` | `sdd/motion-and-loading-feedback/spec` |
| 3 | `specs/motion-system/spec.md` | `sdd/motion-and-loading-feedback/spec` |
| 4 | `design.md` | `sdd/motion-and-loading-feedback/design` |
| 5 | `tasks.md` — your checklist | `sdd/motion-and-loading-feedback/tasks` |
| — | `exploration.md` — audit table and `file:line` citations | `sdd/motion-and-loading-feedback/explore` (obs `#941`) |
| — | User's binding product decisions | `sdd/motion-and-loading-feedback/decisions` (obs `#942`) |
| — | Consolidated state and findings | `sdd/motion-and-loading-feedback/state` (obs `#945`) |

Engram retrieval is two steps: `mem_search(query: "<topic_key>", project: "lazy-lands")`, then
`mem_get_observation(id)`.

**Prior art you must match:** `openspec/changes/campaign-detail-loading-feedback/` — an
already-applied change (issue #52) that established the house pattern for loading states.
Read its `design.md` and `apply-progress.md`.

Also read `AGENTS.md`, `PRODUCT.md`, `DESIGN.md`, and — mandatory for any frontend work in this
repo — `.agents/skills/frontend-handoff-contract/SKILL.md`.

---

## 2. What this change is

One change, two labeled capability areas, five units shipping as five PRs.

- **Area A — Motion unification.** GitHub issue #99. Post-MVP polish.
- **Area B — Loading / pending feedback.** Perceived-reliability *and* data-integrity gap.
  Higher urgency than Area A.

| Unit | Area | Scope | Est. lines | Depends on |
|---|---|---|---|---|
| 1 | B | `generated-session-view.tsx`: `saveSection`/`saveAll` → `useMutation`, pending UI, explicit double-submit guard | ~120-200 | — |
| 2 | B | `useLinkStatus` navigation feedback, all routes | **>400**, ~33 files | — |
| 3 | A | `useMotionMode()` + `lib/motion/` tokens + thin `components/motion/` primitives. **Zero call-site migrations, zero behavior change** | ~150-250 | — |
| 4 | A | `Modal` → `AnimatePresence`, plus closing the `data-motion="subtle"` gap | ~100-200 | **Unit 3 merged** |
| 5 | A | `SuggestionCard` fx state machine + `setTimeout` orchestration → `AnimatePresence`/`layout` | ~200-350 | **Unit 3 merged** |

Units 1, 2 and 3 are mutually independent and may ship in any order. **Units 4 and 5 must not
begin implementation until Unit 3 is merged** — they consume the hook and primitives it creates.

**Unit 1 is the highest-priority deliverable in the whole change.** It is the only finding that
is data-integrity-adjacent rather than cosmetic.

---

## 3. The cross-cutting bug that motivates Area A

`apps/web/app/globals.css:248-253` enforces `data-motion="off"` with a blanket CSS rule:

```css
[data-motion='off'] *,
[data-motion='off'] *::before,
[data-motion='off'] *::after {
  animation: none !important;
  transition-duration: 0.01ms !important;
}
```

**Motion animates inline styles from JavaScript, not the `animation` / `transition` properties
that selector targets. This rule has zero effect on Motion-driven animation.**

Consequence: every component migrated to Motion, and every new affordance built with Motion,
silently escapes the `subtle` / `off` / `prefers-reduced-motion` contract unless the primitive
reads the mode itself. That is precisely what `useMotionMode()` exists to fix, and why Unit 3
must land before Units 4 and 5.

`apps/web/components/ui/modal.tsx:113,122` is a live sibling instance: it uses Tailwind
`motion-safe:` / `motion-reduced:` variants, which read the OS-level preference only and ignore
the app's own `data-motion="subtle"` mode entirely. That gap is closed inside Unit 4, not filed
separately.

**Derived rule, honour it everywhere:** loading and state feedback is *essential state feedback,
not decoration*. It must remain perceivable in every motion mode. Today this holds only because
all existing affordances (`LoadingScribe`, skeletons, `InlineScribeBusy`) are content —
`role="status"` text and static skeleton bars — whose *visibility* never depended on animation.
Preserve that property by construction, not by convention.

---

## 4. Verified technical findings — do NOT re-derive these

All four were verified against **installed package source**, which is stronger evidence than
documentation. Context7 was unavailable in the design executor.

1. **`onAnimationComplete` DOES fire at `duration: 0`.**
   `node_modules/.../motion-dom@12.42.0/dist/es/animation/interfaces/motion-value.mjs:63-97` —
   with `duration === 0 && delay === 0` Motion sets `shouldSkip`, creates no animation, but still
   schedules `options.onUpdate(final)` and `options.onComplete()` inside `frame.update()`.
   **Completion is rAF-scheduled, not synchronous — tests must await a frame.** This makes
   Motion-driven teardown safe for Unit 5.

2. **`useLinkStatus` topology (Next 16.2.9).** The reader **must be a Client Component rendered
   inside `<Link>`'s children**. `next/dist/client/app-dir/link.js:97,376-384`: `LinkComponent`
   wraps its children in a `<LinkStatusContext.Provider>`. Called anywhere else it returns the
   context default `{pending: false}` — **silently, never throwing**. This is the single easiest
   way to ship Unit 2 broken and green.

3. **Non-prefetched routes work.** `next/dist/client/components/links.js:150-160` — Next creates
   the instance regardless, specifically so `useLinkStatus` can track optimistic state.

4. **Flicker requires a grace delay, and the value is ours to choose.** `pending` is optimistic
   state bound to the navigation transition, so a warm or prefetched navigation can flip
   `true → false` within a single frame. Next publishes no recommended number. Picking and
   testing that delay is an explicit task — treat the chosen value as a project decision, not a
   cited recommendation.

5. **Motion's own `useReducedMotion` is NOT reusable.**
   `framer-motion@12.42.0/dist/es/utils/reduced-motion/use-reduced-motion.mjs:32-45` is
   `useState(prefersReducedMotion.current)` — a one-shot snapshot, with an in-source `TODO`
   confirming it never updates. `useMotionMode()` must be built reactive from scratch.

---

## 5. Hard constraints on implementation

**The `.ll-stamp` gotcha.** `.ll-stamp` / `.ll-strike` / `.ll-discarding` / `.ll-accepting` are
**static** under `data-motion="subtle"` and `"off"` (`globals.css:432-460`), so `animationend`
never fires in those modes. Current code correctly uses `window.setTimeout`;
`apps/web/lib/motion/timings.ts` documents why. **Card teardown and DOM removal must never depend
on a CSS `animationend` listener.** Finding 1 above means Motion's `onAnimationComplete` is a
valid alternative — but it is rAF-scheduled, so any fake-timer test must account for the frame.

**Unit 3 ships zero behavior change.** No call-site migrations. If you find yourself editing a
component that consumes the primitives, you have left Unit 3's scope and are inflating a PR that
was sized to be reviewable precisely because it changes nothing visible.

**Unit 4 preserves every accessibility mechanic exactly**: portal rendering, focus trap, Escape
close, backdrop close, scroll lock, focus restoration. The visual mechanism changes at
`modal.tsx:113,122`; additionally, the user approved mechanical `ModalPresence` wrappers above the
entity/delete modal conditionals in the six shipped/demo NPC, faction, and arc route pages. This
widening is required because a presence boundary inside a conditionally unmounted modal cannot run
its exit. Do not change route state, CRUD callbacks, copy, or modal props. Decision: Engram #951.

**Unit 5 preserves per-card `isSubmitting` isolation** — acting on one suggestion must never
disable its siblings — and the existing stamp / strike / accept semantics.

**Unit 2's real edit surface is `apps/web/components/**`**, where most `<Link>`s are declared,
not the route files under `apps/web/app/[locale]/**`.

---

## 6. Delivery parameters — settled, do not re-ask

- `artifact_store = hybrid` (Engram + `openspec/changes/motion-and-loading-feedback/`).
- `execution_mode = interactive`. Summarize and check in with the user between units.
- `delivery_strategy = exception-ok`. **Unit 2's `size:exception` is PRE-APPROVED by the user.**
  Do not stop at the Review Workload Guard to re-ask, and do not recommend splitting Unit 2.
- **Strict TDD is ACTIVE.** Test runner: `pnpm --filter web test`. Write the failing test first,
  then implement. Do not fall back to Standard Mode.
- Save apply progress to `sdd/motion-and-loading-feedback/apply-progress`. If it already exists,
  **read it first and merge** — never overwrite.

---

## 7. Environment gotchas that will waste your time

**Bash tool PATH.** The Bash tool starts **without `/usr/bin` on PATH**, so coreutils (`rm`,
`cat`, `head`, `tail`, `grep`, `mkdir`, `sh`, `env`) and git hooks fail. Prepend this to Bash
commands that need them:

```bash
export PATH="/c/Program Files/Git/usr/bin:/c/Program Files/Git/mingw64/bin:/f/Programas/Nodejs:/c/Users/Usuario/.local/bin:/f/Programas/GitHub CLI:$PATH"
```

**husky and `gh` ARE installed and working.** An earlier session wrongly concluded otherwise;
that was the missing-`/usr/bin` PATH above, not a broken install. With the PATH fixed, hooks spawn
normally — **no bypass needed, do not use `--no-verify`**. `gh` is authenticated as `danilopgon`.
The pre-commit hook is `pnpm exec lint-staged`.

**`gh issue view <n>` fails** on this repo with a Projects-classic deprecation GraphQL error. Use
`gh issue view <n> --json number,title,body,labels,url` instead.

**`pnpm format:check` is red repo-wide** on ~522 pre-existing violations in untouched files. Run
Prettier scoped to the files you changed; do not try to fix the repo-wide state inside this change.

**`gentle-ai review` CLI — expensive trap.** In the `--validation` payload, `passed` **defaults to
`false` if omitted**, which binds a failed validation and moves the lineage to `escalated` —
a **terminal, immutable** state that blocks committing and cannot be recovered by re-running
`finalize`. Never probe CLI schemas against a live lineage. The repo has ~24 accumulated lineages,
so `review validate --gate` requires `--lineage`. Full schemas are in the user's memory file
`gentle-ai-review-cli-schemas.md`.

---

## 8. Verification each unit owes

JSDOM cannot measure any of the following. Every unit carries an explicit manual
browser-verification task:

- **CLS** — no layout shift from pending labels or the `useLinkStatus` affordance.
- **All three `data-motion` modes** (`full`, `subtle`, `off`) plus OS reduced-motion.
- **≤900px collapse** — the `llg` breakpoint.

For Unit 2 this verification is **pattern-level on a representative sample of route classes**, not
exhaustive per-`Link`. Exhaustive verification would be unsatisfiable and would stall the apply.

The prior change (`campaign-detail-loading-feedback`) left its own tasks 3.3 and 4.1 unchecked.
That debt is tracked as a **separate follow-up and does not block sign-off** on this change.

---

## 9. Non-goals — do not do these

No visual identity redesign. No animation on every component or route. No second animation
runtime (GSAP, Lenis, Rive, Three.js, Motion+, paid Motion AI Kit). No marketing-site scroll
rewrite — the hero is a reference, not a target. No change to domain behavior, API contracts,
persistence or generation flows. No client-component conversion purely for cosmetic animation.
`.ll-view-enter` stays as CSS. No RAG, embeddings, billing or multi-user collaboration.

---

## 10. Known risks, ranked

1. **Units 4 and 5 starting before Unit 3 merges.** Not an ordering preference — they consume an
   API that does not exist yet.
2. **Unit 2 touching ~33 files.** The pre-approved exception covers the size, but reviewability
   depends entirely on the migration being one mechanical, repeated pattern. If it becomes 33
   distinct decisions, the exception will not save the review.
3. **Unit 5's fake-timer / rAF interaction.** Highest technical risk in the change, against the
   largest existing test surface. Task 5.1.4 is a non-blocking spike — **run it early**, before
   the RED-test phase, not during it.
4. **A silently-broken Unit 2.** `useLinkStatus` returning `{pending: false}` outside `<Link>`'s
   subtree throws nothing. A test that renders the reader in isolation will pass while the feature
   does nothing in the app. Assert against a real `<Link>` subtree.

---

## 11. Session note

The `sdd-spec` and `sdd-design` sub-agents both terminated on a **monthly spend-limit API error**,
but had already written their artifacts completely — verified by the orchestrator. All five
planning artifacts are intact. Confirm budget with the user before starting a long apply run.
