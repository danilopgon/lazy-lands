# Proposal: Demo Audit & Hardening (PR #82)

## Intent

PR #82 shipped a public no-login `/demo/**` tour on a GREEN baseline (523 web tests,
typecheck, lint, prod build). The decoupling is already clean — real components use
optional dependency-injected callback props defaulting to unchanged real behavior; a
repo-wide `isDemo` grep returns zero matches. So there is **no demo-pollution rip-out**.
This pass delivers targeted fixes + test hardening for the 11 baremo items the user
approved, closing one reachable bug, two UX papercuts, coverage gaps, and small refactors.

## Scope

### In Scope (11 approved baremo items)

**Quick wins (demo-only, zero real-flow regression risk):**
- #1 Bug: suggestions never cleared on accept/dismiss → duplicate memory facts when
  re-entering `/demo/memory`. Add a store action to remove a suggestion.
- #2 UX: `demo/memory/page.tsx:163` empty-state button → `demoHrefs.campaign` (not `logSession`).
- #3 Test: cover faction/arc CRUD in `tests/demo/store.test.tsx` (mirror NPC block).
- #4 Test: page-level tests for `demo/factions` + `demo/arcs` (clone `demo/npcs/__tests__`).
- #5 Refactor: move `suggestionId`/`Feedback` types into `memory-review-parts.tsx`.
- #6 Test: isolated `saveSession` test in `tests/demo/store.test.tsx`.

**Consider (approved; #7/#9/#12 touch shipped REAL files):**
- #7 Test: adapter-path tests for new optional props on real components
  ({arc,faction,npc}-modal, world-state-editor, log-session-form).
- #9 Test: regression test on the REAL default path of `world-state-editor.tsx`.
- #10 UX: extend `demo-tour.tsx` with 1-2 callouts on `/demo/memory` + `/demo/sessions/generated`.
- #11 Refactor: consider collapsing `log-session-form.tsx`'s 4 props into one `onRegistered`.
- #12 UX: replace inline `style={{...}}` in `landing/{cta,hero}.tsx` with Tailwind/Button variant.

### Out of Scope (non-goals)
- #8 DROPPED — language-switcher `prefetch={false}` belongs to #81, already in main.
- #13/#14/#15 DEFERRED — generic CRUD factory, `regenerateSection` null-edge test,
  `typescript: '6.0.3'` pnpm pin (pre-existing hygiene).
- No RAG/embeddings/billing/multi-user. No demo rewrite. No decoupling rip-out (not needed).

## Capabilities

### New Capabilities
- None (audit/hardening pass — no new spec-level behavior).

### Modified Capabilities
- None. Behavior fixes (#1, #2) restore intended demo parity with the real flow; no
  requirement-level change to any capability.

## Approach

Strict TDD per item: failing test first, then implement. Demo-only items (#1–6, #10) are
verified against `pnpm --filter web test` + the demo test suites. Real-file items (#7/#9/#12)
are additive and MUST keep the REAL flow green — "demo still works" is insufficient. Order:
quick wins first (safe, fast signal), then Consider items, isolating the three real-file
changes so regression signal is clear.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `apps/web/lib/demo/store.tsx` | Modified | #1 add suggestion-removal action |
| `apps/web/app/[locale]/demo/memory/page.tsx` | Modified | #1 wire action, #2 href, #5 drop dup types |
| `apps/web/components/sessions/memory-review-parts.tsx` | Modified | #5 host shared types |
| `apps/web/tests/demo/store.test.tsx` | Modified | #3, #6 coverage |
| `apps/web/app/[locale]/demo/{factions,arcs}/__tests__/` | New | #4 page tests |
| `apps/web/components/{sessions,campaign}/*` (real) | Modified | #7, #9, #11 adapter/prop tests + refactor |
| `apps/web/components/landing/{cta,hero}.tsx` | Modified | #12 Tailwind classes |
| `apps/web/components/demo/demo-tour.tsx` | Modified | #10 tour callouts |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| #7/#9/#12 regress the REAL flow | Med | Additive tests; run full web suite, not just demo |
| #11 prop collapse ripples to real call sites | Low | Keep behavior identical; typecheck + tests gate |
| Combined diff exceeds 400-line review budget | Med | Delivery = ask-on-risk; sdd-tasks forecasts, split if needed |

## Rollback Plan

All work is additive commits on PR #82's branch (`claude/lazy-lands-public-demo-qmlgdo`).
Revert per-commit; no migrations, no data, no infra. Baseline is GREEN and restorable.

## Dependencies

- None. Branch is correctly based on `origin/main` (`cec468b`, #81); no rebase needed.

## Success Criteria

- [ ] All 11 baremo items resolved; each traceable to its baremo row as acceptance.
- [ ] #1 bug fixed: no duplicate memory facts on re-entering `/demo/memory`.
- [ ] Full `pnpm --filter web` typecheck + lint + test + build stay GREEN.
- [ ] Real-flow items (#7/#9/#12) validated against the REAL path, not only the demo.
