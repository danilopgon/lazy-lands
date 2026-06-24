# Design: Block 3 — Production Landing Page

## Technical Approach

Frontend-only refresh. Rebuild the prototype's editorial sections as real React components against the Print Chronicle tokens already present in `globals.css` (no prototype HTML/CSS copied). The organizing principle is the **RSC/client boundary**: every landing section stays a React Server Component; only three pieces require client JS — `CookieBanner`, `AnnouncementBar`, and the disabled-CTA-with-tooltip — and each is isolated in its own file so `"use client"` never poisons the section tree. Legal pages are static RSC with `noindex` metadata. Strict TDD: failing tests first.

> **Scope flag (must reconcile):** `AnnouncementBar` is required by this design task (decisions #2/#4) but is **absent from `proposal.md`** scope and the Affected Areas table, and the prototype renders an inline hero pill ("✦ Open beta"), not a bar. Design includes it as instructed, pending proposal reconciliation. The proposal also internally says "9 sections" (Scope) vs "10 sections" (Affected Areas) — treat as 9 sections + standalone overlays.

## Architecture Decisions

### #1 Component tree & file structure
**Choice**: Landing composition lives under `components/landing/landing-page.tsx` (RSC). Landing-specific sections/components stay under `components/landing/`; transversal shell pieces live under `components/layout/`; static landing data lives under `components/landing/data/`; feature-local object shapes use `type` aliases under `components/landing/types/`.

| File | Action | Boundary |
|------|--------|----------|
| `components/landing/landing-page.tsx` | Modify (rebuild) | RSC — landing composition |
| `components/layout/announcement-bar.tsx` | New | client |
| `components/layout/cookie-banner.tsx` | New | client |
| `components/landing/coming-soon-button.tsx` | New | client — landing disabled CTA (used in Hero + final CTA) |
| `components/landing/data/` | New | feature-local static landing data |
| `components/landing/types/` | New | feature-local type aliases |
| `lib/consent.ts` | New | shared localStorage helper |
| `app/cookies/page.tsx` | New | RSC + `metadata` |
| `app/privacy/page.tsx` | New | RSC + `metadata` |
| `app/page.tsx` | Modify | add landing `metadata`; mount `AnnouncementBar` + `CookieBanner` |
| `app/globals.css` | Modify | add `@keyframes ll-marquee` only |
| `tests/landing.test.tsx` | Modify | rewrite |
| `tests/cookie-banner.test.tsx` | New | localStorage + render |
| `tests/e2e/smoke.spec.ts` | Modify | new copy |

**Rationale**: One landing-local `ComingSoonButton` keeps the a11y pattern in one place (it appears twice) without over-generalizing it into a primitive. Overlays mount in `page.tsx` not root `layout.tsx`, so `/cookies` and `/privacy` (and future app routes) do not inherit the marketing banner.

### #2 consent.ts
**Choice**: Single file, both concerns, no custom event (no reactive subscribers — each overlay hides itself). `typeof window === 'undefined'` guard returns the SSR-safe default.

```ts
export const CONSENT_KEY = 'll-cookie-consent'
export const ANNOUNCEMENT_KEY = 'll-announcement-dismissed'
export function getConsent(): 'acknowledged' | null
export function setConsent(): void                 // sets 'acknowledged'
export function getAnnouncementDismissed(): boolean
export function setAnnouncementDismissed(): void
```
**Alternatives**: two files (rejected — same storage concern, trivially small); custom event (rejected — el-rincon needed it for cross-component reactivity we don't have).

### #3 CookieBanner mount
**Choice**: `"use client"` + `useState(false)` (hidden initial) + `useEffect` that reads `getConsent()` and shows the banner only when `null`. `position: fixed`, bottom-anchored, `z-50`. Single "Got it" → `setConsent()` + hide. "Learn more" → `Link` to `/cookies`.
**Rationale over `dynamic(ssr:false)`**: no extra chunk, no flash, deterministic SSR markup. **Gotcha**: read localStorage *inside the effect*, never in the `useState` initializer, or hydration mismatch returns. Fixed positioning ⇒ zero CLS.

### #4 AnnouncementBar mount
**Choice**: Identical SSR pattern as CookieBanner (`useState(false)` + `useEffect` reads `getAnnouncementDismissed()`). Rendered as the **first child of `page.tsx`**, above `<LandingPage />`. Dismissible (×) → `setAnnouncementDismissed()` + hide. Not fixed (sits in flow at top); reserving its space is acceptable since it is the first paint element.
**Rationale**: same hydration-safety reasoning; consistency lowers apply/test cost.

### #5 NodeGraph SVG
**Choice**: Inline, fully-typed React component, **data-driven** (`nodes`/`edges` as typed const arrays, mapped to `<line>`/`<circle>`/`<text>`), `aria-hidden="true"` (decorative). `viewBox="0 0 100 100"` with `preserveAspectRatio="none"` (matches prototype intent — fills the collage box).
**Alternatives**: static `.svg` file (rejected — loses token-driven `var(--accent)` fills and typing); hardcoded paths (rejected — unmaintainable). Confirmed `aria-hidden` — the relationship data is purely illustrative; no information is lost to AT users (hero copy carries the message).

### #6 Disabled CTA + tooltip
**Choice**: `aria-disabled="true"` + `tabIndex={0}` + `onClick` `preventDefault` (no navigation), wired to a **CSS-only tooltip** via `aria-describedby` and Tailwind `group-hover`/`group-focus-within`. Text: "Coming soon".

```tsx
// coming-soon-button.tsx — Print Chronicle styled, radius-0, hard shadow
<span className="group relative inline-flex">
  <button aria-disabled="true" aria-describedby={id} tabIndex={0}
          onClick={(e) => e.preventDefault()} /* styled like Button accent/secondary */>
    {children}
  </button>
  <span role="tooltip" id={id}
        className="pointer-events-none absolute ... opacity-0 group-hover:opacity-100 group-focus-within:opacity-100">
    Coming soon
  </span>
</span>
```
**Alternatives**: native `disabled` (REJECTED — the existing `Button` has `disabled:pointer-events-none`, killing hover so the tooltip never fires, and it drops the element from tab order; focus tooltip also dead). `title` attr (rejected — invisible on touch, poor AT). **shadcn `<Tooltip>` (rejected — `@radix-ui/react-tooltip` is NOT in `package.json`; "no new packages" constraint forbids adding it).**
**Rationale**: most accessible option that needs no new dependency. Visual styling mirrors `buttonVariants` but is a separate component (cannot reuse `Button` because its disabled styles block hover).

### #7 Marquee animation
**Choice**: Pure CSS `@keyframes ll-marquee` in `globals.css`; items duplicated in JSX (`[...items, ...items]`) for a seamless loop; `will-change: transform` on the scrolling track; component stays RSC (no JS). Reduced-motion handled globally (see #9).
**Alternatives**: JS-driven scroll (rejected — needless client JS).

### #8 Legal pages
**Choice**: Pure RSC, no `"use client"`. Static `export const metadata = { title, robots: { index: false, follow: false } }`. Inline page structure with a small shared `LegalShell` named export (header rule + mono eyebrow + serif prose container) co-located or in `components/legal-shell.tsx` to avoid duplicating chrome across both pages. `/privacy` uses `[Company]` placeholder for data controller; `/cookies` is informational-only (LSSI-CE art. 22.2 technical-cookie exemption).
**Alternatives**: `generateMetadata` (rejected — nothing dynamic).

### #9 globals.css additions
**Choice**: Add **only** the keyframes:
```css
@keyframes ll-marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
```
**Do NOT** add a second reduced-motion block — `globals.css` already has a global `@media (prefers-reduced-motion: reduce)` rule forcing `animation-duration: 0.01ms` + `iteration-count: 1`, which satisfies the "marquee pauses/removes" AC. No new tokens needed: components consume tokens via Tailwind arbitrary values (`text-[var(--ink-2)]`), and every token used already exists on `:root`.

### #10 Testing architecture
| Layer | What | How |
|-------|------|-----|
| RTL (`landing.test.tsx`) | new hero copy ("Your campaign, without the amnesia."), CTA `/register`, footer `Privacy`/`Cookies` links present, section headings | `render` + `getByRole`/`getByText`; assert behavior & accessible names, never Tailwind classes |
| RTL (`cookie-banner.test.tsx`) | banner hidden when key present; shown when absent; "Got it" sets `acknowledged` + hides; `ComingSoonButton` `aria-disabled` + tooltip text | `vi.stubGlobal('localStorage', localStorageMock)`; `userEvent` clicks; `findBy*` for post-effect render |
| E2E (`smoke.spec.ts`) | page loads, title, hero text visible, `Register` CTA visible, `Privacy`/`Cookies` links present | Playwright `getByRole`/`getByText`, `toBeVisible` |

localStorage mock pattern (Vitest, jsdom):
```ts
const store = new Map<string, string>()
const localStorageMock = { getItem:(k)=>store.get(k)??null, setItem:(k,v)=>{store.set(k,String(v))}, removeItem:(k)=>{store.delete(k)}, clear:()=>store.clear() }
beforeEach(() => { store.clear(); vi.stubGlobal('localStorage', localStorageMock) })
```

## Data Flow (consent state)

```
                      localStorage (browser only)
                     ┌─────────────┴──────────────┐
   ll-cookie-consent │                            │ ll-announcement-dismissed
                     │                            │
   consent.ts  getConsent()/setConsent()   getAnnouncementDismissed()/setAnnouncementDismissed()
                     │                            │
        CookieBanner ─ useEffect reads ─► show?   ─ useEffect reads ─► show?  AnnouncementBar
                     │  click "Got it" ─► setConsent() ─► hide
                     │  click "×"      ─► setAnnouncementDismissed() ─► hide
```
Initial SSR markup: both overlays render hidden (`useState(false)`); effect runs client-side, flips to shown when storage is empty. No server reads, no hydration mismatch, no CLS.

## Interfaces / Contracts

```ts
// landing-page.tsx (RSC) — named export, NOT default
export function LandingPage(): JSX.Element
// coming-soon-button.tsx ("use client")
export function ComingSoonButton(props: { children: React.ReactNode; variant?: 'accent' | 'secondary' | 'ink' }): JSX.Element
// cookie-banner.tsx / announcement-bar.tsx ("use client")
export function CookieBanner(): JSX.Element | null
export function AnnouncementBar(): JSX.Element | null
// app/page.tsx — default export (App Router requirement)
export const metadata: Metadata    // landing SEO (indexable)
export default function Home(): JSX.Element
```

## Testing Strategy
TDD order per surface: write failing RTL/E2E asserting new copy → implement → green. Existing `landing.test.tsx` and `smoke.spec.ts` assert OLD copy and MUST be rewritten first (they will fail until implementation lands). Do not assert Tailwind classes; test accessible names and user-visible behavior.

## Migration / Rollout
No data migration. Additive frontend surface + two routes. Rollback = revert branch (restores Block 0 scaffold, no backend/data impact).

## Open Questions
- [ ] **AnnouncementBar scope delta**: required by this design task but not in `proposal.md` scope / Affected Areas. Confirm inclusion or drop before tasks.
- [ ] `/privacy` legal entity — `[Company]` + placeholder contact email until a real entity exists.
- [ ] `/campaigns/phandalin` confirmed inert (`ComingSoonButton`), not a real route this block.
