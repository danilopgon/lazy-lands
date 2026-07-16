# Exploration — demo-audit-hardening

Audit and hardening pass over PR #82 (`feat(web): public no-login demo with guided tour`,
branch `claude/lazy-lands-public-demo-qmlgdo`). The demo works technically; this change reviews
and hardens tests, comments, and code quality, decouples the demo from the real flow where it is
a quick win, and applies small demo UX improvements — all bounded by an effort × impact baremo.

## Branch base (verified)

The demo branch `claude/lazy-lands-public-demo-qmlgdo` is correctly based: its only own commit is
`35e60c2`, cut directly off `cec468b` (#81), which is the current tip of `origin/main`. No rebase is
needed. An earlier stale local `origin/main` ref (at #80) briefly contaminated the diff with #81's
`language-switcher` change (see dropped baremo item 8); after `git fetch origin main`, the true
demo-only surface is `origin/main..HEAD` and excludes it.

## Baseline

Verified GREEN before any change: `pnpm install --frozen-lockfile`, `pnpm --filter web typecheck`,
`pnpm --filter web lint`, `pnpm --filter web test` (523 tests), and `pnpm --filter web build` all
pass. Safe to refactor on top; regression signal available.

## Current state

PR #82 added a public `/demo/**` route tree (npcs / factions / arcs / memory / sessions / prepare)
backed by an in-memory `DemoProvider` store (`apps/web/lib/demo/store.tsx`, ~485 lines) seeded from
schema-validated fixtures (`apps/web/lib/demo/fixtures.ts`, ~409 lines), plus `apps/web/components/demo/*`
(header, breadcrumb, entity-screen, driver.js tour).

It reuses real production components by adding **optional adapter props** (`onSubmit`, `onSave`,
`navigate`, `registerSessionFn`, `generateSessionFn`, `downloadFn`, `dashboardHref`/`campaignHref`/
`exportHref`/`draftHref`, `persistDraft`, `reviewHref`) that default to the exact pre-PR real behavior
when omitted.

## Headline finding (Axis 4 — decoupling, the priority axis)

A repo-wide grep for `isDemo` returns **zero matches**. Every modified real component
(`arc-modal.tsx`, `faction-modal.tsx`, `npc-modal.tsx`, `world-state-editor.tsx`,
`generated-session-view.tsx`, `session-export-view.tsx`, `prepare-session-form.tsx`,
`log-session-form.tsx`, `language-switcher.tsx`, `landing/cta.tsx`, `landing/hero.tsx`) is
classified **KEEP**: coupling is via optional dependency-injected callbacks that default to unchanged
real behavior, not conditional demo branches. `memory/review/page.tsx` →
`components/sessions/memory-review-parts.tsx` is a genuine shared-component extraction (KEEP).

The decoupling is already well done; there is **no "rip out demo pollution" work required**.

## Scored baremo (ranked)

| # | Axis | file:line | Issue | Fix | Effort | Impact | Regression risk | Verdict |
|---|---|---|---|---|---|---|---|---|
| 1 | Bug/UX | `lib/demo/store.tsx:297-329` + `demo/memory/page.tsx:47-56` | `store.suggestions` set once on `logSession`, never cleared on accept/dismiss; re-entering `/demo/memory` resurrects all suggestions → duplicate memory facts, reachable in the core guided-tour path | Add a store action to remove a suggestion from `state.suggestions` on accept/dismiss | S-M | Med | Low | **QUICK WIN** |
| 2 | UX | `demo/memory/page.tsx:163` | Empty-state `backToCampaign` button links to `demoHrefs.logSession` instead of `demoHrefs.campaign` (diverges from real page, `memory/review/page.tsx:356`) | Fix href | S | Med | Low | **QUICK WIN** |
| 3 | Test | `tests/demo/store.test.tsx` | Faction/Arc CRUD (create/update/delete) entirely untested; only NPC CRUD covered | Mirror NPC test block | S | High | Low | **QUICK WIN** |
| 4 | Test | `demo/{factions,arcs}/__tests__/` (missing) | Only `demo/npcs` has a page-level test | Clone npcs test | S | Med | Low | **QUICK WIN** |
| 5 | Refactor | `demo/memory/page.tsx:21,30-32` | `suggestionId`/`Feedback` duplicated instead of finishing the move into `memory-review-parts.tsx` | Move into shared file | S | Med | Low | **QUICK WIN** |
| 6 | Test | `tests/demo/store.test.tsx` | `saveSession` untested in isolation | Add assertion | S | Med | Low | **QUICK WIN** |
| 7 | Decoupling | `{arc,faction,npc}-modal.tsx`, `world-state-editor.tsx`, `log-session-form.tsx` | New adapter props on real components have zero direct unit tests (pre-PR gap too) | Add focused adapter-path tests | M | High | Med | CONSIDER |
| ~~8~~ | ~~Decoupling~~ | ~~`components/i18n/language-switcher.tsx`~~ | **REMOVED — not part of PR #82.** The `prefetch={false}` change belongs to #81 (`fix(i18n)…`), already merged to `main`. It only appeared in the initial diff because the local `origin/main` ref was stale (at #80). The true demo-only diff (`origin/main..HEAD`) touches this file zero times. | — | — | — | **DROPPED** |
| 9 | Decoupling | `world-state-editor.tsx:45-60` | Default-path mutation logic restructured (behaviorally equivalent, untested) | Add regression test on real path | S | Med | Med | CONSIDER |
| 10 | UX | `components/demo/demo-tour.tsx` | Tour only covers the `/demo` campaign screen; 8 other demo screens have no guidance | Add 1-2 callouts on `/demo/memory` and `/demo/sessions/generated` | M | Med | Low | CONSIDER |
| ~~11~~ | ~~Decoupling~~ | ~~`log-session-form.tsx`~~ | **DEFER (design evidence).** "4 props → 1" is unachievable: `registerSessionFn` is a data adapter and the demo uses only 3 of the 4 props; folding the rest reshapes an already-tested `onSuccess` path for Impact=Low. Not a clean win. | — | — | — | **DEFER** |
| 12 | UX | `components/landing/{cta,hero}.tsx` | Inline `style={{...}}` instead of Tailwind, inconsistent with file | Replace with Tailwind class — **convert BOTH the demo and the sibling `/register` button** (they share the identical inline style; demo-only conversion would create inconsistency). Pure className, identical render. | S | Low | Low | CONSIDER |
| 16 | UX/i18n | `lib/demo/fixtures.ts` (~114 narrative strings) | Demo exposes `<LanguageSwitcher>` and is reachable at `/es/demo`, but the sample campaign (NPCs, world_state, memories, sessions) is English-only → a Spanish visitor sees localized chrome wrapping English lore. Missed by initial exploration; caught by the user. | Add a Spanish fixture set and select the fixture module by locale in the demo layout/store; Spanish fixtures MUST pass the same Zod schemas. **Same PR** (user decision — no separate slice). | L | High | Low | **APPROVED (this pass)** |
| 13 | Refactor | `lib/demo/store.tsx:175-295` | NPC/Faction/Arc CRUD triplets duplicated ~150 lines | Generic `makeCrud<T>` factory | M | Low-Med | Low | DEFER (gold-plating) |
| 14 | Test | `lib/demo/store.tsx:399-424` | `regenerateSection` null-content no-op branch untested | Edge-case test | S | Low | Low | DEFER |
| 15 | Hygiene | `pnpm-workspace.yaml` | `typescript` pinned to `6.0.3` (was `latest`) | Separate pre-existing dependency issue | — | — | — | DEFER (out of scope) |

## Final approved scope for this pass (user-confirmed)

- **In**: #1, #2, #3, #4, #5, #6 (quick wins) + #7, #9, #10, #12 (consider) + **#16 (bilingual demo fixtures, same PR)**.
- **Dropped**: #8 (not this PR — belongs to #81).
- **Deferred**: #11 (design evidence: not a clean win), #13, #14, #15.
- **Delivery**: all commits onto PR #82's branch. Single PR (user chose no separate slice for #16), so the
  combined diff will exceed the 400-line budget → `size:exception` accepted. #16 is mostly additive
  translated content (low regression risk); real-file items #7/#9/#12 carry the regression exposure and
  must be validated against the REAL flow, not just the demo.

## Risks

- Items 7 and 9 are the only findings with real (non-demo-only) regression exposure; they are CONSIDER
  rather than QUICK WIN precisely because verifying them costs more than the demo-only fixes.
- Comments axis (2) and best-practices axis (3) surfaced no material findings beyond the rows above —
  the cloud agent's code is reasonably clean.

## Next

`sdd-propose` scoped to the approved baremo subset.
