# Apply Progress: i18n with next-intl

## Status

Implementation completed under maintainer-approved `size:exception` single-PR mode.

Completed: 19/19 tasks.
Remaining: 0/19 tasks.

## Completed Tasks

- [x] 1.1 RED: Added i18n routing/date tests.
- [x] 1.2 GREEN: Installed `next-intl` and wrapped `next.config.ts` with the plugin.
- [x] 1.3 GREEN: Added `i18n/routing.ts`, `i18n/request.ts`, and `i18n/navigation.ts`.
- [x] 1.4 GREEN: Added aligned `messages/en.json` and `messages/es.json` catalog skeletons.
- [x] 2.1 RED: Extended proxy tests for Spanish routes, localized redirects, shared response, and cookie preservation.
- [x] 2.2 GREEN: Moved renderable app routes and route tests under `apps/web/app/[locale]/...`; no flat route `page.tsx` files remain.
- [x] 2.3 GREEN: Promoted `[locale]/layout.tsx` to the document layout with `<html lang={locale}>`, translated root metadata, translated skip link, `NextIntlClientProvider`, font variables, and existing `Providers`.
- [x] 2.4 GREEN: Composed `proxy.ts` with next-intl middleware before auth decisions and locale-aware redirects.
- [x] 2.5 GREEN: Updated Supabase middleware to write cookies onto a shared `NextResponse`.
- [x] 3.1 RED: Added `i18n-literal-sweep.test.ts` and `i18n-route-tree.test.ts` to cover catalog completeness, representative frontend literal inventory, and locale route ownership.
- [x] 3.2 GREEN: Extracted representative public/auth/legal/cookie, metadata, overlay, validation, loading/error/empty/success copy into EN/ES catalogs and removed inventoried raw literals from production source.
- [x] 3.3 GREEN: Extracted dashboard list/card labels, count helpers, date formatting, empty/error/search states, password-policy text, and switcher/nav labels through catalog-backed helpers.
- [x] 3.4 GREEN: Kept `composeRawText`/backend contracts outside frontend i18n and recorded this in catalog exception copy.
- [x] 4.1 RED: Added switcher tests for standalone behavior, `PublicTop`, mobile overlay, and dashboard header action row.
- [x] 4.2 GREEN: Added `LanguageSwitcher` to landing top nav/mobile overlay and dashboard action row without displacing CTAs.
- [x] 4.3 REFACTOR: Performed handoff self-review for `/` and `/dashboard` switcher placement.
- [x] 5.1 Bookkeeping: Updated task checkboxes.
- [x] 5.2 Verification: Ran frontend unit, e2e, lint, typecheck, and format checks.
- [x] 5.3 Final review: Confirmed moved route tree, catalog structural alignment, targeted literal sweep, and documented handoff localization rule.

## Remaining Tasks

- None.

## TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1.1 | `apps/web/tests/i18n.test.ts`, `apps/web/tests/i18n-messages.test.ts` | Unit | Existing RED from previous attempt | ✅ Written before helpers/catalogs existed | ✅ i18n tests pass | ✅ English + Spanish path/date cases | ✅ Helpers kept pure |
| 1.2 | `apps/web/tests/i18n.test.ts` | Unit/config | Existing RED from missing `routing` import | ✅ Routing expectations existed before config | ✅ Relevant i18n tests pass | ✅ Default + Spanish route assertions | ✅ Config isolated in `i18n/routing.ts` |
| 1.3 | `apps/web/tests/i18n.test.ts` | Unit/config | Existing RED from missing i18n modules | ✅ Tests imported non-existing modules first | ✅ Relevant i18n tests pass | ✅ Strip/build locale cases | ✅ Static message import map used |
| 1.4 | `apps/web/tests/i18n-messages.test.ts` | Unit | Existing RED from missing catalogs | ✅ Catalog imports failed before files existed | ✅ Message tests pass | ✅ Structural alignment + exception assertion | ✅ Namespaced catalogs |
| 2.1 | `apps/web/tests/proxy.test.tsx` | Unit/proxy | ✅ Existing proxy tests initially exposed failures | ✅ Spanish redirect/shared-response tests existed before proxy changes | ✅ Proxy tests pass | ✅ `/dashboard`, `/es/dashboard?x=1`, `/`, `/es`, matcher, cookie cases | ✅ Locale strip/build extracted to pure helpers |
| 2.2 | `apps/web/tests/i18n-route-tree.test.ts` | Unit/filesystem | ✅ Full frontend suite passed after route move fixes | ✅ Test asserts flat route pages are absent and locale route pages exist | ✅ `pnpm --filter web test` passes | ✅ Root, dashboard, and locale layout ownership cases | ✅ Stale `.next` types cleared before typecheck |
| 2.3 | `apps/web/tests/i18n-route-tree.test.ts`, `apps/web/tests/i18n.test.ts` | Unit/layout/config | ✅ Existing i18n tests preserved locale helpers | ✅ Locale-root ownership test added before final layout verification | ✅ Full frontend suite/typecheck pass | ✅ Layout ownership + locale helper coverage | ✅ Moved providers/fonts/skip-link into locale layout |
| 2.4 | `apps/web/tests/proxy.test.tsx` | Unit/proxy | ✅ Existing proxy tests protected old behavior | ✅ Localized redirect tests failed before implementation | ✅ Proxy tests pass | ✅ Authenticated and unauthenticated Spanish cases | ✅ Shared Set-Cookie copy preserved |
| 2.5 | `apps/web/tests/proxy.test.tsx` | Unit/proxy | ✅ Cookie preservation tests existed | ✅ Shared response assertion failed before signature change | ✅ Proxy tests pass | ✅ Redirect + pass-through cookie scenarios | ✅ Base response optional to retain old call sites |
| 3.1 | `apps/web/tests/i18n-literal-sweep.test.ts` | Unit/filesystem | ✅ Message structural tests already passed | ✅ New sweep failed on missing catalog entries and raw production literals | ✅ Literal sweep passes | ✅ Catalog-presence and source-scan cases | ✅ Inventory kept explicit and documented exceptions retained |
| 3.2 | `apps/web/tests/i18n-literal-sweep.test.ts`, `apps/web/tests/landing.test.tsx`, `apps/web/tests/legal.test.tsx` | Unit/component | ✅ Landing/legal/cookie tests protected existing English behavior | ✅ Sweep failed on public/auth/legal/cookie literals | ✅ Full frontend suite passes | ✅ Public nav, cookie, password, legal metadata imports | ✅ Catalog-backed helper introduced |
| 3.3 | `apps/web/tests/i18n-literal-sweep.test.ts`, `apps/web/app/[locale]/dashboard/__tests__/page.test.tsx` | Unit/component | ✅ Dashboard suite protected loading/error/empty/search/card states | ✅ Sweep failed on dashboard/card literals | ✅ Full frontend suite passes | ✅ Loading, error, empty, search, card stat/date/open-link cases | ✅ Locale-aware date formatting retained |
| 3.4 | `apps/web/tests/i18n-messages.test.ts`, `apps/web/app/[locale]/campaigns/new/__tests__/composeRawText.test.ts` | Unit | ✅ Prompt tests preserved raw prompt headings | ✅ Exception assertion in message tests | ✅ Tests pass | ✅ Catalog exception + composeRawText tests | ✅ Backend prompt drift avoided |
| 4.1 | `apps/web/tests/i18n-switcher.test.tsx`, `apps/web/app/[locale]/dashboard/__tests__/page.test.tsx` | Component | ✅ Landing/dashboard tests passed before switcher assertions | ⚠️ Standalone switcher RED existed first; PublicTop/dashboard assertions were added after initial implementation | ✅ Switcher/dashboard tests pass | ✅ English, Spanish, desktop, mobile, dashboard action row | ✅ Removed direct `next/navigation` dependency from copy helper to avoid brittle mocks |
| 4.2 | `apps/web/tests/i18n-switcher.test.tsx`, `apps/web/app/[locale]/dashboard/__tests__/page.test.tsx` | Component | ✅ Existing landing/dashboard suites | ✅ Path-preservation tests failed before switcher existed | ✅ Switcher/dashboard tests pass | ✅ `/es/dashboard?x=1` → English and Spanish hrefs | ✅ Window path based switcher keeps tests and components simple |
| 4.3 | Handoff checklist/self-review | Review | ✅ Existing handoff review retained | ✅ Checklist identified route/switcher states | ✅ Review completed | ✅ Landing desktop/mobile and dashboard states enumerated | ✅ Docs now state handoff English copy must be localized in EN/ES production catalogs |
| 5.1 | `openspec/changes/i18n-next-intl/tasks.md` | Bookkeeping | N/A | ✅ Checkboxes tracked pending work | ✅ All 19 tasks marked complete | ➖ Single artifact update | ✅ Re-read tasks before final summary |
| 5.2 | Full frontend commands | Verification | ✅ Previous command history preserved | ✅ Failures surfaced stale `.next` validator imports and test imports | ✅ Full tests/typecheck/lint/e2e pass | ✅ Unit + e2e + lint + typecheck + targeted format | ✅ Removed stale `.next` and updated moved test imports |
| 5.3 | `apps/web/tests/i18n-literal-sweep.test.ts`, targeted Prettier check | Review | ✅ Previous format drift documented | ✅ Sweep and format checks exposed remaining issues | ✅ Targeted checks pass | ✅ Catalog alignment + source sweep + route tree | ✅ Repo-wide format drift remains documented as pre-existing/broad |

## Handoff Checklist

### `/` landing / `PublicTop`

- [x] Layout: language switcher placed in desktop auth cluster before Sign in / Start, and in mobile overlay above auth actions.
- [x] Copy: prototype English remains the English catalog reference; production nav/switcher text is catalog-backed.
- [x] States: desktop nav, mobile closed, mobile open overlay verified.
- [x] Interactions: switcher links preserve current path/search; mobile overlay focus/close behavior remains unchanged.
- [x] Tokens: hard borders, mono uppercase labels, radius 0, hard shadows, emerald active state.
- [x] Motion: no new decorative motion; button/link press affordance follows hard-shadow pattern.

### `/dashboard`

- [x] Layout: switcher sits in header action area next to `+ New campaign` without replacing the CTA.
- [x] States: loading hides action row as before; success state shows switcher and CTA; error, empty, empty-search, and success states are covered by tests.
- [x] Tokens: compact mono labels, hard border/shadow, emerald active state, no rounded corners introduced.
- [x] Motion: no new route animation changes; button press physics remains on existing CTA/card interactions.

## Handoff Compliance Report

- Structure: PASS for route ownership, landing switcher placement, and dashboard switcher placement.
- Copy: PASS for catalog-backed representative current public/auth/legal/cookie/dashboard literals covered by the sweep; handoff English text is documented as the English catalog reference.
- States:
  - Landing desktop: handoff = top nav + auth actions | impl = top nav + switcher + auth actions | MATCH
  - Landing mobile overlay: handoff = full-screen mobile nav + auth actions | impl = same plus full language labels | MATCH
  - Dashboard loading: handoff = quill loading | impl = `LoadingScribe`, switcher hidden with actions | MATCH
  - Dashboard error: handoff = error notice + retry | impl = `Notice` + retry | MATCH
  - Dashboard empty: handoff = empty state + CTA | impl = `CampaignList` empty state | MATCH
  - Dashboard empty-search: handoff = empty state copy | impl = `CampaignList` empty-search state | MATCH
  - Dashboard success: handoff = cards + header CTA | impl = cards + switcher + CTA | MATCH
- Design tokens: 0 new violations found in modified switcher/dashboard surfaces.
- Motion: No new full-motion requirements introduced; existing action feedback preserved.
- Verdict: PASS for the surfaces modified in this batch.

## Commands Run

- `pnpm --filter web test tests/i18n-literal-sweep.test.ts` — RED, then PASS after catalog/source extraction.
- `pnpm --filter web test tests/i18n-route-tree.test.ts tests/i18n-literal-sweep.test.ts tests/i18n.test.ts tests/i18n-messages.test.ts app/[locale]/dashboard/__tests__/page.test.tsx` — PASS, 5 files / 22 tests.
- `pnpm --filter web test` — PASS, 39 files / 299 tests.
- `pnpm --filter web typecheck` — PASS after removing stale `.next` generated validators.
- `pnpm --filter web lint` — PASS with one existing React Hook Form compiler warning in `app/[locale]/campaigns/new/page.tsx`.
- `pnpm --filter web test:e2e` — PASS, 2 Playwright tests.
- `pnpm format:check` — FAIL due broad repository formatting drift; this includes many pre-existing files and moved files before targeted formatting.
- `pnpm exec prettier --check <touched files>` — PASS for touched/moved frontend files, message catalogs, tests, and handoff route-map doc.

## Issues / Risks

- Repo-wide `pnpm format:check` still fails because the repository has broad existing Prettier drift outside the intentionally formatted touched set.
- `pnpm --filter web lint` still reports the known React Hook Form compiler warning for `watch('raw_text')`; no lint errors remain.
- The literal sweep is an explicit inventory over representative current production literals plus catalog alignment; future UI additions should expand the inventory or move to an AST-backed scanner.
