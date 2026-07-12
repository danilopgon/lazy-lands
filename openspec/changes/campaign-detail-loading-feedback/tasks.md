# Tasks: Campaign Detail Loading Feedback

## Review Workload Forecast

| Field | Value |
|---|---|
| Estimated changed lines | 260–360 |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR: deferred tests, local feedback, verification |
| Delivery strategy | single-pr-default |
| Chain strategy | pending |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|---|---|---|---|---|---|
| 1 | Section feedback with coverage | Single PR | `pnpm --filter web test -- app/[locale]/campaigns/[id]/__tests__/page.test.tsx` | `pnpm --filter web dev`; inspect `/en/campaigns/camp-1` | Five listed source/catalog/test files |

## Phase 1: Frontend RED tests

- [x] 1.1 In `apps/web/app/[locale]/campaigns/[id]/__tests__/page.test.tsx`, add a typed deferred helper and failing English/Spanish tests for independently pending sessions/memories: localized `role=status`, `aria-busy`, three exact skeleton test IDs, hidden decoration, and focusable `/02`/`/04` links.
- [x] 1.2 Add failing replacement tests that resolve one deferred query at a time; assert only its status disappears, preserve the other pending panel, and cover sessions chronological cap, title-first `data-testid="session-occurrence-excerpt"`, two-line hook, generated links/Resume draft, memory live fields, empty/error, and keyboard retry.

## Phase 2: Local feedback and dense rows

- [x] 2.1 In `apps/web/messages/{en,es}.json`, add `Campaigns.detail.sessionsLoading`; retain and use the existing localized memories loading label.
- [x] 2.2 In `apps/web/components/campaigns/recent-sessions.tsx`, make RED tests green with a local busy/status three-row, 74px session skeleton (one title plus two hidden bars), then render the existing `Session {number}` as serif primary title and its unchanged summary as `line-clamp-2` excerpt; retain cap, ordering, links, draft badge, Resume draft, error, and `EmptyState`.
- [x] 2.3 In `apps/web/components/campaigns/campaign-detail-view.tsx`, replace only the active-memory pending box with a local busy/status three-record, 86px record skeleton (hidden type/content/source bars); retain independent queries plus existing error/retry, dashed empty, and live success/provenance branches.

## Phase 3: Scoped motion and handoff review

- [x] 3.1 In `apps/web/app/globals.css`, add only scoped `.ll-panel-settle`: 180ms opacity/`translateY(4px)` under `data-motion='full'`; explicitly static under `subtle`, `off`, and reduced motion, without shimmer, quill, layout animation, or new tokens.
- [x] 3.2 Perform the full handoff adversarial review against `handoff/app/views-detail.jsx`, `handoff/app/ui.jsx`, and `DESIGN.md`; publish a compliance report enumerating loading/error/empty/success for both sections, exact copy, `/02`/`/04` structure/links, tokens, focus, and every motion gate; fix every gap.
- [ ] 3.3 Manually inspect the pending-to-resolved replacement at desktop and <=900px: preserve two columns/collapse, section widths, three-row reserved height, zero radius, hard shadows, dotted rules, and no CLS/focus trap.

## Phase 4: Targeted verification

- [ ] 4.1 Run `pnpm --filter web test -- app/[locale]/campaigns/[id]/__tests__/page.test.tsx`, then `pnpm --filter web lint`, `pnpm --filter web typecheck`, and `pnpm format:check`; record results with the visual review evidence.
