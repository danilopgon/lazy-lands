# Continuation Handoff: `motion-and-loading-feedback`

This is the authoritative continuation point for the current SDD apply state. It supersedes stale
branch and commit-status wording in the earlier handoff/progress files, but it does not replace the
change's proposal, specs, design, tasks, or cumulative evidence.

Repository root: `C:\Users\Usuario\Dev\lazy-lands`

## Current State (2026-08-02)

All five units are implemented, reviewed and committed on `feat/session-save-pending-guard`, and
open as PR #100. The animation critique has been run and its accepted findings applied. Nothing is
in flight; what is left is follow-up work, listed under "Remaining".

Commits on the branch, oldest first:

| Commit | What |
|---|---|
| `8a62d05` | Unit 3 — mode-aware motion foundation |
| `82f5fef` | Unit 1 — generated-session save pending guard |
| `c6f9844` | Unit 2 — NavLink pending navigation feedback |
| `b320d2b` | Unit 4 — modal entry/exit through the foundation |
| `b5ebb1f` | Unit 5 — suggestion-card choreography |
| `b459d8d` | Fixes from the animation critique |
| `cd5d353` | Playwright coverage for the pending affordance |
| `0d9a516`, `95ce86c`, `ec48bbf` | Browser-acceptance evidence |
| `5eeb548`, `4a92c9a` | Merges of `origin/main` |
| `2738e34` | Tightened comment rule plus branch sweep |
| `a6c40a6` | Component types moved into their own files |

### Remaining

- `F.1` — retire the migrated `globals.css` classes, deliberately one PR later so this change
  keeps a clean revert path.
- Issue #105 — move component types out of the remaining 57 `.tsx` files, then add the lint rule.
- Two critique follow-ups recorded in `apply-progress.md`: whether the pending slot should keep
  reserving width inside centred button-shaped links, and reconciling the CSS entrance durations
  with the token vocabulary.

## Notes for whoever picks this up

### Environment gotcha (cost real time)

On Windows, an agent's Bash tool may receive the semicolon-separated Windows `PATH` and fail to
parse it, so `git`, `node` and `pnpm` all resolve to "command not found". Discover their locations
once (`where node`, `where pnpm`, or the `PATH` entries themselves) and prepend them, plus the Git
shell's own `/usr/bin` and `/mingw64/bin`, before running anything. The concrete paths are
machine-specific and deliberately not recorded here.

`sed` may be unavailable in that shell; `node -e` is a portable substitute for scripted edits.
Source files are CRLF, so string matching in scripts must use the file's own EOL.

### Review tooling deviation — read before trying `gentle-ai`

The installed CLI is **1.49.0**, which does NOT expose the `review start` / `finalize` /
`validate` facade that Units 1 and 3 used. It exposes `review-start --lineage --policy-file`,
`review-step --operation --input`, and `review-validate --receipt --request`, whose payload
schemas are undocumented. No lineage was created for Units 2, 4, or 5, because probing those
schemas against a live lineage is what terminally escalated a previous one (`passed` defaults to
`false`; `escalated` is terminal). The 4R/reliability lenses were run directly as subagents
instead. Units 2/4/5 therefore have NO content-bound receipt.

### Unit 5 decisions worth not relitigating

- The phase animation is on `animate`, not `exit`, so `ExitPresence` cannot extend DOM lifetime.
- `.ll-stamp` stays CSS: its geometry is mode-scoped (`full` centred via
  `translate(-50%,-50%)`; `subtle`/`off` static top-right) and Motion's inline `transform` would
  clobber the centring. Only its easing moved to `EASE.out`, which `design.md` explicitly requires
  over the previous overshoot. `tests/motion/timings.test.ts` parses durations only, so it stays green.
- `layout="position"`, not bare `layout`: bare `layout` animates the box, distorting the serif text
  and the hard ink shadow, and `design.md` forbids animating `height`.
- The dismiss strike stays `text-decoration-line`. `design.md` describes a `scaleX: 0 -> 1` draw,
  but a single scaled element cannot strike a multi-line blockquote correctly. **This is an open
  deviation that still needs recording in `apply-progress.md`.**
- `demo/memory/page.tsx` was widened into scope (task 5.2.2 names only the real review page)
  because `SuggestionCard` is shared: once it stops applying the CSS classes, the demo route loses
  its teardown animation without the same boundary. Same shape as Unit 4's approved demo widening.

## Branch State

| Item | State |
|---|---|
| Branch | `feat/session-save-pending-guard`; the user explicitly rejected a child branch |
| Base | Merged up to `origin/main` at `e25f358`, then `98d2df9` |
| Pull request | #100, open against `main` |
| Apply mode | Hybrid persistence, Strict TDD |
| Review receipts | Units 1 and 3 only. Units 2, 4 and 5 have none — see the review tooling note above |

Do not rewrite or squash the committed units.

## Early Unit Detail

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

- `apply-handoff.md` is marked historical at the top. Its entry-point instructions — including the
  fresh-branch bootstrap — no longer apply; it is kept for the `impeccable animate` setup and the
  per-unit background it records.
- `specs/motion-system/spec.md` requires the dismiss strike to "draw" under full motion. The
  implementation keeps a static `text-decoration`, because a single scaled element cannot strike a
  blockquote that wraps. The scenario has been amended to match; the reasoning is in
  `apply-progress.md` under Deviations.
- The motion-system spec's DOM-reading wording for `useMotionMode()` differs from the
  provider-injection implementation. The bounded review classified this as informational and it is
  still open — correct it only in a separate reviewed documentation scope.

## Evidence

Units 3 and 1 are summarised below. Units 2, 4 and 5, the animation-critique fixes and the browser
acceptance matrix are recorded per task in `apply-progress.md`, which is the cumulative source.
