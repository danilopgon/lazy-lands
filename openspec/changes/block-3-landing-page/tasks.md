# Tasks: Block 3 — Production Landing Page

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~1 050–1 200 (landing rebuild ~400, tests ~200, legal ~150, overlays ~160, consent+CSS+wiring ~90) |
| Files changed | 14 (9 source + 5 test) |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 → foundations + legal · PR 2 → overlays (CookieBanner, AnnouncementBar) · PR 3 → landing rebuild + wiring |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |
| Notes | landing-page.tsx rebuild replaces the full existing file (additions + deletions both large); tests alone total ~200 lines; 3 PR slices keep individual diffs ≤ 400 lines each and keep the existing test suite green through PR1/PR2 |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | consent.ts + ComingSoonButton + globals.css + legal pages | PR 1 | No existing tests break; fully independent |
| 2 | CookieBanner + AnnouncementBar overlays | PR 2 | Depends on PR 1 (consent.ts) |
| 3 | Landing rebuild + page.tsx wiring + smoke rewrite | PR 3 | Depends on PR 2; completes all AC |

---

## Phase 1: Foundations (PR 1 slice)

- [x] 1.1 Write failing tests for `consent.ts` — covers LEGAL-003a/b/c: `getConsent()` returns `null` when absent, `setConsent()` writes `"acknowledged"`, module does not throw when `window` is undefined. File: `apps/web/tests/consent.test.ts` (new).
- [x] 1.2 Create `apps/web/lib/consent.ts` — export `CONSENT_KEY`, `ANNOUNCEMENT_KEY`, `getConsent()`, `setConsent()`, `getAnnouncementDismissed()`, `setAnnouncementDismissed()`. Guard all reads/writes with `typeof window === 'undefined'` check; never throw in SSR context. (LEGAL-003)
- [x] 1.3 Write failing tests for `ComingSoonButton` — covers LAND-003d/LAND-009d/LAND-013b: element has `aria-disabled="true"` (assert `toHaveAttribute`, NOT `toBeDisabled()`), `tabIndex={0}`, tooltip text "Coming soon" visible on focus. File: `apps/web/tests/cookie-banner.test.tsx` (new file, first chunk).
- [x] 1.4 Create `apps/web/components/coming-soon-button.tsx` — `"use client"`. Wrapper `<span className="group relative inline-flex">` + `<button aria-disabled="true" aria-describedby={id} tabIndex={0} onClick={e => e.preventDefault()}>` + CSS-only tooltip `<span role="tooltip">Coming soon</span>` visible on `group-hover`/`group-focus-within`. Do NOT use native `disabled` attribute — `Button` has `disabled:pointer-events-none` which kills hover and tooltip. Do NOT add `@radix-ui/react-tooltip` (not in package.json). (LAND-003d, LAND-009d, LAND-013b)
- [x] 1.5 Add `@keyframes ll-marquee` to `apps/web/app/globals.css` — single block: `from { transform: translateX(0); } to { transform: translateX(-50%); }`. Do NOT add a second `prefers-reduced-motion` rule; the existing global block already covers it. This keyframe is not unit-testable in jsdom — mark as TDD exception, verified by visual E2E. (LAND-004b)
- [x] 1.6 Write failing metadata import tests for `/cookies` — covers LEGAL-001a/b/c/d/e: import `metadata` from `app/cookies/page.tsx`, assert `robots.index === false`; render page, assert `<h1>Cookie Policy`, all four storage keys present, back-link to `/`, LSSI-CE mention. File: `apps/web/tests/legal.test.tsx` (new).
- [x] 1.7 Create `apps/web/app/cookies/page.tsx` — RSC. `export const metadata` with `title: "Cookies — Lazy Lands"` and `robots: { index: false, follow: false }`. `<h1>Cookie Policy</h1>`. Document `sb-access-token`, `sb-refresh-token`, `ll-cookie-consent`, `ll-announcement-dismissed`. LSSI-CE art. 22.2 technical-cookie exemption. Back-link `<Link href="/">` to landing. (LEGAL-001)
- [x] 1.8 Write failing metadata import tests for `/privacy` — covers LEGAL-002a/b/c/d/e/f/g: import `metadata`, assert `robots.index === false`; render page, assert `<h1>Privacy Policy`, `[Company]`, `[contact@example.com]`, GDPR art. 6.1.b, user rights enumerated, back-link. File: `apps/web/tests/legal.test.tsx` (append chunk).
- [x] 1.9 Create `apps/web/app/privacy/page.tsx` — RSC. `export const metadata` with `robots: { index: false, follow: false }`. `<h1>Privacy Policy</h1>`. Data-controller section with `[Company]` and `[contact@example.com]` placeholders. Data collected: email, campaign content, auth tokens. Legal basis GDPR art. 6.1.b. User rights: access, rectification, erasure, portability, objection. Back-link `<Link href="/">`. (LEGAL-002)

---

## Phase 2: Overlays (PR 2 slice — depends on PR 1)

- [x] 2.1 Write failing tests for `CookieBanner` — covers LAND-011a/b/c/d: banner renders when `ll-cookie-consent` absent; does NOT render when key set; "Got it" click writes `"acknowledged"` and hides banner; `role="region"` and `aria-label="Cookie notice"` present. Use `vi.stubGlobal('localStorage', localStorageMock)` with Map-backed mock. File: `apps/web/tests/cookie-banner.test.tsx` (append chunk).
- [x] 2.2 Create `apps/web/components/cookie-banner.tsx` — `"use client"`. `useState(false)` (hidden SSR default) + `useEffect` reads `getConsent()` from `consent.ts`, flips to shown when `null`. Read localStorage inside `useEffect`, NEVER in `useState` initializer (prevents hydration mismatch). `role="region"` `aria-label="Cookie notice"`. "Got it" → `setConsent()` + hide. `<Link href="/cookies">Learn more</Link>`. `position: fixed` bottom-anchored `z-50`. (LAND-011)
- [x] 2.3 Write failing tests for `AnnouncementBar` — covers LAND-001a/b/c/d: bar renders when `ll-announcement-dismissed` absent; does NOT render when key set; dismiss (×) sets key and removes bar; bar contains link to `/register`. File: `apps/web/tests/cookie-banner.test.tsx` (append chunk).
- [x] 2.4 Create `apps/web/components/announcement-bar.tsx` — `"use client"`. Same SSR pattern as CookieBanner (`useState(false)` + `useEffect` reads `getAnnouncementDismissed()`). Copy: "✦  Under active development — features ship weekly. Sign up and you'll be the first to know." + `<Link href="/register">`. Dismiss (×) button → `setAnnouncementDismissed()` + hide. Touch target ≥ 44×44 px. Not fixed — rendered as first child in flow (space reservation acceptable). (LAND-001)

---

## Phase 3: Landing Rebuild (PR 3 slice — depends on PR 2)

- [x] 3.1 Rewrite `apps/web/tests/landing.test.tsx` — RED phase: update all assertions to new copy before touching the implementation. Assert: H1 "Your campaign" + "without the amnesia"; primary CTA links to `/register`; secondary CTA `aria-disabled="true"` + tooltip "Coming soon"; all six marquee strings ("Persistent campaign memory", "NPCs · Factions · Open arcs", "Session briefings with full context", "The Scribe proposes, you decide", "Export to PDF", "No lock-in"); section `id="product"` with eyebrows "01 · Remember"/"02 · Prepare"/"03 · Continuity"; H2 "A briefing that reads like your own prep" + stats "3 min"/"7 sessions"/"canon"/"editable"; H2 "Three steps. Not one more." + `id="how"`; philosophy quote in full; `id="pricing"` H2 "Start your first chronicle."; footer `<footer>` with `/privacy` and `/cookies` links; `<nav aria-label="Main">`. Do not assert Tailwind classes. Old copy assertions removed. Covers LAND-002/003/004/005/006/007/008/009/010/013.
- [x] 3.2 Rebuild `apps/web/components/landing-page.tsx` — RSC, named export `LandingPage`. Nine sections co-located: `PublicTop`, `LandHero`, `LandMarquee`, `LandPillars`, `LandBriefing`, `LandHowItWorks`, `LandPhilosophy`, `LandCTA`, `LandFooter`. Subcomponents `HeroCollage`, `NodeGraph`, `BriefingMock` co-located (not reused). Hero H1: "Your campaign, without the amnesia." (italic+underlined span in `var(--accent)` for "without the amnesia"). Primary CTA `<Link href="/register">Start your chronicle →</Link>`. Secondary CTA: `<ComingSoonButton>See it on a real campaign</ComingSoonButton>`. Marquee: duplicate `items` array (`[...items, ...items]`), CSS animation `ll-marquee`. Pillars: `id="product"`, eyebrows "01 · Remember" / "02 · Prepare" / "03 · Continuity". HowItWorks: `id="how"`, H2 "Three steps. Not one more." LandCTA: `id="pricing"`, secondary `<ComingSoonButton>Tour a demo campaign</ComingSoonButton>`. Footer: `<footer>` with links to `/privacy`, `/cookies`, anchors `#product`, `#how`, `#pricing`. All decorative SVGs `aria-hidden="true"`. NodeGraph: `preserveAspectRatio="none"`. (LAND-002 through LAND-010, LAND-013, LAND-014)

---

## Phase 4: Wiring (PR 3 slice continued)

- [x] 4.1 Rewrite `apps/web/tests/e2e/smoke.spec.ts` — RED phase before page.tsx changes. Update assertions: page title contains "Lazy Lands"; hero text "Your campaign" visible; "Start your chronicle" CTA visible; "Privacy" and "Cookies" links visible. Remove old copy assertions. (LAND-012a, LAND-010)
- [x] 4.2 Write failing metadata import test for `app/page.tsx` — RED phase: import `metadata` from `app/page.tsx`, assert `title === "Lazy Lands — Campaign Companion for Dungeon Masters"` and `description` contains "NPC", "faction", "consequence". File: `apps/web/tests/landing.test.tsx` (append chunk). (LAND-012a, LAND-012b)
- [x] 4.3 Update `apps/web/app/page.tsx` — add `export const metadata: Metadata` with `title: "Lazy Lands — Campaign Companion for Dungeon Masters"` and description containing "NPC", "faction", "consequence". Mount `<AnnouncementBar />` as first child above `<LandingPage />`. Mount `<CookieBanner />` after `<LandingPage />`. Import both from their respective component files. Do NOT move these to `app/layout.tsx` (marketing overlays must not appear on `/cookies` or `/privacy`). (LAND-012a, LAND-012b, LAND-001, LAND-011)

---

## Phase 5: Verification Pass

- [x] 5.1 Run `pnpm test` — all Vitest unit tests (consent, landing, cookie-banner, legal) must be green.
- [x] 5.2 Run `pnpm typecheck` — TypeScript must pass `tsc --noEmit` with zero errors across all new and modified files.
- [x] 5.3 Run `pnpm lint` and `pnpm format:check` — ESLint and Prettier must pass clean.
- [ ] 5.4 Run Playwright smoke suite — `smoke.spec.ts` must pass on local dev server with no JS errors in console.
- [ ] 5.5 Manual a11y check — keyboard navigate landing (Tab, Enter): focus rings visible on all interactive elements; `ComingSoonButton` tooltip appears on focus; AnnouncementBar dismiss reachable by keyboard. (LAND-013)
- [ ] 5.6 Manual responsive check — resize to ≤ 900 px: single-column layout, no horizontal overflow, hero collage decorative and not obscuring copy. (LAND-014)
