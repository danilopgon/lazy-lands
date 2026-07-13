# Exploration: refine-campaign-detail-context

### Current State

The frozen `large-screen-layout-audit` already adds CSS-only `>=1440px` workspace zones; this follow-up must not modify its review lineage. Campaign detail currently fetches campaign children, sessions, and active memories independently. Sessions are capped at three newest records but deliberately re-sorted ascending for display. Active memories are newest-first from the API and unbounded. Arcs are filtered to active/dormant and capped at three, but the campaign-child repository specifies no order and the preview does not prioritize high-priority arcs.

Generated-session already uses the workspace's right context column for “Memories woven in” and “Legend”; editable private DM notes remain at the end of the main draft lane. There is no campaign session-history specialist route: generated drafts link individually, while logged sessions do not link. Existing specialist routes are `/arcs` and `/memory/review`.

Playwright is installed and can use native `expect(page).toHaveScreenshot()`, but the project has no screenshot assertions, baseline snapshots, snapshot template, authenticated storage state, or API interception fixture. The existing large-screen E2E file only proves protected-route redirects to login, so it cannot validate workspace composition.

### Affected Areas

- `apps/web/components/campaigns/campaign-detail-view.tsx` — caps/previews arcs and active memories; carries existing links to arcs and memory review.
- `apps/web/components/campaigns/recent-sessions.tsx` — already owns a three-item recent-session preview and chronology restoration.
- `apps/web/components/sessions/generated-session-view.tsx` — move the existing private-notes editor into the normal-flow context aside between woven memories and legend.
- `apps/web/messages/en.json`, `apps/web/messages/es.json` — localize any new “View all” labels; do not hard-code UI copy.
- `apps/web/app/[locale]/campaigns/[id]/__tests__/page.test.tsx` and `apps/web/tests/sessions/generated-session-view.test.tsx` — retain/prove preview ordering, caps, links, notes edit focus, and no-loss behavior.
- `apps/web/tests/e2e/`, `apps/web/playwright.config.ts`, `docs/08-quality-strategy.md` — establish visual-regression baselines and replace the broad authenticated-fixture proposal with focused visual coverage plus interaction tests.

### Approaches

1. **Route-local, deterministic previews (recommended)** — keep all fetch contracts unchanged; derive preview arrays in the existing views.
   - Sessions: preserve the existing limit of 3 newest sessions, rendered chronological among those three. Keep “Log session”; do not falsely add “View all” without a history route.
   - Memories: render the 3 newest active facts (the API is explicitly `created_at DESC`) and link “View all” to `/memory/review`.
   - Arcs: render at most 3 active/dormant arcs, sorting high priority before medium/low, then using stable source order. Link “View all” to `/arcs`.
   - Pros: no backend/schema/query changes; consistent three-record visual rhythm; high-priority unresolved arcs cannot be hidden behind arbitrary insertion order; preserves existing loading/error/empty states.
   - Cons: a full session history remains unavailable from campaign detail; the unchanged API must still fetch all active memories before slicing.
   - Effort: Medium.

2. **Server/API preview endpoints and a session-history route** — add ordered/limited reads plus new specialist navigation.
   - Pros: scales collection reads and gives “View all sessions” a truthful destination.
   - Cons: expands this hierarchy follow-up into API, RLS, route, schema, i18n, and test work; changes more than necessary and exceeds the stated low-risk scope.
   - Effort: High.

### Recommendation

Use Approach 1. Treat each panel as a purposeful preview: three is already established for recent sessions and arcs, gives a scan-friendly context column, and is sufficient when priority ordering protects urgent arcs. Move the same private-notes component—not a duplicate—into the generated-session `<aside>` after woven-memory content and before the legend, retaining its textarea label, autofocus, Save/Cancel behavior, toast, PDF-exclusion label, normal document flow, and DOM reading/focus order.

Use Playwright native screenshots for stable, fixture-driven viewport baselines at `1440x900` and `900x900` for campaign detail and generated session, with English and Spanish represented where label expansion matters. Use deterministic API interception for visual-only rendering rather than authenticating local Supabase. Keep RTL behavioral tests for preview ordering/caps/navigation and private-note editing, saving, cancellation, and failure preservation. Do not add broad authenticated E2E fixtures in this change.

The proposal must explicitly resolve the session-history gap: retain the existing “Log session” action rather than claim “View all sessions,” or separately authorize a session-history route. Existing routes cannot support that label truthfully.

### Risks

- The active-memory API returns every active fact; client slicing improves hierarchy, not fetch volume.
- Arc priority sorting is a presentation policy because the current child API has no ordering guarantee; tests must lock it down.
- Screenshot baselines can be brittle across font/browser environments; run Chromium only, freeze viewport/data/motion, and review baseline updates deliberately.
- Moving notes changes visual placement but must not weaken the private-notes guarantee: never include them in generation or export, and do not make the aside sticky/fixed.
- Spanish strings may widen the context column; screenshots and keyboard focus checks must cover it.

### Ready for Proposal

Yes — provided the proposal records the session-history limitation and keeps this new scope separate from the frozen `large-screen-layout-audit` review lineage.
