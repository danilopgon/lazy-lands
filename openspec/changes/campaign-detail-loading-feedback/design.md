# Design: Campaign Detail Loading Feedback

## Technical Approach

Keep the two existing React Query branches in `CampaignDetailView` independent and presentation-only. `RecentSessions` replaces its `null` pending return with a dense three-row skeleton; `ActiveMemoriesPanel` replaces its static loading box with a three-record skeleton. Resolved session rows promote the existing localized `Session {number}` label as their title and clamp the existing `summary` occurrence text to two lines. `SessionResponse` has no title field, so no API/query/schema expansion is permitted.

## Architecture Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Loading ownership | Keep local markup in each affected component; do not create a generic loader | The session row and memory record have materially different geometry. |
| Query behavior | Preserve the two `useQuery` calls, keys, functions, cache, and error paths | Each panel must load and resolve independently without changing data behavior. |
| Settling | CSS-only, class-based 180ms opacity/translateY settle on newly mounted resolved content | No dependency or JS transition state; content is visible before animation completes. |
| Session hierarchy | `Session {number}` is the title; `summary` is the existing occurrence excerpt | The current read model exposes no session title. This satisfies title-first presentation without inventing or transforming data. |

## Component Mechanics and Data Flow

```
getSessions(campaign.id) ──> RecentSessions ──> loading | error | empty | success
getMemoryFacts(campaign.id) ─> ActiveMemoriesPanel ─> loading | error | empty | success
```

`RecentSessions` will render a local pending root with `aria-busy="true"`, a concise localized `role="status"`, and three `data-testid="recent-sessions-skeleton-row"` rows. Each row reserves `min-height: 74px`, uses one 16px title bar and two 12px excerpt bars (the second shorter); bars are `aria-hidden="true"`. The success root receives `ll-panel-settle`; each row keeps current ordering, three-item cap, generated-draft links, draft badge, and Resume draft behavior. Its localized session label uses serif, primary ink title styling; the existing summary follows in a `line-clamp-2` excerpt. No false words are rendered.

`ActiveMemoriesPanel` will render a pending `aria-busy="true"` root with a localized `role="status"` and three `data-testid="active-memories-skeleton-record"` records. Each record reserves 86px: mono-type bar, two serif-content bars, and a short source bar, separated with dotted rules inside the existing paper/border/shadow vocabulary. All bars are hidden from assistive technology. The existing error danger panel/retry, dashed empty panel, and only-live type/content/accepted-source success records remain unchanged.

Both roots retain their surrounding `/02` and `/04` heading/link DOM, so navigation stays focusable and no placeholder is focusable. Add `detail.sessionsLoading` to both locale catalogs; retain the existing `detail.memoriesLoading` key. Skeleton blocks use the same three-row intrinsic/minimum height at desktop and after the `llg` <=900px collapse; they never alter the two-column grid or section widths.

## State Traceability

1. Recent sessions loading: busy, localized status, three dense rows.
2. Recent sessions error: existing localized inline error.
3. Recent sessions empty: existing `EmptyState` and Log session CTA.
4. Recent sessions success: capped chronological title-first rows and two-line summaries.
5. Active memories loading: busy, localized status, three record-shaped rows.
6. Active memories error: existing danger panel and keyboard retry.
7. Active memories empty: existing dashed No memories yet panel.
8. Active memories success: live type, content, and accepted-source/provenance only.

## Motion and Accessibility

Add scoped `.ll-panel-settle` CSS only. Under `[data-motion='full']`, it runs one 180ms ease-out opacity/`translateY(4px)` animation; no skeleton shimmer or quill is added. `[data-motion='subtle']`, `[data-motion='off']`, and `prefers-reduced-motion: reduce` disable the new animation and leave content static. Use only Print Chronicle variables, radius 0, dotted separators, paper surfaces, and hard shadows.

## File Changes

| File | Action | Description |
|---|---|---|
| `apps/web/components/campaigns/recent-sessions.tsx` | Modify | Dense accessible skeleton and title-first clamped summary. |
| `apps/web/components/campaigns/campaign-detail-view.tsx` | Modify | Record-shaped memory pending branch. |
| `apps/web/app/globals.css` | Modify | Scoped settle and motion-preference gates. |
| `apps/web/messages/{en,es}.json` | Modify | Localized Recent sessions loading status. |
| `apps/web/app/[locale]/campaigns/[id]/__tests__/page.test.tsx` | Modify | Deferred-query state and replacement tests. |

## Interfaces / Contracts

No new interfaces, APIs, schemas, query keys, fetchers, cache configuration, or backend layers. The UI continues to consume `SessionResponse.summary` and existing memory-fact fields unchanged.

## Testing Strategy

Strict TDD: first add a typed deferred-promise helper and RED tests. With the campaign resolved, hold sessions and memories independently pending; assert each localized `role=status`, `aria-busy`, exact skeleton-row test IDs, and still-available `/02`/`/04` links. Resolve one promise at a time and assert only its status disappears and its existing success/empty/error state replaces it. Cover English and Spanish statuses, chronological order, two-line excerpt semantic hook (`data-testid="session-occurrence-excerpt"`), draft links/Resume draft, and keyboard retry. Do not assert utility classes; manually/browser-review CLS and reduced-motion at desktop and <=900px.

## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary.

## Migration / Rollout

No migration required. Single PR forecast: approximately 180–260 authored changed lines, below the 800-line review budget.

## Open Questions

None. Explicit non-goals: global/full-page loaders, new animation dependencies, visual redesign, copy rewriting, session ordering/count changes, and any query/data/API/cache/backend change.
