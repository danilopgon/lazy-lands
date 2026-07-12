## Exploration: campaign-detail-loading-feedback

### Current State
`CampaignDetailPage` first loads the campaign, then `CampaignDetailView` independently requests sessions and active memory facts with React Query. `RecentSessions` returns `null` while loading, creating an empty gap before list rows appear. `ActiveMemoriesPanel` shows only static text inside a bordered box. Both queries already have independent error and success branches; no API, data model, or query-contract change is required.

The issue is a frontend UX polish change for the Campaign detail surface. The existing `LoadingScribe` is a full-page quill treatment, whereas this task needs compact, layout-shaped section feedback.

### Affected Areas
- `apps/web/components/campaigns/recent-sessions.tsx` — replace the silent loading branch with a sessions-shaped skeleton while retaining the current error, empty, and success behavior.
- `apps/web/components/campaigns/campaign-detail-view.tsx` — replace the static active-memory loading box with the matching compact loading treatment; preserve its existing branches and independent React Query requests.
- `apps/web/app/globals.css` — add narrowly scoped Print Chronicle loading/settle motion, gated by `data-motion` and reduced-motion preferences.
- `apps/web/messages/en.json` and `apps/web/messages/es.json` — add localized, accessible loading labels only if the skeleton needs wording beyond the existing active-memory string.
- `apps/web/app/[locale]/campaigns/[id]/__tests__/page.test.tsx` — add deliberate deferred-query coverage for each section loading state and replacement behavior.

### Handoff Checklist

#### Route and structure
- [ ] Target route: `/campaigns/:id`, mapped to `handoff/app/views-detail.jsx` → `CampaignDetail`.
- [ ] Preserve the page order: breadcrumb; campaign header/actions; metrics ledger; editorial two columns; left `/01 The state of the world`, then `/02 Recent sessions`; right `/03 Arcs needing attention`, then `/04 Active memories`.
- [ ] Preserve the `llg` two-column layout (`1fr 340px` in production) and its single-column collapse at `<=900px`; loading placeholders must occupy their own section width and must not change the surrounding column structure.
- [ ] Preserve `/02` heading and `Log session →` navigation; preserve `/04` heading and `Memory →` navigation. Loading must not disable or replace these navigation affordances.

#### Fields and copy
- [ ] No editable fields or validation exist in either affected section.
- [ ] Use localized message catalog values; do not hard-code handoff English. Existing relevant text: `Recent sessions`, `Loading active memories`, `Could not load recent sessions.`, `Could not load active memories.`, and `No memories yet` (plus Spanish equivalents).
- [ ] Any new loading announcement must describe the corresponding section, be concise, and remain product/Scribe-appropriate rather than implying canon or background AI work.

#### States (enumerated individually)
- [ ] Recent sessions — loading: show a compact, list-shaped skeleton immediately while `getSessions` is pending; reserve approximately the height of up to three current rows and expose an accessible loading status.
- [ ] Recent sessions — error: retain the localized inline `Could not load recent sessions.` feedback; do not present fabricated rows or change the request contract.
- [ ] Recent sessions — empty: retain `EmptyState` with its ornament, explanatory copy, and `Log session` CTA.
- [ ] Recent sessions — success: retain the three-item maximum, chronological display ordering, generated-draft link rules, summaries, and `Resume draft` affordance.
- [ ] Active memories — loading: replace the static bordered text box with a compact memory-record-shaped skeleton plus an accessible localized loading status; reserve the approximate height of the existing three-record panel.
- [ ] Active memories — error: retain the localized danger panel and retry button, including a keyboard-operable retry action.
- [ ] Active memories — empty: retain the dashed panel and localized `No memories yet` copy.
- [ ] Active memories — success: retain type label, content, accepted source text, and live facts only; never fabricate memory content or provenance.

#### Shared components and existing patterns
- [ ] `Shell`, `Kicker`, `ScribeNotice`, `OriginBadge`, `Modal`, and `Field` are not used by this handoff portion and are out of scope.
- [ ] `Loading` in `handoff/app/ui.jsx` defines the Scribe loading language: decorative `✒` quill, heading, and mono caption with ellipsis. `LoadingScribe` is the existing production equivalent, but its full-page scale is unsuitable for these inline panels.
- [ ] Reuse the production `EmptyState` for the existing sessions empty branch and existing `Button`/localized `Link` behavior.
- [ ] Prefer one small reusable presentational skeleton primitive only if both panels can share it without erasing their distinct final row geometry; otherwise keep compact local skeleton markup.

#### Tokens and visual language
- [ ] Preserve radius `0`, `--paper` surfaces, `--border`/`--dotted` structural rules, and hard `--shadow` offsets. Do not introduce soft shadows, gradients, glass, or a new accent color.
- [ ] Match the final list vocabulary: dashed `--dotted` separators, serif content rhythm, mono labels/status text, and emerald only for semantic Scribe/state emphasis.
- [ ] Do not render false text-shaped content as real data. Neutral bars must be `aria-hidden` and visually communicate structure only.
- [ ] Avoid an additional full-page spinner or a generic circular loader; the signal should be quiet and local to the pending section.

#### Motion and accessibility
- [ ] Under `data-motion="full"`, allow only a restrained opacity/background-position or transform/opacity settle (150–200ms) that communicates pending-to-ready replacement; content must be visible by default and never depend on animation completion.
- [ ] Under `data-motion="subtle"`, do not add decorative entrance choreography; a static skeleton and instant/near-instant replacement are sufficient.
- [ ] Under `data-motion="off"` and `prefers-reduced-motion: reduce`, stop all skeleton/quill/settle animation while preserving the loading structure and status text.
- [ ] Add `aria-busy="true"` to the pending section container and a concise `role="status"`/live announcement. Decorative bars and quill glyphs must be hidden from assistive technology.
- [ ] Keep visible focus indicators and all existing links/buttons available; loading placeholders must not take focus or create keyboard traps.
- [ ] Reserve a stable minimum block size per panel to reduce CLS. The exact size should reflect the final three-row cap rather than a large generic card; validate at desktop and the <=900px single-column layout.

### Approaches
1. **Inline, section-shaped skeletons with a short settle transition** — Render local skeleton rows in each existing loading branch and add minimal shared CSS motion gates.
   - Pros: Directly resolves both issue symptoms; preserves approximate content height; keeps request boundaries, API calls, and current states intact; matches the product’s local list vocabulary.
   - Cons: Requires careful visual calibration for two different panel shapes and localized status text/tests.
   - Effort: Low.

2. **Reuse the full `LoadingScribe` treatment in each section** — Place a quill/caption block where each panel currently renders.
   - Pros: Reuses a known component and Scribe motif.
   - Cons: Too tall and visually competitive for a secondary async panel; increases layout shift and contradicts the product-register preference for skeletons in contextual loading states.
   - Effort: Low.

3. **Add a React animation library transition wrapper** — Use Motion presence/layout animation for skeleton-to-content replacement.
   - Pros: Can produce polished replacement transitions.
   - Cons: The dependency exists but is unnecessary for two small local transitions; adds client complexity and risks animation-driven layout instability without better user value.
   - Effort: Medium.

### Recommendation
Use Approach 1. Implement compact skeletons that mirror each section’s actual row geometry, reserve the three-row presentation height, and announce loading accessibly. Add only CSS-based, transform/opacity-safe settle feedback under `data-motion="full"`; make the skeleton static for `subtle`, `off`, and reduced-motion users. This preserves the Print Chronicle system and the user’s task flow without adding a generic loader, data-fetching change, or dependency.

### Testing Implications
- Strict TDD applies: first add failing deferred-promise tests to the existing campaign-detail page suite.
- Assert Recent sessions exposes an accessible loading status instead of rendering `null`.
- Assert Active memories exposes its loading status and structural placeholder instead of only static copy.
- Resolve each deferred request and assert the corresponding success content replaces the loading status.
- Retain/assert independent error, empty, and success behavior for both panels, including the active-memory retry action and session CTA/draft links.
- Test English and Spanish message resolution for any newly introduced visible/loading text. Do not assert Tailwind classes; style/CLS and reduced-motion behavior need browser/manual visual review because JSDOM cannot measure layout shift or animation preference fidelity.

### Risks
- Skeletons that are materially taller or shorter than the capped three-row content will still cause a visible layout shift, especially after the right column collapses below 901px.
- An ARIA status without a clear section-specific label can create ambiguous or duplicate announcements; decorative loading marks must stay hidden.
- A continuous shimmer/quill that bypasses `data-motion` or `prefers-reduced-motion` would violate the established motion contract.
- Combining query refactors with this visual change risks cache/error regressions; scope must remain presentation-only.

### Ready for Proposal
Yes. The proposal should scope a frontend-only refinement to the two independent Campaign detail query panels, include the checklist above as acceptance criteria, and forecast a single PR well below the 800 changed-line budget.
