# Proposal: Block 3 — Production Landing Page

## Intent

DMs who run long campaigns lose narrative context between sessions and arrive at the table having forgotten NPCs, factions, grudges and accepted consequences. The Block 0 scaffold landing does not communicate this value: it shows a placeholder hero ("Remember what happened. Prepare what comes next.") with no proof, no flow explanation, and no legal pages. A curious DM cannot understand what Lazy Lands does or why it is different (the Scribe proposes, the DM decides canon). This change ships a production-quality public landing that converts curious DMs into registrations, plus the Cookie and Privacy legal pages required to operate publicly.

## Scope

### In Scope
- Full rebuild of `landing-page.tsx`: 9 landing sections (PublicTop, Hero, Marquee, Pillars, Briefing, How It Works, Philosophy, CTA, Footer) per the prototype, rebuilt in React/Tailwind/shadcn. (CookieBanner is counted under `legal-consent-pages`, not as a landing section.)
- Footer MUST add `Privacy` and `Cookies` links (absent in prototype).
- `CookieBanner`: informational-only, first-visit banner, localStorage consent (`ll-cookie-consent` = `"acknowledged"`), "Learn more" → `/cookies`, no accept/reject.
- `/cookies` and `/privacy` legal pages: minimal prose, `noindex`, informational-only (no preference panel).
- `consent.ts` localStorage helper.
- Landing SEO metadata on `page.tsx`; marquee keyframe in `globals.css`.
- Rewrite `landing.test.tsx` + `smoke.spec.ts` (assert OLD copy — fail until updated; TDD: tests first).

### Out of Scope
- Auth flows, `/login` / `/register` implementation, Supabase writes, backend changes.
- A real `/campaigns/phandalin` demo route (CTA links only; see Open Questions).
- RAG, embeddings, billing, analytics, third-party cookies, multi-user.
- Cookie consent-gating / preference toggle (no non-essential cookies exist).

## Capabilities

### New Capabilities
- `marketing-landing`: public landing surface — 9 landing sections (PublicTop … Footer), hero copy, responsive collapse, marquee, reduced-motion, CTAs and footer legal links.
- `legal-consent-pages`: `/cookies` page, `/privacy` page, and the informational CookieBanner + localStorage consent helper.

### Modified Capabilities
- None.

## Approach

Focused frontend-only production refresh. Port the prototype's editorial sections to real React components against the Print Chronicle tokens in `DESIGN.md` (radius-0, hard ink shadows, rust accent, three font families). No prototype HTML/CSS copied. CookieBanner is `position: fixed` (SSR-safe, no layout shift) reading localStorage on mount. Legal pages are static server components with `noindex` metadata. Strict TDD: each surface gets failing tests before implementation.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `apps/web/components/landing-page.tsx` | Modified | Full rebuild, 10 sections |
| `apps/web/components/cookie-banner.tsx` | New | Informational banner |
| `apps/web/lib/consent.ts` | New | localStorage consent helper |
| `apps/web/app/cookies/page.tsx` | New | Cookie policy (noindex) |
| `apps/web/app/privacy/page.tsx` | New | Privacy policy (noindex) |
| `apps/web/app/page.tsx` | Modified | Landing SEO metadata |
| `apps/web/app/globals.css` | Modified | Marquee keyframe |
| `apps/web/tests/landing.test.tsx` | Modified | Rewrite for new copy/sections |
| `apps/web/tests/e2e/smoke.spec.ts` | Modified | Update smoke copy |

## Cross-Cutting Acceptance Criteria

> Per-section pass/fail belongs to the spec phase. These cross-cutting criteria bind every surface.

- [ ] Hero renders confirmed English copy ("Your campaign, without the amnesia.") and CTAs to `/register` and `/campaigns/phandalin`.
- [ ] Footer exposes working `Privacy` and `Cookies` links.
- [ ] CookieBanner shows only when no `ll-cookie-consent` key exists; dismiss stores `"acknowledged"`; never reappears after.
- [ ] CookieBanner causes no Cumulative Layout Shift (fixed positioning, SSR-safe).
- [ ] Single-column layout at ≤900px; hero collage collapses and never hides core copy.
- [ ] Marquee animation pauses/removes under `prefers-reduced-motion: reduce`.
- [ ] `/cookies` and `/privacy` carry `noindex` metadata.
- [ ] WCAG 2.2 AA: visible rust focus rings, color paired with text, accessible names on nav/CTAs.

## Non-Functional Requirements

| Concern | Requirement |
|---------|-------------|
| Accessibility | WCAG 2.2 AA; keyboard-navigable; visible focus |
| Responsive | Single column ≤900px; collage decorative-only on mobile |
| Motion | Honor `prefers-reduced-motion` + `data-motion` |
| Core Web Vitals | No CLS from CookieBanner; no late-loading shift |
| SEO | Landing indexable with metadata; legal pages `noindex` |
| Privacy/Legal | Informational-only consent (LSSI-CE art. 22.2 technical-cookie exemption) |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Hero collage hides content on mobile | Med | Collapse to single column at 900px; collage decorative |
| Marquee ignores reduced-motion | Med | Gate animation on media query |
| CookieBanner layout shift | Med | `position: fixed`, SSR-aware mount |
| Existing tests assert old copy | High | TDD — rewrite tests first |
| Dead-link CTA to `/campaigns/phandalin` | Med | See Open Questions; resolve before apply |

## Open Questions

- `/privacy` data-controller name — no legal entity yet. Use placeholder `[Company]` and contact email placeholder?
- `/campaigns/phandalin` — make it a real demo route, or render the CTA as visibly inert (e.g. disabled/"coming soon") to avoid a dead link? Recommend inert-but-clear for this block.

## Rollback Plan

Revert the branch. The change is additive frontend surface plus two new routes; restoring the prior `landing-page.tsx` and removing `/cookies`, `/privacy`, `cookie-banner.tsx`, `consent.ts` returns the app to the Block 0 scaffold with no data or backend impact.

## Dependencies

- `DESIGN.md` Print Chronicle tokens (already in `globals.css`).
- shadcn/ui primitives already restyled in Block 0.

## Success Criteria

- [ ] Landing communicates the core promise and the Scribe-proposes/DM-decides principle.
- [ ] All 9 landing sections, CookieBanner, `/cookies`, `/privacy` render and pass their tests.
- [ ] All cross-cutting acceptance criteria met; `pnpm lint`, `pnpm typecheck`, `pnpm test` pass.
- [ ] No auth, backend, or out-of-scope features introduced.
