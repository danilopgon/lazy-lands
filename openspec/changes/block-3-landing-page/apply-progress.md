# Apply Progress: block-3-landing-page

**Change**: block-3-landing-page
**Mode**: Strict TDD (RED → GREEN → REFACTOR)
**Delivery**: Single PR — size:exception approved by product owner
**Status**: All 19 implementation tasks complete (5.4–5.6 are for verify phase)

## Deviation: vitest config widened

`include: ['tests/**/*.test.tsx']` → `['tests/**/*.test.{ts,tsx}']`
Required so `consent.test.ts` (a `.ts` not `.tsx` file) is collected by the test runner.
File: `apps/web/vitest.config.ts`

## Deviation: startTransition in overlays

ESLint rule `react-hooks/set-state-in-effect` flags calling `setState` synchronously inside `useEffect`. Fixed with `startTransition()` wrapper in both `cookie-banner.tsx` and `announcement-bar.tsx`. This is idiomatic React 18 — no behavioral change.

## Deviation: custom `llg:` breakpoint for LAND-014

Tailwind's `md:` prefix fires at 768px; LAND-014 requires single-column at ≤900px. Fixed by:
1. Adding `--breakpoint-llg: 901px` to `@theme inline` block in `apps/web/app/globals.css`
2. Swapping all layout-defining `md:` → `llg:` in `apps/web/components/landing-page.tsx`:
   - `LandHero`: grid-cols, items-center, py-24
   - `HeroCollage`: hidden/block toggle
   - Nav desktop links: hidden/flex toggle
   - `LandPillars`: grid-cols-3
   - `LandBriefing` stats: grid-cols-4
   - `LandHowItWorks`: grid-cols-3
   - `LandFooter`: flex-row, items-center, justify-between
3. Typographic `md:text-*` on headings left as-is (font size, not layout).
Gates after fix: 64/64 unit tests pass, tsc --noEmit zero errors, ESLint clean, Prettier clean.

## TDD Cycle Evidence

| Task | RED | GREEN | REFACTOR | Notes |
|------|-----|-------|----------|-------|
| 1.1 `consent.test.ts` | ✓ module-not-found | — | — | RED confirmed before 1.2 |
| 1.2 `lib/consent.ts` | — | ✓ 7/7 pass | — | Added afterEach vi.resetModules() for SSR test isolation |
| 1.3 `ComingSoonButton` tests | ✓ module-not-found | — | — | RED confirmed before 1.4 |
| 1.4 `coming-soon-button.tsx` | — | ✓ 4/4 pass | — | aria-disabled + CSS tooltip, no native disabled |
| 1.5 `@keyframes ll-marquee` | N/A | N/A | — | TDD exception: not unit-testable in jsdom; verified by E2E |
| 1.6 `/cookies` tests | ✓ module-not-found | — | — | RED confirmed before 1.7 |
| 1.7 `app/cookies/page.tsx` | — | ✓ 5/5 pass | — | Used getAllByText for multi-match elements |
| 1.8 `/privacy` tests | ✓ module-not-found | — | — | RED confirmed before 1.9 |
| 1.9 `app/privacy/page.tsx` | — | ✓ 7/7 pass | — | getAllByText fixes applied |
| 2.1 `CookieBanner` tests | ✓ module-not-found | — | — | RED confirmed before 2.2 |
| 2.2 `cookie-banner.tsx` | — | ✓ 4/4 pass | — | startTransition fix applied |
| 2.3 `AnnouncementBar` tests | ✓ module-not-found | — | — | RED confirmed before 2.4 |
| 2.4 `announcement-bar.tsx` | — | ✓ 4/4 pass | — | startTransition fix applied |
| 3.1 Rewrite `landing.test.tsx` | ✓ 23/25 fail | — | — | RED confirmed; 2 old tests happened to still pass |
| 3.2 Rebuild `landing-page.tsx` | — | ✓ 25/25 pass | — | Full RSC rebuild with 9 sections |
| 4.1 Rewrite `smoke.spec.ts` | ✓ (updated) | — | — | E2E only runs in verify phase |
| 4.2 metadata test `page.tsx` | ✓ 2 fail | — | — | RED confirmed before 4.3 |
| 4.3 Update `app/page.tsx` | — | ✓ 27/27 pass | — | Added metadata + AnnouncementBar/CookieBanner |
| 5.1 `pnpm test` | — | ✓ 64/64 pass | — | All 7 test files green |
| 5.2 `pnpm typecheck` | — | ✓ zero errors | — | tsc --noEmit clean |
| 5.3 `pnpm lint + format:check` | ✓ lint failed (setState in effect) | ✓ clean after startTransition fix | — | ESLint + Prettier both clean |
| LAND-014 fix | — | ✓ 64/64 still pass | — | `llg:` breakpoint at 901px, no test regression |

## Completed Tasks (19/22)

- [x] 1.1 consent.test.ts (new)
- [x] 1.2 lib/consent.ts (new)
- [x] 1.3 ComingSoonButton tests (in cookie-banner.test.tsx, new)
- [x] 1.4 coming-soon-button.tsx (new)
- [x] 1.5 globals.css @keyframes ll-marquee (modified)
- [x] 1.6 /cookies tests (legal.test.tsx, new)
- [x] 1.7 app/cookies/page.tsx (new)
- [x] 1.8 /privacy tests (legal.test.tsx, appended)
- [x] 1.9 app/privacy/page.tsx (new)
- [x] 2.1 CookieBanner tests (cookie-banner.test.tsx, appended)
- [x] 2.2 cookie-banner.tsx (new)
- [x] 2.3 AnnouncementBar tests (cookie-banner.test.tsx, appended)
- [x] 2.4 announcement-bar.tsx (new)
- [x] 3.1 Rewrite landing.test.tsx (modified)
- [x] 3.2 Rebuild landing-page.tsx (modified)
- [x] 4.1 Rewrite smoke.spec.ts (modified)
- [x] 4.2 metadata test for app/page.tsx (landing.test.tsx, appended)
- [x] 4.3 Update app/page.tsx (modified)
- [x] 5.1 pnpm test — 64/64 pass
- [x] 5.2 pnpm typecheck — zero errors
- [x] 5.3 pnpm lint + format:check — clean

## Remaining Tasks (3/22 — verify phase only)

- [ ] 5.4 Run Playwright smoke suite (verify phase)
- [ ] 5.5 Manual a11y check (verify phase)
- [ ] 5.6 Manual responsive check (verify phase)

## Files Changed

| File | Action | What |
|------|--------|------|
| `apps/web/vitest.config.ts` | Modified | Widened include glob to .{ts,tsx} |
| `apps/web/lib/consent.ts` | Created | localStorage helper with SSR guard |
| `apps/web/components/coming-soon-button.tsx` | Created | aria-disabled CTA with CSS tooltip |
| `apps/web/components/cookie-banner.tsx` | Created | Cookie consent banner (client, fixed) |
| `apps/web/components/announcement-bar.tsx` | Created | Announcement bar (client, flow) |
| `apps/web/components/landing-page.tsx` | Modified | Full rebuild — 9 sections RSC; llg: breakpoint for LAND-014 |
| `apps/web/app/page.tsx` | Modified | Added metadata + overlay mounts |
| `apps/web/app/cookies/page.tsx` | Created | /cookies legal page RSC |
| `apps/web/app/privacy/page.tsx` | Created | /privacy legal page RSC |
| `apps/web/app/globals.css` | Modified | @keyframes ll-marquee + --breakpoint-llg: 901px |
| `apps/web/tests/consent.test.ts` | Created | LEGAL-003 tests |
| `apps/web/tests/cookie-banner.test.tsx` | Created | LAND-001, LAND-003d, LAND-011 tests |
| `apps/web/tests/legal.test.tsx` | Created | LEGAL-001, LEGAL-002 tests |
| `apps/web/tests/landing.test.tsx` | Modified | Rewritten for new copy — LAND-002–010, 013 |
| `apps/web/tests/e2e/smoke.spec.ts` | Modified | Updated E2E assertions |
