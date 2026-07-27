# Continuation Handoff: `motion-and-loading-feedback`

This is the authoritative continuation point for the current SDD apply state. It supersedes stale
branch and commit-status wording in the earlier handoff/progress files, but it does not replace the
change's proposal, specs, design, tasks, or cumulative evidence.

Repository root: `C:\Users\Usuario\Dev\lazy-lands`

## First Action

Remain on `feat/session-save-pending-guard`. Do not create, switch, or rebase branches. Confirm the
branch and clean worktree, read this file plus the current hybrid artifacts, then begin Unit 2 with
the first Strict TDD RED topology test in
`apps/web/components/navigation/__tests__/nav-link.test.tsx`.

That first RED test MUST render `LinkPending` inside a real Next.js `<Link>` subtree. Rendering the
reader in isolation, or merely mocking `useLinkStatus`, is invalid because outside Next's
`LinkStatusContext.Provider` the hook silently returns `{ pending: false }`.

## Immutable Current State

| Item | State |
|---|---|
| Branch | `feat/session-save-pending-guard`; the user explicitly rejected a child branch |
| Worktree | Clean when this handoff was created |
| Remote baseline | `origin/main` at `6dbb1bb`; current branch is 0 behind and 2 commits ahead |
| Push state | `origin/feat/session-save-pending-guard` exists at `82f5fef`; local and remote are synchronized (`0` behind / `0` ahead) |
| Next implementation point | Unit 2, not started |
| Apply mode | Hybrid persistence, Strict TDD, interactive checkpoint after each unit |
| Authorization | No authorization for further pushes, PR creation, branch changes, or server/process management |

The two local commits, in history order, are:

1. `8a62d05 feat(motion): add mode-aware motion foundation` - Unit 3 complete.
2. `82f5fef fix(sessions): prevent duplicate generated session saves` - Unit 1 complete and current `HEAD`.

No Unit 2, Unit 4, or Unit 5 implementation file has changed. Do not rewrite or squash either
completed commit while continuing.

## Completed Units and Evidence

### Unit 3: Mode-aware motion foundation

Commit: `8a62d05 feat(motion): add mode-aware motion foundation`

Key paths:

- `apps/web/lib/motion/tokens.ts`
- `apps/web/lib/motion/use-motion-mode.ts`
- `apps/web/lib/motion/__tests__/use-motion-mode.test.tsx`
- `apps/web/components/motion/modal-presence.tsx`
- `apps/web/components/motion/exit-presence.tsx`
- `apps/web/app/[locale]/layout.tsx`

Evidence:

- Focused tests: 11/11 passed.
- Full frontend suite: 659 tests passed at the Unit 3 checkpoint.
- Lint, typecheck, and targeted Prettier passed.
- Chromium runtime at 900x900 passed for `full`, `subtle`, `off`, and OS reduced motion.
- Runtime confirmed no provider DOM wrapper and no visual or behavioral regression.
- Review lineage `review-05ee91e972616448` was approved; pre-commit validation allowed the commit.

### Unit 1: Generated-session save pending guard

Commit: `82f5fef fix(sessions): prevent duplicate generated session saves`

Key paths:

- `apps/web/components/sessions/generated-session-view.tsx`
- `apps/web/tests/sessions/generated-session-view.test.tsx`
- `apps/web/messages/en.json`
- `apps/web/messages/es.json`

Evidence:

- Focused tests: 38/38 passed.
- Full frontend suite: 664 tests passed.
- Lint, typecheck, and targeted Prettier passed.
- Chromium runtime at 900x900 passed for `full`, `subtle`, `off`, and OS reduced motion.
- Effective CLS was 0; pending labels retained a fixed footprint.
- Rapid activation produced one invocation for each save scope.
- Drafts survived forced errors, controls recovered, and retries succeeded.
- Review lineage `review-303ebf3c973d6573` was approved with no findings; pre-commit validation allowed the commit.

Do not replace this evidence when recording later units. The cumulative source is
`openspec/changes/motion-and-loading-feedback/apply-progress.md` plus Engram observation `#949`.

## Exact Next Task: Unit 2

Unit 2 adds per-link pending navigation feedback across all internal application links. Its
single-work-unit `size:exception` is already approved. Do not split it or ask for approval again.

### Required Sequence

1. Write and run focused RED tests for `NavLink` and the real Next `<Link>` topology first.
2. Implement `apps/web/components/navigation/nav-link.tsx` with its internal Client Component
   `LinkPending` reader.
3. Mechanically migrate qualifying internal `<Link>` call sites under `apps/web/components/**` and
   `apps/web/app/[locale]/**`; keep the repeated pattern uniform across approximately 33 files.
4. Run the focused navigation tests, then the full frontend suite, lint, typecheck, and targeted
   Prettier over only changed files.
5. Exercise one representative browser sample for each declaration class: breadcrumb, card/list
   row, `apps/web/components/layout/app-header.tsx` navigation, and CTA button-styled link.
6. Persist cumulative OpenSpec and Engram progress, obtain the interactive checkpoint, and only then
   proceed to another unit.

### Binding Unit 2 Behavior

- Use `NAV_PENDING_DELAY_MS = 150` from `apps/web/lib/motion/tokens.ts` as the grace period.
- `LinkPending` must be an actual descendant of Next's `<Link>` so `useLinkStatus` reads the link's
  provider state.
- Do not use Motion for the pending affordance.
- Reserve the affordance footprint in idle and pending states; browser acceptance requires no CLS.
- Keep the status perceivable in `full`, `subtle`, `off`, and OS reduced-motion modes.
- Hash links and external URLs remain bare anchors with no status node and no runtime error.
- Add any new pending-navigation copy to both `apps/web/messages/en.json` and
  `apps/web/messages/es.json`.
- Preserve target URLs, routing behavior, component semantics, and existing styling. This is a
  mechanical internal-Link migration, not a navigation redesign.

Primary acceptance sources:

- `openspec/changes/motion-and-loading-feedback/tasks.md`, tasks 2.1.1 through 2.4.2
- `openspec/changes/motion-and-loading-feedback/specs/loading-feedback/spec.md`, requirement
  "Every in-app navigation `<Link>` shows pending feedback"
- `openspec/changes/motion-and-loading-feedback/design.md`, Unit 2 topology, API shape, timing, and
  navigation choreography

## Remaining Units and Dependencies

### Unit 4: Mode-aware modal presence

Unit 4 has not started. It consumes the Unit 3 foundation already present in ancestor commit
`8a62d05`. The approved widening is binding: keep `ModalPresence` mounted above each conditional
entity-modal and delete-modal subtree in all six shipped/demo routes. Entrance-only behavior was
explicitly rejected because a presence boundary inside an unmounted conditional cannot run exit.

Exact route paths:

- `apps/web/app/[locale]/campaigns/[id]/npcs/page.tsx`
- `apps/web/app/[locale]/campaigns/[id]/factions/page.tsx`
- `apps/web/app/[locale]/campaigns/[id]/arcs/page.tsx`
- `apps/web/app/[locale]/demo/npcs/page.tsx`
- `apps/web/app/[locale]/demo/factions/page.tsx`
- `apps/web/app/[locale]/demo/arcs/page.tsx`

The shared implementation path is `apps/web/components/ui/modal.tsx`; preserve its portal, focus
trap, Escape handling, backdrop close, scroll lock, focus restoration, props, CRUD callbacks, and
copy. The widening is recorded in the design/spec/tasks and Engram decision `#951`.

### Unit 5: Suggestion-card choreography

Unit 5 has not started. Primary paths are:

- `apps/web/components/sessions/memory-review-parts.tsx`
- `apps/web/app/[locale]/campaigns/[id]/memory/review/page.tsx`
- `apps/web/lib/motion/timings.ts`
- `apps/web/components/sessions/__tests__/memory-review-parts.test.tsx`

The design is fixed: accept uses a 260ms stamp pop, 800ms readable hold, and 220ms file-away;
dismiss fits strike plus slide inside 220ms. Timer-driven state removal remains authoritative in
every mode. Motion is visual-only and must never extend DOM lifetime or replace teardown timers.
Preserve per-card busy isolation, `InlineScribeBusy`, `OriginBadge`, and existing copy.

## Constraints and Gotchas

- Strict TDD remains active: RED before production changes, then GREEN and refactor evidence.
- Stay on `feat/session-save-pending-guard`; do not create or switch to a child branch.
- Stop for an interactive user checkpoint after each completed unit.
- Never start, stop, restart, kill, or otherwise manage the user's development server/process
  without immediate explicit permission. If the user says it is running, connect read-only. See
  Engram incidents `#963` and `#964`.
- Do not touch `.next/dev/lock` or `apps/web/next-env.d.ts` during verification. If Next rewrites
  `apps/web/next-env.d.ts`, restore only that generated diff and report it.
- Repo-wide `pnpm format:check` has pre-existing debt. Use targeted Prettier checks over files
  changed by the current unit; do not format unrelated files.
- In gentle-ai validation payloads, `passed` defaults to `false` when omitted. Never probe schemas
  against a live lineage; an accidental failed validation terminally escalates it.
- Do not push again, create a PR, run an unsolicited review, or commit until the user authorizes
  the corresponding action. The current remote branch exists, but no further push/PR authorization
  currently exists.
- Do not retire the old modal/suggestion CSS classes in the same migration unit; deferred cleanup
  remains task F.1 so each migration retains a safe rollback boundary.

## Persistence and Review State

Artifact mode is hybrid. Continue updating both:

- `openspec/changes/motion-and-loading-feedback/tasks.md`
- `openspec/changes/motion-and-loading-feedback/apply-progress.md`
- Engram topic `sdd/motion-and-loading-feedback/tasks`, observation `#944`
- Engram topic `sdd/motion-and-loading-feedback/apply-progress`, observation `#949`

Always read and merge the existing cumulative content before persisting. Never overwrite Unit 1 or
Unit 3 completion, TDD evidence, browser evidence, review lineage, or rollback boundaries.

Approved review state:

- Unit 3: `review-05ee91e972616448`, approved, pre-commit allowed.
- Unit 1: `review-303ebf3c973d6573`, approved with no findings, pre-commit allowed.

One informational follow-up remains: `specs/motion-system/spec.md` says `useMotionMode()` reads
`data-motion` from the DOM, while the implementation and design inject the same layout expression
through `MotionModeProvider`. The bounded review accepted the implementation and classified the
wording mismatch as informational. Correct it only in a separate reviewed documentation scope; do
not silently alter the committed target during Unit 2.

## Known Artifact Contradictions

- `apply-handoff.md` still says to create a fresh branch from `origin/main`. That instruction is
  stale and is superseded here: remain on `feat/session-save-pending-guard`.
- `apply-progress.md` still says no commit was created. That sentence is stale: Units 3 and 1 are
  committed locally as `8a62d05` and `82f5fef`, respectively, with nothing pushed.
- Some planning text says Units 4 and 5 require Unit 3 to be "merged." Unit 3 is not merged or
  pushed upstream, but its reviewed commit `8a62d05` is an ancestor of the required continuation
  branch. Do not solve this by branch switching or by silently rewriting planning artifacts.
- The motion-system spec's DOM-reading wording differs from the provider-injection implementation;
  this is the accepted informational follow-up described above.

## Resume Checklist

- [ ] Confirm `HEAD` is `82f5fef` on clean `feat/session-save-pending-guard`.
- [ ] Confirm local and `origin/feat/session-save-pending-guard` still resolve to `82f5fef`, and no
      further push, PR, branch switch, or server/process action is authorized.
- [ ] Read `tasks.md`, `design.md`, both specs, and cumulative `apply-progress.md`.
- [ ] Start Unit 2 with a failing real-`<Link>` topology test, not an isolated hook test.
- [ ] Keep the 150ms, non-Motion, fixed-footprint affordance perceivable in every mode.
- [ ] Migrate internal links mechanically, then run focused and full quality gates.
- [ ] Use only a representative read-only browser sample when the user confirms a server is running.
- [ ] Merge Unit 2 evidence into OpenSpec and Engram without losing Unit 1/3 history.
- [ ] Stop for the interactive checkpoint before Unit 4 or Unit 5.
