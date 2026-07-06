# Tasks: i18n with next-intl

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 1,200-1,800 |
| 400-line budget risk | High |
| 800-line budget risk | High |
| Chained PRs recommended | No — maintainer-approved `size:exception` for single PR |
| Suggested split | Single PR; use work-unit commits internally |
| Delivery strategy | single-pr-default with size:exception |
| Chain strategy | size-exception |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: High
800-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | next-intl scaffold, routes, proxy tests | Single PR | Commit with tests and config |
| 2 | catalogs and literal extraction | Single PR | Inventory-driven; document exceptions |
| 3 | switchers, translated UI, verification | Single PR | Include handoff self-review |

## Phase 1: Frontend i18n foundation

- [x] 1.1 RED: Add tests for `i18n/routing`, request message loading, `formatShortDate(locale)`, and unprefixed English vs `/es` behavior.
- [x] 1.2 GREEN: Install `next-intl`; update `apps/web/package.json`, lockfile, and `apps/web/next.config.ts` with the plugin.
- [x] 1.3 GREEN: Create `apps/web/i18n/routing.ts`, `request.ts`, and `navigation.ts` using `localePrefix: 'as-needed'` and static message imports.
- [x] 1.4 GREEN: Create `apps/web/messages/en.json` and `es.json` namespace skeletons: Root, Nav, Landing, Auth, Dashboard, Campaigns, Entities, Shared, Legal, Errors, Dates.

## Phase 2: Route, layout, and proxy composition

- [x] 2.1 RED: Extend proxy/auth tests for `/dashboard`, `/es/dashboard?x=1`, `/`, `/es`, localized redirects, matcher behavior, and cookie preservation.
- [x] 2.2 GREEN: Move renderable routes under `apps/web/app/[locale]/...`; keep English public URLs stable and `/dashboard` unchanged.
- [x] 2.3 GREEN: Implement locale root layout with `<html lang>`, translated metadata/skip link, `NextIntlClientProvider`, and existing providers.
- [x] 2.4 GREEN: Compose `apps/web/proxy.ts` with next-intl middleware before auth; strip locale for auth decisions and preserve locale in redirects.
- [x] 2.5 GREEN: Update `apps/web/lib/supabase/middleware.ts` to write cookies onto the shared `NextResponse`.

## Phase 3: Exhaustive literal extraction

- [x] 3.1 RED: Add message-completeness/literal-sweep tests or scripts covering frontend source and documented exceptions.
- [x] 3.2 GREEN: Extract landing, public/auth/legal/cookie, metadata, overlays, validation, loading/error/empty/success copy into catalogs.
- [x] 3.3 GREEN: Extract dashboard, campaign detail, creation/review, NPC/faction/arc lists and modals, shared primitives, enum display labels, and dates.
- [x] 3.4 GREEN: Keep backend API codes and `composeRawText` prompt headings untranslated; record exceptions near the sweep test.

## Phase 4: Language switchers and handoff compliance

- [x] 4.1 RED: Add RTL tests for `components/i18n/language-switcher.tsx`, `PublicTop`, mobile overlay, and dashboard header action row.
- [x] 4.2 GREEN: Implement locale switcher preserving pathname/search with `i18n/navigation`; add it to home and `/dashboard` without displacing CTAs.
- [x] 4.3 REFACTOR: Perform handoff checklist/self-review for `/` and `/dashboard`: layout, states, tokens, motion, and shared components.

## Phase 5: Verification and apply bookkeeping

- [x] 5.1 Update these checkboxes during apply immediately after each task passes.
- [x] 5.2 Run `pnpm --filter web test`, `pnpm --filter web test:e2e`, `pnpm lint`, and `pnpm typecheck`; fix regressions.
- [x] 5.3 Final grep/literal review for hard-coded user-facing strings and confirm EN/ES catalogs stay structurally aligned.
