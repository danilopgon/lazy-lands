# Frontend i18n Specification

## Purpose

Define bilingual frontend behavior for Lazy Lands using English as the default unprefixed locale and Spanish under `/es/...`.

## Requirements

### Requirement: Locale routing and navigation

The frontend MUST support locales `en` and `es` with English URLs unchanged and Spanish URLs prefixed with `/es`. Locale-aware links, redirects, and auth/proxy decisions MUST preserve the current route set, including `/dashboard` as the campaign-list route.

#### Scenario: English route remains canonical

- GIVEN the default locale is English
- WHEN a user opens `/dashboard`
- THEN the page resolves in English without redirecting to `/en/dashboard`

#### Scenario: Spanish route resolves

- GIVEN Spanish is selected
- WHEN a user opens `/es/dashboard`
- THEN the same dashboard behavior resolves in Spanish
- AND `<html lang>` is `es`

#### Scenario: Auth/proxy behavior is preserved

- GIVEN an unauthenticated request targets `/es/dashboard?x=1`
- WHEN proxy/auth logic runs
- THEN Supabase session cookie handling is preserved
- AND the redirect target is locale-aware, e.g. `/es/login?x=1` where applicable

### Requirement: Message catalogs and literal coverage

All current user-facing frontend literals MUST be externalized to `en` and `es` message catalogs unless documented as an exception. This includes metadata, nav, landing, auth, legal, dashboard, campaign detail, creation/review, entity screens, shared UI labels, validation, fallbacks, loading/error/empty/success states, option labels, and date labels.

#### Scenario: Literal sweep is complete

- GIVEN the frontend source is inspected for user-facing strings
- WHEN implementation is complete
- THEN every current UI literal has `en` and `es` catalog entries or an explicit exception

#### Scenario: Backend/AI text is excluded

- GIVEN backend API contracts, provider messages, or `composeRawText` prompt headings are encountered
- WHEN catalog extraction runs
- THEN backend-wide i18n and AI prompt/output translation are NOT introduced

### Requirement: Language switcher

The system MUST provide a language switcher on home and `/dashboard`, preserving current path/search where safe and using locale-aware navigation.

#### Scenario: Home switcher preserves handoff rhythm

- GIVEN the landing header/mobile overlay is rendered
- WHEN the switcher is shown
- THEN it appears in the public top nav and mobile overlay without breaking the handoff layout, marquee, CTA, or reduced-motion behavior

#### Scenario: Dashboard switcher preserves auth layout

- GIVEN `/dashboard` renders its header action row
- WHEN the switcher is shown
- THEN it appears near `+ New campaign` or the authenticated shell top-right without renaming `/dashboard`

### Requirement: i18n verification

The implementation MUST include tests for routing, switcher behavior, translated states, metadata where feasible, and proxy/auth preservation.

#### Scenario: Verification covers locales

- GIVEN automated frontend checks run
- WHEN tests exercise `/`, `/es`, `/dashboard`, and `/es/dashboard`
- THEN translated copy, locale-aware links, and middleware behavior are asserted
