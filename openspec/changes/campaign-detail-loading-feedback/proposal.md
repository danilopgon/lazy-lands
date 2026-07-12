# Proposal: Campaign Detail Loading Feedback

## Intent

Fix issue #52 on the **Campaign** critical-path step. Pending Recent sessions and Active memories need immediate, accessible, layout-shaped feedback. The user-approved expansion also makes resolved Recent sessions denser: titles stay primary while each row exposes only a short, readable two-line excerpt of what occurred. This supports PRODUCT.md P2 continuity without letting session prose dominate the detail page.

## Scope

### In Scope
- Replace the two local loading branches with compact, section-specific skeletons sized for their capped three-row results.
- Revise only the Recent sessions success presentation: retain the title as the visual primary element and clamp the existing occurrence/summary text to a readable two-line excerpt.
- Recalibrate the Recent sessions skeleton to the denser final row geometry, preserving a stable three-row reserved block.
- Add section-specific localized loading status, `aria-busy`, and hidden decorative bars; preserve focusable section navigation and retry behavior.
- Add only scoped Print Chronicle settle styling (150–200ms, transform/opacity or background-position) for `data-motion="full"`; static under `subtle`, `off`, and reduced motion.
- Add deferred-query tests proving each loading state is replaced by its existing resolved state.

### Out of Scope
- API, React Query keys/contracts, data models, cache behavior, or server changes.
- Generic/global loaders, reuse of the full-page `LoadingScribe`, new animation dependencies, or a layout redesign.
- API/query/data contracts; session ordering; the maximum-three result count; draft links; Resume draft; provenance; or other page sections.
- Copy rewriting, new session fields, altered summaries, pagination, or a layout redesign.

## Capabilities

### New Capabilities
None.

### Modified Capabilities
- `campaign-view`: Campaign detail section-loading requirements gain accessible, stable, section-shaped feedback.

## Approach

**Design read:** task-focused DM campaign detail for continuity review, using the existing Print Chronicle system: quiet local ledger/list feedback, not a competing loading scene.

Use local skeleton markup (or one small presentational primitive only if it preserves distinct session-row and memory-record geometries). Keep the independent queries and non-loading branches. Apply a presentation-only two-line clamp to existing session occurrence text; do not transform or replace its data. Use `--paper`, `--border`, `--dotted`, hard ink shadows, serif reading rhythm, and mono status text; no false data text, gradients, soft shadows, glass, or new color.

## Handoff Acceptance Constraints

- Preserve `/02` and `/04` headings, links, editorial two-column order, `llg` 900px collapse, and section widths.
- Recent sessions: loading skeleton + status; retain localized error and EmptyState/CTA. **Revised success state:** each of at most three chronological rows keeps its title primary and renders only a two-line excerpt of existing occurrence text, while draft links and Resume draft remain unchanged.
- Active memories: record-shaped skeleton + status; retain error/retry, dashed empty state, and live type/content/source success rows only.
- Decorative bars/quill are `aria-hidden`; pending containers are `aria-busy`; status is concise and localized. No focus traps.
- Reserve approximate three-row height, calibrated to the dense session rows; motion never gates visibility.

## Affected Areas

| Area | Impact | Description |
|---|---|---|
| `apps/web/components/campaigns/recent-sessions.tsx` | Modified | Dense success rows and calibrated loading branch |
| `apps/web/components/campaigns/campaign-detail-view.tsx` | Modified | Memory loading branch |
| `apps/web/app/globals.css` | Modified | Scoped motion gates |
| `apps/web/messages/{en,es}.json` | Modified | Loading labels if needed |
| `apps/web/app/[locale]/campaigns/[id]/__tests__/page.test.tsx` | Modified | Deferred-query coverage |

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Skeleton mismatches the dense rows, causing CLS | Medium | Calibrate against the final two-line, three-row geometry at desktop and <=900px |
| Excerpt styling hides session identity or changes data semantics | Low | Keep title primary; clamp only existing occurrence text; preserve links, order, count, and provenance |
| Ambiguous announcements | Low | Section-specific localized status and hidden decoration |
| Motion-contract regression | Low | Gate CSS by motion flags and reduced-motion preference |

## Rollback Plan

Revert the presentation, message, CSS, and test changes together; queries and data contracts remain untouched.

## Dependencies

- Existing `campaign-view` capability, translations, and Print Chronicle tokens.

## Success Criteria

- [ ] Both pending sections render localized, accessible, structurally accurate feedback without layout replacement.
- [ ] Revised Recent sessions success shows title-first rows with only a readable two-line existing-text excerpt, while chronological order, three-item cap, draft links, Resume draft, and provenance remain unchanged.
- [ ] Existing error, empty, Active memories success, navigation, and retry behavior remains unchanged.
- [ ] A single PR is forecast well below the 800-line review budget.
