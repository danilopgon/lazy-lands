# Proposal: i18n with next-intl

## Intent

Make the frontend bilingual without changing default English URLs. Critical path affected: Landing → Login/Register → Campaign creation/review → Dashboard/Campaign views.

## Scope

### In Scope
- Configure `next-intl` for Next.js App Router with `en` default/current and `es` support.
- Use `localePrefix: 'as-needed'`: English stays unprefixed; Spanish uses `/es/...`.
- Translate current user-facing frontend literals, metadata, validation/error fallbacks, date labels, states, and impacted tests.
- Add a locale switcher to home and `/dashboard` top layout, preserving handoff rhythm.
- Compose i18n routing with Supabase/auth `proxy.ts` without losing session cookies.

### Out of Scope
- Backend-wide i18n, translated API contracts, RAG, embeddings, billing, or collaboration.
- Route rename from `/dashboard` to `/campaigns`.
- Translating LLM prompt payload headings such as `composeRawText`.

## Capabilities

### New Capabilities
- `frontend-i18n`: Locale routing, catalogs, switcher, translated frontend UX, and tests.

### Modified Capabilities
- `repository-bootstrap`: Next.js frontend scaffold gains i18n configuration and translated root/landing/auth behavior.
- `campaign-view`: Dashboard/detail/entity list copy, states, labels, and dates become locale-aware.
- `entity-management`: Modal/Field labels, validation copy, option labels, and fallback errors become locale-aware.

## Approach

Use `next-intl` (`defineRouting`, `createMiddleware`, `getRequestConfig`, `NextIntlClientProvider`). Add `apps/web/i18n/*` and `messages/en.json`/`es.json`; reorganize App Router only as needed. Run i18n middleware first, then auth against a locale-stripped pathname and locale-aware redirect targets.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `apps/web/next.config.ts` | Modified | Wrap with `next-intl` plugin. |
| `apps/web/proxy.ts` | Modified | Compose locale routing with auth/session refresh. |
| `apps/web/app/**`, `components/**`, `lib/**` | Modified | Replace hard-coded frontend copy. |
| `apps/web/messages/*.json` | New | English and Spanish catalogs. |
| `apps/web/tests/**` | Modified | Adapt assertions/fixtures for locale-aware copy and routing. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Auth proxy regression | Med | Preserve Set-Cookie helpers; add route/auth tests. |
| Missed literals | High | Inventory-driven extraction plus focused grep/test review. |
| Legal translation nuance | Med | Translate conservatively; flag for owner legal review. |
| LLM prompt drift | Med | Keep backend-facing prompt headings unchanged. |

## Rollback Plan

Revert the PR. If partially merged, remove `next-intl` config, catalogs, locale routing helpers, switchers, and restore current unlocalized routes/tests.

## Dependencies

- `next-intl` package and App Router integration.
- `PRODUCT.md`, `docs/02-requirements-and-acceptance.md`, `docs/04-architecture.md`.

## Success Criteria

- [ ] English URLs and auth redirects continue to work unprefixed.
- [ ] Spanish URLs work under `/es/...` with correct `<html lang>`.
- [ ] Home and dashboard expose a working language switcher.
- [ ] Current user-facing frontend literals have EN/ES entries or documented exceptions.
- [ ] Frontend tests, lint, typecheck, and relevant E2E checks pass.
