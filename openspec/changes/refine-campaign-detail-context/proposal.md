# Proposal: Refine Campaign Detail Context

## Intent

Improve campaign-context scanning and memory review without inventing navigation or persistence. This explicit follow-up is separate from the frozen `large-screen-layout-audit` review lineage. It affects Campaign → Session → Memory → Generate and supports PRODUCT.md P1–P3.

## Scope

### In Scope
- Keep the current three recent sessions, chronological within the newest three, and retain only the truthful “Log session” action.
- Limit active-memory and open-arc previews to three; link memories to existing `/memory/review` and arcs to existing `/arcs`.
- Sort arc previews high, medium, low, preserving source order within a priority; include only active/dormant arcs.
- Replace the generated-session private-notes editor with a non-interactive localized “Coming soon” placeholder in the right context rail, below woven memories and above the legend.
- Add Memory Review as the fourth `>=1440px` workspace: normal-flow two columns only at that tier, with pending Scribe proposals in the bounded main lane and active canon in the contextual column. Header, breadcrumbs, feedback, and actions remain full width; DOM order remains unchanged.
- Preserve every Memory Review campaign-loading/error/not-found/success, pending-empty, active-loading/error/empty/success, accepted/edited/dismissed/retired feedback, edit mode, accept/edit/dismiss/retire behavior, and create/retire action failure.
- Add deterministic Chromium visual-regression coverage for 1440x900 and 900x900 composition, plus focused RTL behavior tests; document the strategy in `docs/08-quality-strategy.md`.

### Out of Scope
- A session-history route or a misleading “View all sessions” link.
- Private-note persistence, generation inclusion, or PDF export inclusion.
- Backend, schema, API, RLS, or fetch-contract changes.
- Fixed/global rails, sticky contextual columns, reordered DOM/focus paths, broad authenticated E2E fixtures, or changes to `large-screen-layout-audit`.

## Capabilities

### New Capabilities
- `generated-session-context`: Non-persistent private-notes placeholder and preserved private-data exclusion in the generated-session context rail.
- `memory-review-workspace`: Large-screen normal-flow proposal/canon composition that preserves the complete review loop and all states.
- `visual-regression-coverage`: Deterministic fixture/interception-based breakpoint screenshots for the three affected workspaces.

### Modified Capabilities
- `campaign-view`: Deterministic three-item active-memory and actionable-arc previews, with truthful specialist-route links and unchanged recent-session behavior.

## Approach

Derive route-local previews from current data: slice newest active memories; priority-sort then slice eligible arcs; leave sessions intact. Replace notes with static localized copy. At `>=1440px`, opt Memory Review into the existing workspace policy with a CSS-only grid after the full-width feedback; proposals stay first in DOM and active canon follows. At smaller widths, retain the current single flow. Its handoff checklist requires the existing breadcrumbs/header/copy, `LoadingScribe`, `Notice`, `EmptyState`, `OriginBadge`, stamp/strike feedback, retry and action controls unchanged. Freeze Chromium fixtures, viewport, motion, and locale for snapshots; use RTL for caps, links, layout semantics, and the full review loop.

## Affected Areas

| Area | Impact | Description |
|---|---|---|
| `apps/web/components/campaigns/*` | Modified | Preview caps, order, links |
| `apps/web/components/sessions/generated-session-view.tsx` | Modified | Static notes placeholder in context rail |
| `apps/web/app/[locale]/campaigns/[id]/memory/review/page.tsx` | Modified | Fourth large-screen workspace; preserve review behavior |
| `apps/web/app/globals.css`, `DESIGN.md` | Modified | Add approved Memory Review exception to workspace policy |
| `apps/web/messages/{en,es}.json` | Modified | Localized labels/copy |
| `apps/web/tests/**`, `apps/web/tests/e2e/**` | Modified | Focused behavior and screenshot coverage |
| `docs/08-quality-strategy.md` | Modified | Visual-regression policy |

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Client memory fetch remains unbounded | Medium | Declare as non-goal; slice only for presentation |
| Snapshot instability | Medium | Chromium-only, frozen fixtures/viewport/motion, deliberate baseline review |
| Priority ordering masks ambiguity | Low | Stable tie ordering and focused tests |
| Workspace policy currently protects Memory Review | Medium | Document the approved exception; keep it CSS-only and normal-flow |

## Rollback Plan

Revert this change’s UI, i18n, tests, baselines, and quality-doc edits together. Existing routes, APIs, and persisted data remain unchanged.

## Dependencies

- Existing `/arcs` and `/memory/review` routes; Playwright Chromium screenshot support; current Memory Review primitives and behavior.

## Success Criteria

- [ ] Campaign detail shows at most three active memories and three actionable arcs; sessions remain unchanged.
- [ ] Only memories and arcs expose truthful “View all” links.
- [ ] Generated-session notes are non-interactive “Coming soon” context, never sent to the Scribe or PDF.
- [ ] At `>=1440px`, Memory Review has full-width chrome/actions and normal-flow proposal/canon columns, while `<=900px` and DOM/focus order remain unchanged.
- [ ] Memory Review preserves each listed state and accept/edit/dismiss/retire behavior; deterministic screenshots and focused RTL pass without authenticated E2E fixtures.
