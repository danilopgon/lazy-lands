# Design: i18n with next-intl

## Technical Approach

Add frontend-only internationalization in `apps/web` with `next-intl`, preserving English as the default unprefixed experience and adding Spanish at `/es/...`. Move renderable app routes under a top-level locale segment while keeping public URLs stable through `localePrefix: 'as-needed'`. Translate current static UI copy, route metadata, frontend-owned validation/fallback text, date labels, and tests; do not localize backend API contracts or LLM prompt internals such as `composeRawText` headings.

## Architecture Decisions

| Decision | Alternatives considered | Rationale |
|---|---|---|
| Use `next-intl` with `defineRouting`, `getRequestConfig`, plugin, and middleware | `react-i18next`, cookie-only custom i18n | Matches App Router/RSC patterns and user constraint; avoids turning server pages into client components. |
| `localePrefix: 'as-needed'`, locales `en`/`es`, default `en` | Prefix all locales; `localePrefix: 'never'` | Keeps `/`, `/dashboard`, auth callbacks, and existing English tests semantically intact while making Spanish shareable at `/es/...`. |
| Introduce `app/[locale]/...` route tree | Keep flat routes and infer locale only from cookie | Gives `<html lang>`, request messages, and metadata a clear locale boundary; Next/next-intl middleware rewrites unprefixed English internally. |
| Compose i18n + Supabase proxy via shared response | Run only one middleware; auth before locale normalization | Preserves existing auth cookies/redirects and lets auth decisions use locale-stripped paths. |
| Catalog JSON namespaces by feature/surface | One flat key file | Supports exhaustive literal inventory without unreadable keys. |

## Data Flow

```text
request /es/dashboard
  -> createMiddleware(routing)
  -> updateSession(request, intlResponse) refreshes Supabase cookies on same response
  -> stripLocale('/es/dashboard') = '/dashboard'
  -> decideAuth(user, '/dashboard')
  -> redirect targets keep locale: /es/login or /es/dashboard
  -> app/[locale]/layout loads messages + renders provider
```

## File Changes

| File | Action | Description |
|---|---|---|
| `apps/web/package.json` | Modify | Add `next-intl`. |
| `apps/web/next.config.ts` | Modify | Wrap config with `createNextIntlPlugin('./i18n/request.ts')`, preserving `standalone` and Turbopack root. |
| `apps/web/i18n/routing.ts` | Create | `defineRouting({locales: ['en','es'], defaultLocale: 'en', localePrefix: 'as-needed'})`; export locale types/helpers. |
| `apps/web/i18n/request.ts` | Create | `getRequestConfig` validates locale and imports `messages/${locale}.json` through explicit static map. |
| `apps/web/i18n/navigation.ts` | Create | `createNavigation(routing)` exports localized `Link`, `useRouter`, `usePathname`. |
| `apps/web/messages/en.json`, `apps/web/messages/es.json` | Create | Namespaced catalogs. English mirrors current behavior; Spanish covers current frontend literals. |
| `apps/web/app/[locale]/layout.tsx` | Create/Move | Locale root layout sets `<html lang={locale}>`, translated skip link, `NextIntlClientProvider`, existing `Providers`. |
| `apps/web/app/**` | Move/Modify | Move pages below `[locale]`; convert metadata to locale-aware `generateMetadata` where copy differs. |
| `apps/web/proxy.ts` | Modify | Run next-intl middleware and auth composition; strip locale before `decideAuth`; preserve Set-Cookie copy helpers. |
| `apps/web/lib/supabase/middleware.ts` | Modify | Accept optional base `NextResponse` so Supabase cookie writes do not discard next-intl rewrite/redirect headers. |
| `apps/web/components/i18n/language-switcher.tsx` | Create | Reusable switcher for `PublicTop` and dashboard header; keeps current pathname/search params. |
| `apps/web/components/landing/public-top.tsx`, `app/[locale]/dashboard/page.tsx` | Modify | Insert switcher before auth buttons and beside `+ New campaign`, preserving mono uppercase, radius 0, hard ink shadow, emerald accent. |
| `apps/web/lib/format.ts` | Modify | Accept locale or expose locale-aware formatter wrapper. |
| `apps/web/tests/**` | Modify | Add routing/request/proxy/switcher tests and update copy assertions. |

## Interfaces / Contracts

```ts
export const routing = defineRouting({locales: ['en', 'es'], defaultLocale: 'en', localePrefix: 'as-needed'});
export type AppLocale = (typeof routing.locales)[number];
type LanguageSwitcherProps = { className?: string; compact?: boolean };
```

Message namespaces: `Root`, `Nav`, `Landing`, `Auth`, `Dashboard`, `Campaigns.Create`, `Campaigns.Review`, `Campaigns.Detail`, `Entities`, `Shared`, `Legal`, `Errors`, `Dates`. Provider/backend raw messages remain a documented limitation unless mapped to frontend-owned generic fallbacks.

## Testing Strategy

| Layer | What to Test | Approach |
|---|---|---|
| Unit | routing config, locale strip/build helpers, `formatShortDate(locale)`, message completeness | Vitest first, then implementation. |
| Component | `LanguageSwitcher`, `PublicTop`, dashboard header, auth/legal translated copy | RTL with mocked next-intl provider/navigation. |
| Proxy | `/dashboard`, `/es/dashboard`, `/`, `/es`, cookie preservation, localized redirects, matcher | Extend current proxy tests before refactor. |
| E2E | English unprefixed smoke and Spanish `/es/...` smoke through landing/auth/dashboard | Playwright focused smoke. |

## Migration / Rollout

No data migration required. Roll out in one frontend PR with route moves first, proxy tests guarding auth cookies, then catalog extraction. Rollback is PR revert; partial rollback removes `next-intl`, `i18n/*`, `messages/*`, switcher, locale segment, and restores flat routes/tests.

## Open Questions

- None blocking. Legal Spanish wording should be owner-reviewed after implementation.
