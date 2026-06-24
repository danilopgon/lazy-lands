# Spec: block-3-landing-page

**Change**: block-3-landing-page
**Capabilities**: `marketing-landing`, `legal-consent-pages`
**Spec type**: New full specs (no prior landing or legal specs exist)

---

## Capability: marketing-landing

### Purpose

Define the observable behavior of the public landing page. Converts curious Dungeon Masters into registered users by presenting product value, key sections, and compliant opt-in flows.

---

### Requirements

#### LAND-001: Announcement Bar renders and dismisses

The AnnouncementBar MUST render above the main navigation when `localStorage["ll-announcement-dismissed"]` is not set. It MUST NOT render when that key is set to any value. Dismissing MUST set `localStorage["ll-announcement-dismissed"]` and remove the bar from the DOM. The bar MUST contain a link to `/register`. The dismiss button MUST be accessible with a touch target ≥ 44 × 44 px. The component MUST be SSR-safe (no hydration mismatch; initial render defers to client mount check).

| Test ID | Pass/Fail condition |
|---------|---------------------|
| LAND-001a | Bar renders when key absent |
| LAND-001b | Bar does NOT render when key is set |
| LAND-001c | Dismissing sets localStorage key and removes bar |
| LAND-001d | Bar contains link to `/register` |

##### Scenario: First visit

- GIVEN `ll-announcement-dismissed` is not in localStorage
- WHEN the landing page mounts
- THEN the AnnouncementBar is visible in the DOM

##### Scenario: Returning visitor

- GIVEN `ll-announcement-dismissed` is set to any value
- WHEN the landing page mounts
- THEN the AnnouncementBar is NOT present in the DOM

##### Scenario: Dismiss interaction

- GIVEN the AnnouncementBar is visible
- WHEN the user activates the dismiss control
- THEN `ll-announcement-dismissed` is written to localStorage AND the bar is removed from the DOM

---

#### LAND-002: PublicTop navigation

The PublicTop nav MUST be wrapped in a `<nav>` element with `aria-label="Main"`. It MUST contain a wordmark linking to the page top. On desktop it MUST render navigation links: "Product" linking to `#product` and "How it works" linking to `#how`. It MUST contain a "Sign in" link to `/login` and a "Start" link to `/register`. All interactive elements MUST have a visible focus indicator.

| Test ID | Pass/Fail condition |
|---------|---------------------|
| LAND-002a | `<nav aria-label="Main">` is present |
| LAND-002b | "Sign in" links to `/login` |
| LAND-002c | "Start" links to `/register` |

---

#### LAND-003: Hero section copy and CTAs

The LandHero MUST render an `<h1>` containing "Your campaign" and "without the amnesia". It MUST render a primary CTA "Start your chronicle →" linking to `/register`. It MUST render a secondary CTA "See it on a real campaign" with `disabled` and `aria-disabled="true"` attributes and a tooltip conveying "Coming soon".

| Test ID | Pass/Fail condition |
|---------|---------------------|
| LAND-003a | H1 contains "Your campaign" |
| LAND-003b | H1 contains "without the amnesia" |
| LAND-003c | Primary CTA links to `/register` |
| LAND-003d | Secondary CTA is disabled with `aria-disabled="true"` |
| LAND-003e | Secondary CTA tooltip text is "Coming soon" |

##### Scenario: Primary CTA navigates

- GIVEN the hero is rendered
- WHEN the user activates "Start your chronicle →"
- THEN the browser navigates to `/register`

##### Scenario: Secondary CTA blocked with tooltip

- GIVEN the hero is rendered
- WHEN the user focuses or hovers the secondary CTA
- THEN a tooltip with text "Coming soon" is visible AND the element has `aria-disabled="true"`

---

#### LAND-004: Marquee section renders feature strings

The LandMarquee MUST render all of these strings: "Persistent campaign memory", "NPCs · Factions · Open arcs", "Session briefings with full context", "The Scribe proposes, you decide", "Export to PDF", "No lock-in". The marquee animation MUST be paused or removed when `prefers-reduced-motion: reduce` is active.

| Test ID | Pass/Fail condition |
|---------|---------------------|
| LAND-004a | All six feature strings are present in the DOM |
| LAND-004b | Animation respects `prefers-reduced-motion` |

---

#### LAND-005: Pillars section

The LandPillars section MUST have `id="product"` so the nav anchor `#product` resolves correctly. It MUST render three pillars with eyebrows "01 · Remember", "02 · Prepare", "03 · Continuity" and titles "Campaign memory", "Session briefings", "Nothing slips".

| Test ID | Pass/Fail condition |
|---------|---------------------|
| LAND-005a | Section has `id="product"` |
| LAND-005b | "01 · Remember" eyebrow is present |
| LAND-005c | "02 · Prepare" eyebrow is present |
| LAND-005d | "03 · Continuity" eyebrow is present |

---

#### LAND-006: Briefing section

The LandBriefing MUST render an `<h2>` containing "A briefing that reads like your own prep". It MUST render the four spec stats: "3 min", "7 sessions", "canon", "editable".

| Test ID | Pass/Fail condition |
|---------|---------------------|
| LAND-006a | H2 with briefing copy is present |
| LAND-006b | All four spec stat labels are rendered |

---

#### LAND-007: How it works section

The LandHowItWorks section MUST have `id="how"`. It MUST render an `<h2>` containing "Three steps. Not one more." and three step titles: "Create your campaign", "Log each session", "Prepare the next".

| Test ID | Pass/Fail condition |
|---------|---------------------|
| LAND-007a | Section has `id="how"` |
| LAND-007b | H2 "Three steps. Not one more." is present |
| LAND-007c | Step titles 01, 02, 03 are present |

---

#### LAND-008: Philosophy quote

The LandPhilosophy MUST render the full quote: "The Scribe is a draft, never the author. Nothing reaches your table until you've made it canon."

| Test ID | Pass/Fail condition |
|---------|---------------------|
| LAND-008a | Full quote text is present in the DOM |

---

#### LAND-009: Final CTA section

The LandCTA section MUST have `id="pricing"`. It MUST render an `<h2>` containing "Start your first chronicle." The primary button MUST link to `/register`. The secondary button MUST be `disabled` with `aria-disabled="true"` and a tooltip "Coming soon". The decorative SVG element MUST carry `aria-hidden="true"`.

| Test ID | Pass/Fail condition |
|---------|---------------------|
| LAND-009a | Section has `id="pricing"` |
| LAND-009b | H2 with "Start your first chronicle." is present |
| LAND-009c | Primary button links to `/register` |
| LAND-009d | Secondary button is disabled with tooltip "Coming soon" |

---

#### LAND-010: Footer links

The LandFooter MUST be a `<footer>` element containing links to `/privacy` and `/cookies`, and anchors to `#product`, `#how`, and `#pricing`.

| Test ID | Pass/Fail condition |
|---------|---------------------|
| LAND-010a | `<footer>` element present |
| LAND-010b | Link to `/privacy` present |
| LAND-010c | Link to `/cookies` present |

---

#### LAND-011: CookieBanner show, hide, and dismiss

The CookieBanner MUST render when `localStorage["ll-cookie-consent"]` is not set. It MUST NOT render when that key is set to any value. Dismissing MUST store `"acknowledged"` in `localStorage["ll-cookie-consent"]`. The banner MUST carry `role="region"` and `aria-label="Cookie notice"`. It MUST be SSR-safe (no hydration mismatch). Its fixed positioning MUST NOT cause CLS.

| Test ID | Pass/Fail condition |
|---------|---------------------|
| LAND-011a | Banner renders when key absent |
| LAND-011b | Banner does NOT render when key is set |
| LAND-011c | Dismiss writes `"acknowledged"` to `ll-cookie-consent` |
| LAND-011d | `role="region"` and `aria-label="Cookie notice"` are present |

##### Scenario: First visit

- GIVEN `ll-cookie-consent` is not in localStorage
- WHEN the landing page mounts
- THEN the CookieBanner is visible with role="region" and aria-label="Cookie notice"

##### Scenario: Returning visitor

- GIVEN `ll-cookie-consent` is set to any value
- WHEN the landing page mounts
- THEN the CookieBanner is NOT present in the DOM

##### Scenario: Dismiss sets consent

- GIVEN the CookieBanner is visible
- WHEN the user activates "Got it"
- THEN `localStorage["ll-cookie-consent"]` equals `"acknowledged"` AND the banner is removed from the DOM

---

#### LAND-012: Landing page metadata

The root landing `page.tsx` MUST export metadata with `title` "Lazy Lands — Campaign Companion for Dungeon Masters" and a `description` that includes "NPC", "faction", and "consequence".

| Test ID | Pass/Fail condition |
|---------|---------------------|
| LAND-012a | Page title matches expected value |
| LAND-012b | Meta description contains key product terms |

##### Scenario: Smoke — page loads

- GIVEN no prior session
- WHEN a browser navigates to the landing URL
- THEN the page loads without JavaScript errors AND the page title matches "Lazy Lands"

---

#### LAND-013: Accessibility — WCAG 2.2 AA

All interactive elements MUST have accessible names. Color MUST NOT be the sole differentiator for any meaning. All disabled interactive elements MUST carry `aria-disabled="true"`. The `HeroCollage` SVG and all decorative SVGs MUST carry `aria-hidden="true"`.

| Test ID | Pass/Fail condition |
|---------|---------------------|
| LAND-013a | All CTAs have accessible names |
| LAND-013b | Disabled CTAs carry `aria-disabled="true"` |
| LAND-013c | Decorative SVGs carry `aria-hidden="true"` |

---

#### LAND-014: Responsiveness

All sections MUST be readable and functional as a single-column layout at viewport widths ≤ 900 px. The hero collage MUST remain decorative and MUST NOT obscure primary copy on small viewports. No horizontal overflow MUST be introduced at ≤ 900 px.

| Test ID | Pass/Fail condition |
|---------|---------------------|
| LAND-014a | No critical copy hidden below 900 px |
| LAND-014b | No horizontal scrollbar at 900 px or below |

---

## Capability: legal-consent-pages

### Purpose

Define the observable behavior of the `/cookies` and `/privacy` pages and the `consent.ts` localStorage helper. These pages satisfy LSSI-CE and GDPR disclosure obligations.

---

### Requirements

#### LEGAL-001: /cookies page

The `/cookies` route MUST render an `<h1>` with "Cookie Policy". The page MUST export metadata with `title` "Cookies — Lazy Lands" and `robots: { index: false, follow: false }`. It MUST document the actual storage keys in use: the default project-scoped Supabase auth key pattern `sb-<project-ref>-auth-token`, `ll-cookie-consent`, and `ll-announcement-dismissed`. It MUST NOT document split `sb-access-token` / `sb-refresh-token` keys unless the app explicitly configures Supabase to use them. It MUST contain a link back to the landing page. It MUST contain a mention of LSSI-CE technical exemption (art. 22.2 or equivalent).

| Test ID | Pass/Fail condition |
|---------|---------------------|
| LEGAL-001a | H1 "Cookie Policy" is present |
| LEGAL-001b | Page is `noindex` |
| LEGAL-001c | The actual Supabase auth key pattern and local storage keys are documented |
| LEGAL-001d | Back-link to landing is present |
| LEGAL-001e | LSSI-CE technical exemption is mentioned |

---

#### LEGAL-002: /privacy page

The `/privacy` route MUST render an `<h1>` with "Privacy Policy". The page MUST export metadata with `robots: { index: false, follow: false }`. It MUST include a data-controller section with the placeholder `[Company]` and a contact placeholder `[contact@example.com]`. It MUST document what data is collected (email address, campaign content, auth tokens), the legal basis (GDPR art. 6.1.b), and user rights (access, rectification, erasure, portability, objection). It MUST contain a link back to the landing page.

| Test ID | Pass/Fail condition |
|---------|---------------------|
| LEGAL-002a | H1 "Privacy Policy" is present |
| LEGAL-002b | Page is `noindex` |
| LEGAL-002c | Data-controller placeholder `[Company]` is present |
| LEGAL-002d | Contact placeholder `[contact@example.com]` is present |
| LEGAL-002e | GDPR legal basis (art. 6.1.b) is mentioned |
| LEGAL-002f | User rights are enumerated |
| LEGAL-002g | Back-link to landing is present |

---

#### LEGAL-003: consent.ts localStorage helper

The `consent.ts` module MUST export a function (or functions) that read and write the `ll-cookie-consent` and `ll-announcement-dismissed` keys in `localStorage`. It MUST be safe to call in an SSR context (no `window` access at module evaluation time; guard must defer to call time or be client-only). It MUST NOT throw when localStorage is unavailable.

| Test ID | Pass/Fail condition |
|---------|---------------------|
| LEGAL-003a | Read function returns `null` when key is absent |
| LEGAL-003b | Write function sets the expected value |
| LEGAL-003c | Module does not throw in SSR (no-`window`) context |

##### Scenario: Key absent

- GIVEN localStorage does not contain `ll-cookie-consent`
- WHEN the read function is called
- THEN the return value is `null` or equivalent falsy

##### Scenario: Key written

- GIVEN localStorage does not contain `ll-cookie-consent`
- WHEN the write function is called with `"acknowledged"`
- THEN `localStorage.getItem("ll-cookie-consent")` equals `"acknowledged"`

##### Scenario: SSR safety

- GIVEN `window` is undefined (server environment)
- WHEN the consent module is imported and functions are called
- THEN no `ReferenceError` is thrown
