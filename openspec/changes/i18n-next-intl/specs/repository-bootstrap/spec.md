# Delta for Repository Bootstrap

## ADDED Requirements

### Requirement: Frontend i18n scaffold

The Next.js frontend scaffold MUST configure app-router i18n for `en` and `es`, load locale messages per request, expose locale-aware navigation helpers, and set document metadata and `<html lang>` from the active locale.

#### Scenario: Root layout is locale-aware

- GIVEN a request for `/es`
- WHEN the root layout renders
- THEN translated metadata and skip-link copy are used
- AND `<html lang="es">` is emitted

#### Scenario: Current English URLs survive

- GIVEN existing tests or links target `/`, `/login`, `/register`, `/privacy`, or `/cookies`
- WHEN i18n is enabled
- THEN those English URLs continue to resolve unprefixed

### Requirement: Public and auth copy externalization

The system MUST externalize current public, landing, legal, cookie, auth, password-policy, and global overlay copy to English and Spanish catalogs. The existing Spanish-only auth shell literal `volver al inicio` MUST become locale-driven, with English default copy.

#### Scenario: Landing handoff copy is translated

- GIVEN the home route renders
- WHEN locale is `en` or `es`
- THEN public top nav, hero badges/title/body/CTAs/status strip, graph/briefing demo, marquee, pillars, how-it-works, philosophy quote, final CTA, and footer copy use that locale

#### Scenario: Auth flow states are translated

- GIVEN login, register, forgot-password, confirm, or reset pages render loading, error, submitted, form, or success states
- WHEN locale is `es`
- THEN all user-facing labels, validation messages, buttons, and fallback errors appear in Spanish
