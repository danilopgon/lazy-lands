## Exploration: i18n-next-intl

### Current State

`apps/web` is a Next.js App Router frontend with a flat route tree rooted at `app/`. There is no locale segment today. The root layout hard-codes `<html lang="en" data-theme="light" data-motion="full">`, exports English metadata, renders a global English skip link, and wraps pages with the existing `Providers` component.

Implemented user-facing routes are:

- `/` — landing page with `AnnouncementBar`, `LandingPage`, and `CookieBanner`.
- `/login`, `/register`, `/forgot-password`, `/auth/confirm`, `/auth/reset` — Supabase auth flows.
- `/privacy`, `/cookies` — non-indexed legal/storage policy pages.
- `/dashboard` — current campaign dashboard, although product/handoff route map calls this surface `/campaigns`.
- `/campaigns/new`, `/campaigns/new/review` — campaign creation and extraction review.
- `/campaigns/[id]`, `/campaigns/[id]/npcs`, `/campaigns/[id]/factions`, `/campaigns/[id]/arcs` — campaign detail and entity management.

The app has an existing `apps/web/proxy.ts` for Supabase session refresh and route protection. It runs broadly on page requests, excludes Next internals and static images, and redirects unauthenticated protected routes to `/login` or authenticated public auth pages to `/dashboard` through `decideAuth`.

There are many hard-coded English UI literals spread across route components, shared UI components, form schemas, data modules, metadata, date formatting, and tests. One existing auth shell literal is already Spanish: `volver al inicio` in `components/auth/auth-card.tsx`.

### Affected Areas

- `apps/web/next.config.ts` — must be wrapped with the `next-intl` plugin.
- `apps/web/i18n/routing.ts` — should define locales `['en', 'es']`, default `en`, and the locale prefix strategy.
- `apps/web/i18n/request.ts` — should load `messages/{locale}.json` through `getRequestConfig`.
- `apps/web/messages/en.json`, `apps/web/messages/es.json` — new translation catalogs.
- `apps/web/proxy.ts` — must compose `next-intl` routing with the current Supabase/auth proxy behavior without dropping Set-Cookie forwarding.
- `apps/web/app/layout.tsx` — must become locale-aware, set `<html lang={locale}>`, and provide `NextIntlClientProvider`.
- `apps/web/app/**/page.tsx` — page metadata, headings, labels, button copy, validation messages, loading/error/empty states, and route redirects need translation wiring.
- `apps/web/components/layout/announcement-bar.tsx` — home top overlay copy and dismiss accessible label.
- `apps/web/components/layout/cookie-banner.tsx` — cookie notice copy and action.
- `apps/web/components/landing/**` — landing header, hero, data modules, sections, footer, and coming-soon/demo copy.
- `apps/web/components/auth/**`, `apps/web/lib/auth/password.ts` — auth frame, password policy, validation strings, and auth button states.
- `apps/web/components/campaigns/**` — dashboard cards, entity lists, modal titles, field labels, empty states, destructive confirmations, error messages, and status/priority display labels.
- `apps/web/components/ui/**` — default shared literals (`LoadingScribe`, `OriginBadge`, `Field` optional marker, `Modal` close label, `EmptyState` default ornament is not translated).
- `apps/web/lib/format.ts` — date formatting is fixed to `en-US`; should accept locale or use translated formatter hooks.
- `apps/web/tests/**` and `apps/web/app/**/__tests__/**` — tests query English accessible names/text and must be adapted to translated catalogs or locale-aware fixtures.
- `handoff/app/views-landing.jsx`, `handoff/app/views-dashboard.jsx`, `handoff/app/ui.jsx` — home/dashboard visual reference; language switcher must preserve Print Chronicle header rhythm.

### Literal Inventory Summary

The following user-facing literal groups were found and should be moved into namespaced message catalogs.

#### Root, metadata, legal, global overlays

- Root metadata: `Lazy Lands`, `Campaign Companion for Dungeon Masters`.
- Home metadata: `Lazy Lands — Campaign Companion for Dungeon Masters`; description beginning `Track every NPC, faction and consequence...`.
- Skip link: `Skip to content`.
- Announcement bar: `Under active development — features ship weekly.`, `Sign up`, `and you'll be the first to know.`, `Dismiss announcement`.
- Cookie banner: `Cookie notice`, `Lazy Lands uses cookies for authentication only. No tracking, no third-party data.`, `Learn more`, `Got it`.
- Privacy page: metadata title, `← Return to home`, `Privacy Policy`, `Last updated: June 2026`, section headings (`Data Controller`, `Data We Collect`, `Legal Basis`, `Your Rights`, `Data Retention`, `No Third-Party Sharing`) and full body/list text.
- Cookies page: metadata title, `Cookie Policy`, `Technical Exemption — LSSI-CE Art. 22.2`, `Storage Items in Use`, `No Third-Party Tracking`, `Contact`, storage explanations, contact copy.

#### Landing/home

- Public top/header: brand wordmark remains `Lazy Lands`; nav labels from `components/landing/data/nav-links.ts`; `Sign in`; `Start`; screen-reader suffix `your chronicle`; mobile labels `Open menu`, `Close menu`, `Mobile navigation`, `Start your chronicle →`.
- Hero: `✦ Open beta`, `For DMs who actually run long campaigns`, `Your campaign,`, `without the amnesia`, hero paragraph, `Start your chronicle →`, `✦ See it on a real campaign`, `Open beta`, `The Scribe proposes, you decide`, `Free while in early access`.
- Landing data/sections: marquee items, pillar labels/body/bullets, how-it-works steps, briefing mock labels, node graph labels/relationship captions, CTA and footer nav/copyright.
- `ComingSoonButton` likely contains transient copy and should be included in spec/tasks even though not re-read in depth during this exploration.

#### Auth flows

- Shared auth shell: `volver al inicio` must be translated and normalized to English default (`Back to home`) in `en`.
- Login: validation `Invalid email format`, `Password is required`; headings/copy `Sign in`, `Enter your credentials to access your campaigns.`, labels `Email`, `Password`, submit states `Signing in...`/`Sign in`, `Forgot password?`, `Don't have an account?`, `Create an account`, catch-all error `Unable to sign in right now. Please try again.`.
- Register: `Create an account`, `Start your campaign shelf...`, `Check your email`, confirmation copy, `Confirm password`, `Creating account...`, `Sign up`, `Already have an account?`, register catch-all error.
- Forgot password: `Reset password`, email/reset explanation, uniform submitted message, `Back to sign in`, `Sending...`, `Send reset email`, `Remembered your password?`.
- Confirm/reset callbacks: `Invalid confirmation link...`, `Verifying your email…`, `Register again`, `Invalid or missing reset link.`, `Unable to verify your reset link...`, `Request a new reset link`, `Password updated`, `Your password has been updated successfully.`, `Set a new password`, `Choose a new password for your account.`, `New password`, `Updating...`, `Update password`.
- Password policy: `Password must include uppercase, lowercase, number, and special character`, `Passwords must match`, `Use at least 8 characters`, `Include a lowercase letter`, `Include an uppercase letter`, `Include a number`, `Include a special character`, `Password must be at least 8 characters`, `Please confirm your password`, `Password must include`, `{met} of {total} requirements met`.

#### Dashboard and campaign cards

- Dashboard header: `Campaigns`, `Your chronicles`, `Something went wrong`, pluralized `{count} campaign(s)`, `No campaigns yet`, `+ New campaign`, loading `The Scribe is writing` / `Fetching your campaigns`, error body `Something went wrong while loading your campaigns.`, `Retry`.
- Campaign list: `Your chronicle starts here`, first-campaign empty description, `+ Create your first campaign`, `Search campaigns…`, `{filtered} of {total}`, `No campaigns match that search`, `Try a different name or game system.`.
- Campaign card stats: `Sessions`, `NPCs`, `Factions`, `Memories`, `Arcs`, `Updated {date}`, `Open chronicle →`.
- Date formatting: currently `toLocaleDateString('en-US', ...)`, not locale-aware.

#### Campaign creation and review

- `composeRawText` payload labels sent to backend extraction: `Campaign name:`, `Game system:`, `Tone or style:`, `Starting context:`, `Additional details for the Scribe:`. These are user-authored context headings and may influence AI extraction; translate only if backend/fake LLM behavior and tests are updated deliberately.
- New campaign validation: `Give your campaign a name.`, `Name the game system you're running.`, total-length error with character counts.
- New campaign UI: breadcrumb `Campaigns / New campaign`; `Step 1 of 2 · Pour your world in`; `Start a new chronicle`; explanatory paragraph; loading `Reading your world` and caption; error fallback; labels/placeholders for campaign name, system, tone/style optional, starting context/premise, additional details; counters `{n} / {min} characters minimum · {n} / {max}`; help text; safe-text reminder; `Analyzing...` / `Analyze campaign →`.
- Review constants: field labels/placeholders `Name`, `Description`, `Current state`, `Motivation`, `Current stance`, `Goals`, `Title`.
- Review UI: breadcrumb; `Step 2 of 2 · Review before it's real`; `What the Scribe found`; proposal-control paragraph; Scribe notice with `{count} items`; labels `Campaign title`, `Campaign description`, `World state`; entity section titles `NPCs detected`, `Factions detected`, `Open arcs detected`; `Back`; `Creating...`; `Confirm & create campaign`; save fallback error.
- `EntitySection`: `+ Add {singular}`, empty text `Nothing here yet. Add a {singular} manually if the Scribe missed one.`, `Save changes`, `Cancel`, `Edit`, `Remove`, `Add`.
- `EditableProse`: `Save changes`, `Cancel`, `Edit`.

#### Campaign detail and entity management

- Detail loading/error: `The Scribe is writing`, `Opening the chronicle`, not-found/access error, generic loading error, `Retry`.
- Detail view: breadcrumb `Campaigns`; kicker `Campaign · {system/tone}`; `Updated {date}`; stat labels `NPCs`, `Factions`, `Arcs`; headings `/01 The state of the world`, `/02 Recent sessions`, `/03 Arcs needing attention`, `/04 Active memories`; placeholders `Coming in a later chapter`; link `All arcs →`; arc status codes displayed raw.
- World state editor: fallback `Could not save the world state. Please try again.`, `Saving…`, `Save changes`, `Cancel`, `No world state recorded yet.`, `Edit`.
- Entity screen shared: loading title `The Scribe is writing`, loading caption `Opening {title}`, campaign errors, breadcrumb `Campaigns`, add button labels from pages.
- NPC page/list/modal: `Campaign · NPCs`, `NPCs`, `+ New NPC`, `{count} characters tracked across the chronicle`, `No NPCs yet`, empty description, `+ Add your first NPC`, `Current state:`, `Motivation:`, `Edit`, `Delete`, modal titles `Edit NPC`/`New NPC`, `Could not save this NPC...`, fields `Name`, `Description`, `Current state`, `Motivation`, `Add NPC`.
- Faction page/list/modal: `Campaign · Factions`, `Factions`, `+ New faction`, `{count} powers reacting to the party`, `No factions yet`, empty description, `+ Add a faction`, `Stance:`, `Objective:`, modal titles `Edit faction`/`New faction`, `Could not save this faction...`, fields `Name`, `Description`, `Current stance`, `Objective`, `Add faction`.
- Arc page/list/modal: `Campaign · Open arcs`, `Open arcs`, `+ New arc`, `{count} threads still in play`, `No arcs here`, empty description, `+ Add an arc`, `{priority} priority`, modal titles `Edit arc`/`New arc`, `Could not save this arc...`, fields `Title`, `Description`, `Priority`, `Status`, priorities/status option labels `High`/`Medium`/`Low` and `Active`/`Dormant`/`Resolved`/`Discarded`, `Add arc`.
- Delete confirmation: `Delete {entityLabel}`, fallback `Could not delete this {entityLabel}. Please try again.`, `Cancel`, `Deleting…`, `Delete`, `Delete {itemName}? This cannot be undone.`.

#### Shared UI

- `OriginBadge`: `✦ Scribe`, `✎ Edited by you`.
- `Field`: optional marker `· optional`.
- `LoadingScribe`: default `The Scribe is writing`, `Gathering the campaign thread`.
- `Modal`: close accessible label `Close`.

#### Backend/API surfaced strings

Frontend currently displays `CampaignApiError.message` and Supabase `error.message` directly in several places. Those messages may come from backend/Supabase and are English. Full backend i18n should not be scoped yet, but frontend specs should decide whether to replace known API errors with translated generic messages, map error codes where available, or allow provider messages to remain untranslated as a known limitation.

### Home/Dashboard Switcher Insertion Points

- Home: `components/landing/public-top.tsx` is the top layout/header. The switcher belongs inside the `<nav aria-label="Main">` cluster before auth buttons on desktop, and inside the mobile overlay action stack or header controls on mobile. It must use mono uppercase styling, hard border/press physics, and keep the wordmark + nav hierarchy intact.
- Dashboard: there is no shared in-app `Shell` in production yet; `app/dashboard/page.tsx` renders its own page header. The switcher can be placed in the header action area next to `+ New campaign` for `/dashboard` specifically. If later phases broaden this to all authenticated campaign areas, the better long-term insertion point is a reusable app header/shell aligned with `handoff/app/ui.jsx` `Shell`.

### Approaches

1. **Path-prefixed routing with `localePrefix: 'as-needed'`** — keep English at existing URLs and put Spanish under `/es/...`.
   - Pros: Preserves current English URLs and redirects for default locale; explicit shareable Spanish URLs; aligns with `next-intl` App Router routing; SEO-friendly if public pages later become indexed in Spanish.
   - Cons: Requires moving pages under a `[locale]` segment or route group strategy; proxy/auth route logic must become locale-aware; tests and redirects need careful updates.
   - Effort: Medium/High.

2. **Cookie-only routing with `localePrefix: 'never'`** — keep all URLs unchanged and store selected locale in a cookie.
   - Pros: Minimal route churn; fewer auth redirect changes; all existing `/dashboard` expectations stay literal.
   - Cons: URLs are not language-specific; harder to share Spanish pages; App Router static behavior and `<html lang>` require careful request config; less explicit than the user's bilingual product expectation.
   - Effort: Medium.

3. **Full path prefix for all locales (`/en/...`, `/es/...`)** — every URL includes locale.
   - Pros: Most explicit and cleanest for locale-aware route matching.
   - Cons: Breaks current default English route expectations (`/`, `/dashboard`, auth callbacks) unless redirects are added; bigger testing/QA blast radius.
   - Effort: High.

### Recommendation

Use `next-intl` path routing with `localePrefix: 'as-needed'`.

This keeps current English behavior at unprefixed routes while enabling Spanish as `/es/...`. It best satisfies “English default/current behavior” without sacrificing explicit Spanish URLs. Later implementation should compose `createMiddleware(routing)` with the current Supabase/auth `proxy.ts` flow. The safest composition is: run i18n routing first to normalize/redirect locale paths, then run Supabase session refresh/auth decisions against the locale-stripped pathname, and when redirecting, generate locale-aware targets (`/dashboard` for English default, `/es/dashboard` for Spanish). Preserve the current Set-Cookie forwarding helpers.

The spec/design phase should explicitly decide whether `/dashboard` remains the canonical campaign-list route or whether i18n work also introduces `/campaigns`; exploration recommends not changing that route in this chore.

### Risks

- Moving the App Router tree under `[locale]` can break imports, metadata, auth callbacks, and tests if done as a blind file move.
- `proxy.ts` is security-sensitive: losing Supabase cookie propagation or checking protected routes against prefixed paths could break login protection or redirects.
- Provider/backend error messages are not inherently translatable; a message-code strategy may be needed later.
- Tests assert English accessible text heavily; later phases must update tests intentionally, not weaken them.
- `composeRawText` English headings may be part of extraction behavior/tests; translating them changes the prompt sent to the backend/LLM and should be separately verified.
- Locale-aware navigation must preserve query/search params for auth callback/reset pages and current paths for the language switcher.
- Legal pages are long-form and should be translated carefully; automated literal extraction alone is not enough for legal correctness.

### Ready for Proposal

Yes. Proposal/spec should cover a frontend-focused i18n chore with `next-intl`, `en` default and `es` support, locale-aware routing/proxy/auth redirects, exhaustive translation catalog extraction, a home/dashboard language switcher, and test updates. Backend i18n should remain out of scope except for documenting currently surfaced API/provider messages and mapping frontend-owned fallbacks.
