# Design: Refine Campaign Detail Context

## Technical Approach

Keep this a frontend presentation change: derive bounded previews from existing query results, replace unsaved notes with static localized context, and opt Memory Review into the existing CSS-only workspace tier. No API, schema, RLS, AI, fetch, or route changes. This implements the `campaign-view`, `generated-session-context`, `memory-review-workspace`, and `visual-regression-coverage` deltas.

## Architecture Decisions

| Decision | Choice | Rationale / rejected alternative |
|---|---|---|
| Preview derivation | `slice(0, 3)` newest active memories; stable priority rank (`high`, `medium`, `low`) then slice eligible arcs. | Keeps current fetch contracts and stable equal-priority source order. Server-side limits/sorts would change APIs. Sessions retain `RecentSessions` unchanged. |
| Specialist navigation | Localized “View all” links only for memories and arcs, using existing routes. | Avoids fabricating a session-history destination or misleading affordance. |
| Deferred notes | Static, non-focusable localized panel in the generated-session `<aside>`, after woven memories and before legend. | Removes misleading local-only editing and every notes state/toast; persistence, generation, and export stay untouched. |
| Review workspace | At `min-width: 1440px`, make the existing page an `ll-workspace`; place header, notices, and action row before a normal-flow proposal/canon grid. Pending stays first in DOM. | Reuses the established workspace policy without rails/sticky positioning; `llg`/`<=900px` remains one flow. |
| Visual regression | Chromium-only, local test-mode fixture host with production view components, fixed data/intercepted mutations, `data-motion="off"`, fixed locale/date/font readiness, and committed `toHaveScreenshot` baselines at 1440x900 and 900x900. | Protected routes redirect without auth. A narrow environment-gated fixture host avoids broad authenticated fixtures while exercising real composition; Playwright `webServer.env` enables it only for this suite. |

## Data Flow

```
campaign detail query ─┬─ sessions → RecentSessions (unchanged)
                       ├─ active facts → newest 3 → memory preview → /memory/review
                       └─ arcs → active/dormant → stable rank → 3 → /arcs

generated session + linked facts → aside: woven memories → static notes → legend
review queries + local draft → full-width chrome/actions → pending → active canon
```

## File Changes

| File | Action | Description |
|---|---|---|
| `apps/web/components/campaigns/campaign-detail-view.tsx` | Modify | Derive deterministic memory/arc previews and truthful links; preserve panel states and sessions. |
| `apps/web/components/sessions/generated-session-view.tsx` | Modify | Remove notes state/editor/toast path; render localized static aside panel. |
| `apps/web/app/[locale]/campaigns/[id]/memory/review/page.tsx` | Modify | Add normal-flow wide grid and move existing actions before it without changing review behavior. |
| `apps/web/messages/{en,es}.json` | Modify | Add “View all” and deferred-notes copy; remove unused editable-notes strings if no other consumer remains. |
| `apps/web/app/globals.css` | Modify | Add only the Memory Review workspace grid utility/breakpoint styling, preserving motion gates. |
| `DESIGN.md` | Modify | Correct the workspace exception: Memory Review is eligible; notes here are deferred, not editable. |
| `docs/08-quality-strategy.md` | Modify | Define deterministic visual-baseline ownership, update workflow, and focused RTL boundary. |
| `apps/web/**/__tests__/*`, `apps/web/tests/sessions/generated-session-view.test.tsx` | Modify | RED-first RTL coverage for preview contracts, placement/noninteractivity, and every review state/action failure. |
| `apps/web/tests/e2e/**` | Modify/Create | Fixture host/interceptions, Chromium screenshot tests, and committed baselines. |

## Interfaces / Contracts

No public interfaces change. Keep selectors local and pure:

```ts
const priorityRank = { high: 0, medium: 1, low: 2 } as const
const visibleArcs = campaign.arcs
  .filter(({ status }) => status === 'active' || status === 'dormant')
  .toSorted((a, b) => priorityRank[a.priority] - priorityRank[b.priority])
  .slice(0, 3)
const visibleMemories = memories.slice(0, 3)
```

`toSorted` preserves source order for equal rank; no mutation reaches React Query data. The notes placeholder has no `textarea`, button, local state, or export payload.

## Testing Strategy

| Layer | RED-first coverage | Approach |
|---|---|---|
| RTL | caps/newest order, stable arc priority order, specialist hrefs, isolated states; notes order/no textbox; review loading/error/not-found/pending-empty/active loading-error-empty-success/feedback/edit/action failures. | Extend existing page/view tests with mocked query functions and real `next-intl` catalogs. |
| Visual | English and Spanish populated compositions at both viewports for campaign detail, generated session, and review. | Fixed fixture IDs/dates/text; wait for fonts; disable motion/caret; `toHaveScreenshot`; review baseline diffs deliberately and commit approved PNGs. |
| Regression | Existing `pnpm test`, then focused Playwright Chromium suite. | Do not add authenticated storage state or broad flow fixtures. |

## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary. The test-only fixture host is environment-gated and not a production route contract.

## Migration / Rollout

No migration required. Roll back UI, catalogs, screenshots, and docs together; APIs and persisted data remain unchanged.

## Open Questions

- [ ] None.
