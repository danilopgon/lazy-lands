# Tasks: Refine Campaign Detail Context

## Review Workload Forecast

| Field                   | Value                                     |
| ----------------------- | ----------------------------------------- |
| Estimated changed lines | 620–780 authored; baselines excluded      |
| 400-line budget risk    | High                                      |
| Chained PRs recommended | Yes                                       |
| Suggested split         | Single PR; independently revertible units |
| Delivery strategy       | single-pr (cached 800-line ceiling)       |
| Chain strategy          | size-exception                            |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: size-exception
400-line budget risk: High

### Suggested Work Units

| Unit | Goal                     | Likely PR | Focused test command                           | Runtime harness              | Rollback boundary           |
| ---- | ------------------------ | --------- | ---------------------------------------------- | ---------------------------- | --------------------------- |
| 1    | Bounded previews         | Single PR | `pnpm test -- campaign`                        | N/A: RTL mocks               | detail view, catalog, tests |
| 2    | Notes + review workspace | Single PR | `pnpm test -- generated-session memory/review` | N/A: RTL actions             | views, CSS, catalogs        |
| 3    | Visual contract          | Single PR | `pnpm test -- e2e --project=chromium`          | fixture host, both viewports | host, specs, PNGs, docs     |

## Phase 1: Frontend campaign previews

- [x] 1.1 **RED** — Test newest-three memories; stable high/medium/low active/dormant arcs; localized Memory/Arcs links; no session “View all”; isolated error/retry; terminal empty in `apps/web/app/[locale]/campaigns/[id]/__tests__/page.test.tsx`.
- [x] 1.2 **GREEN** — Add non-mutating `toSorted` arc and three-memory previews in `apps/web/components/campaigns/campaign-detail-view.tsx`; retain `RecentSessions`, queries, and states.
- [x] 1.3 **REFACTOR** — Localize two specialist links in `apps/web/messages/{en,es}.json`; simplify selectors without fetch/order changes.

## Phase 2: Generated-session and review workspace

- [x] 2.1 **RED** — In `apps/web/tests/sessions/generated-session-view.test.tsx`, test bilingual aside order, “Coming soon”, exclusion, no textbox/button, and export exclusion.
- [x] 2.2 **GREEN** — Remove notes state/editor/toast in `apps/web/components/sessions/generated-session-view.tsx`; render static localized notes after memories/before legend.
- [x] 2.3 **REFACTOR** — Remove unused notes keys/imports; preserve draft editing, provenance, regenerate, export, motion, and normal-flow aside.
- [x] 2.4 **RED** — Test campaign loading/error/not-found/success; pending-empty; active loading/error/empty/success; feedback/edit/actions; failures/recovery; 900px DOM/tab order in `apps/web/app/[locale]/campaigns/[id]/memory/review/__tests__/page.test.tsx`.
- [x] 2.5 **GREEN** — In `apps/web/app/[locale]/campaigns/[id]/memory/review/page.tsx`, put full-width chrome/notices/actions before pending-then-canon lanes; retain `LoadingScribe`, `Notice`, `EmptyState`, `OriginBadge`.
- [x] 2.6 **REFACTOR** — Add Memory Review-only `>=1440px` grid in `apps/web/app/globals.css`; preserve `<=900px`, focus/motion, and no fixed/sticky/global rail.

## Phase 3: Deterministic verification

- [x] 3.1 **RED** — Add environment-gated production-view fixture host/specs under `apps/web/tests/e2e/`: fixed EN/ES data/dates, fonts-ready, intercepted mutations, `data-motion="off"`.
- [x] 3.2 **GREEN** — Configure `apps/web/playwright.config.ts` for that host; snapshot all three views at 1440x900 and 900x900, without auth storage/broad fixtures.
- [x] 3.3 **REFACTOR** — Run Chromium `--update-snapshots` once, inspect every diff, commit approved PNGs, rerun without update, then run `pnpm test`.

## Phase 4: Documentation and apply gate

- [x] 4.1 Document the approved review exception, deferred notes, baseline owner/update/review workflow, and RTL boundary in `DESIGN.md` and `docs/08-quality-strategy.md`.
- [x] 4.2 Before apply, obtain `size:exception`; verify `pnpm test`, Chromium, lint, typecheck; rollback UI/catalog/tests/PNGs/docs together.

## Phase 5: Authorized campaign-detail amendment

- [x] 5.1 **RED/GREEN/REFACTOR** — In `apps/web/app/[locale]/campaigns/[id]/__tests__/page.test.tsx`, cover a localized active-memory preview count only when more than three records exist; render that count as Active Memories list context before the standalone truthful Memory Review link while preserving its accessible description; and restore Print Chronicle section separation before Active Memories without changing queries, states, DOM/focus order, motion, or responsive behavior.

## Phase 6: Authorized strict-verification coverage completion

- [x] 6.1 **RED/GREEN/REFACTOR** — In `apps/web/app/[locale]/campaigns/[id]/__tests__/page.test.tsx`, prove a runtime fixture with more than three sessions selects the newest three and renders that subset chronologically.
- [x] 6.2 **RED/GREEN/REFACTOR** — In `apps/web/app/[locale]/campaigns/[id]/__tests__/page.test.tsx`, prove a failed active-memory panel leaves a resolved sessions panel visible, and prove resolved/discarded arcs render no terminal preview record.
- [x] 6.3 **RED/GREEN/REFACTOR** — In `apps/web/app/[locale]/campaigns/[id]/memory/review/__tests__/page.test.tsx`, prove 900px pending controls precede active-canon controls in DOM and keyboard tab order.
- [x] 6.4 **RED/GREEN/REFACTOR** — In `apps/web/app/[locale]/campaigns/[id]/memory/review/__tests__/page.test.tsx`, exercise localized edit-and-accept, dismiss, retire, and recoverable accept/retire failures.
- [x] 6.5 **RED/GREEN/REFACTOR** — In `apps/web/app/[locale]/campaigns/[id]/memory/review/__tests__/page.test.tsx`, cover campaign error/not-found notices and the active-memory loading state while pending controls remain usable.
