# Tasks: Large-screen layout audit

## Review Workload Forecast

| Field | Value |
|---|---|
| Estimated changed lines | 520–680 authored lines |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | Two autonomous work units; single PR requires exception |
| Delivery strategy | single-pr-default |
| Chain strategy | size-exception |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: size-exception
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|---|---|---|---|---|---|
| 1 | Policy + dashboard/detail/entity layouts | PR 1 | `pnpm test -- campaign-list campaign-detail-view` | Playwright 1440×900 populated/error/empty dashboard and detail | `globals.css`, dashboard/campaign components and their tests |
| 2 | Draft/export layouts, audit matrix, docs | PR 2 | `pnpm test -- generated-session-view session-export-view` | Playwright 1440×900 EN/ES/reduced-motion draft/export | session components, E2E spec, and responsive-policy docs |

## Phase 1: Frontend policy and priority collections

- [x] 1.1 RED — extend dashboard/detail/entity RTL tests at `apps/web/app/[locale]/dashboard/__tests__/page.test.tsx`, `campaigns/[id]/__tests__/page.test.tsx`, and entity route tests to prove controls and loading/error/empty/success/mutation-failure feedback remain keyboard-operable; never assert CSS classes.
- [x] 1.2 GREEN — add `ll-workspace`, `ll-workspace-main`, and `ll-workspace-context` only inside `@media (min-width: 1440px)` in `apps/web/app/globals.css`; preserve <=900px flow, DOM order, token/motion rules, and protected widths.
- [x] 1.3 GREEN — opt dashboard and collection density into the policy in `apps/web/app/[locale]/dashboard/page.tsx` and `apps/web/components/campaigns/campaign-list.tsx`; retain title/count/actions/search/cards and all states.
- [x] 1.4 GREEN — opt detail state frames and contextual column into the policy in `apps/web/app/[locale]/campaigns/[id]/page.tsx`, `campaign-detail-view.tsx`, and `entity-list-screen.tsx`; keep world-state prose at 65–75ch, provenance/modals, and focus order.
- [x] 1.5 REFACTOR — consolidate only duplicated layout composition while retaining direct imports and no viewport client state; rerun `pnpm test`.

## Phase 2: Session workspaces

- [x] 2.1 RED — extend `apps/web/tests/sessions/generated-session-view.test.tsx` and `session-export-view.test.tsx` for editing, provenance, private-notes, load/error, success/action-failure, and bounded preview behavior.
- [x] 2.2 GREEN — compose bounded draft/context zones in `generated-session-view.tsx`; keep private notes local normal flow, continuity/legend data existing-only, query parallelism, localization, and motion gates.
- [x] 2.3 GREEN — assess `session-export-view.tsx`; widen selection controls only if the audit proves benefit and retain its 640px preview, excluded private notes, and export lifecycle feedback.
- [x] 2.4 REFACTOR — remove layout duplication without new APIs, data, IA, rails, fixed/sticky notes, or changed narrow routes; rerun `pnpm test`.

## Phase 3: E2E verification and documentation

- [x] 3.1 RED — add `apps/web/tests/e2e/large-screen-layout.spec.ts` covering priority populated/loading/error/empty/success/action-failure states, tab order, overflow, and screenshots at 1440×900, 1536×960, and 1920×1080.
- [x] 3.2 GREEN — add EN/ES and `prefers-reduced-motion: reduce` 1440×900 cases plus <=900px and protected auth/form/review/legal bounded-layout regressions; run `pnpm test` then `pnpm --filter web test:e2e`.
- [x] 3.3 Document tier eligibility, measures, protected routes, and prohibited rails/notes in `DESIGN.md`; assign CSS/route ownership in `docs/04-architecture.md` and the full verification matrix in `docs/08-quality-strategy.md`.
- [x] 3.4 Verify `pnpm lint`, `pnpm typecheck`, and both frontend suites; perform the handoff-contract checklist/compliance report for every modified route and record screenshot results.
