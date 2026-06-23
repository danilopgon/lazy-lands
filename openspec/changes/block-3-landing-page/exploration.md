## Exploration: block-3-landing-page

### Current State

- Lazy Lands is a Campaign Companion for Dungeon Masters. The core positioning is continuity: generic AI can generate isolated one-shots, but Lazy Lands remembers accepted campaign context and keeps the DM in control.
- Product constraints from `PRODUCT.md` and `docs/`: AI output is always a proposal, the DM decides canon, memory is explicit/reviewable, private DM notes never feed the Scribe or exports, and RAG/embeddings/billing/collaboration remain out of MVP scope.
- The durable design source of truth is `DESIGN.md`: Print Chronicle visual language, radius 0, hard ink shadows, rust as the only brand accent, Source Serif 4/Instrument Sans/JetBrains Mono, visible focus, mobile collapse around 900px, and reduced-motion support.
- Handoff source of truth for the landing page is `handoff/app/views-landing.jsx` plus `handoff/app/views-public.jsx` for the public top navigation. It defines a strong landing narrative: public nav, hero, relationship graph collage, marquee, differentiation/pillars, briefing preview, how-it-works, philosophy quote, final CTA, and footer. It is reference-only; production must rebuild in Next.js/Tailwind/shadcn rather than copy prototype HTML/CSS.
- Production frontend exists in `apps/web` despite older OpenSpec config saying pre-build/no app code. Current `/` renders `apps/web/components/landing-page.tsx`, a Block 0 scaffold landing page with header links to `/login` and `/register`, basic hero, and product-principles card. `/login` and `/register` are stable placeholders, not real auth flows.
- Supabase auth helpers already exist (`apps/web/lib/supabase/client.ts`, `server.ts`, `middleware.ts`) and middleware refreshes auth cookies when public Supabase env vars are present. No production registration form behavior exists yet; CTA routing can safely target `/register` as a placeholder route.
- Privacy/cookies requirements are not documented as full legal pages. Existing docs only cover private campaign data, private notes, RLS ownership, and Supabase auth cookies. The Block 3 checklist introduces Privacy/Cookies as a new public-surface requirement that needs explicit scope in proposal/spec.
- Current tests assert old landing copy: “Remember what happened. Prepare what comes next.” and link names “Login” / “Register”. They will need TDD updates before implementation.

### Affected Areas

- `apps/web/components/landing-page.tsx` — main implementation surface for the landing content, nav, CTA, privacy/cookies footer, and responsive layout.
- `apps/web/app/page.tsx` — entry route remains thin, likely unchanged unless metadata/structure moves.
- `apps/web/app/layout.tsx` — page metadata may need a sharper landing title/description; font/theme setup already matches `DESIGN.md`.
- `apps/web/app/globals.css` — may need additional Print Chronicle utility tokens/patterns for responsive sections, legal footer, skip/focus treatment, or motion gates.
- `apps/web/components/ui/button.tsx` — existing shadcn-compatible button already matches hard-border/hard-shadow style; likely reused rather than changed.
- `apps/web/app/register/page.tsx` and `apps/web/app/login/page.tsx` — remain routing targets; no auth implementation should be assumed for this change unless proposal explicitly expands scope.
- `apps/web/tests/landing.test.tsx` — update assertions for required headline, CTA, how-it-works, differentiation, nav, footer/privacy/cookies, and link hrefs.
- `apps/web/tests/e2e/smoke.spec.ts` — update smoke copy expectations for the new landing promise.
- `handoff/app/views-landing.jsx`, `handoff/app/views-public.jsx`, `handoff/app/chronicle.css` — visual/reference inputs only; do not copy directly.
- `PRODUCT.md`, `DESIGN.md`, `docs/00-product-brief.md`, `docs/01-mvp-scope.md`, `docs/02-requirements-and-acceptance.md`, `docs/04-architecture.md`, `docs/07-data-security-and-rls.md` — product/design constraints that should be cited in the proposal/spec.

### Approaches

1. **Focused production landing refresh** — Replace the Block 0 landing component with a production-quality, rebuilt version of the requested sections using existing routes, tokens, and components.
   - Pros: Directly satisfies Block 3, small scope, respects current scaffold, easy to test with RTL/Playwright, avoids auth/backend expansion.
   - Cons: Registration remains a placeholder destination; privacy/cookies may be link/copy placeholders unless legal route scope is added.
   - Effort: Medium

2. **Full public marketing slice** — Landing plus real `/privacy` and `/cookies` pages and richer public route polish.
   - Pros: Resolves legal footer targets cleanly and makes the public surface feel more complete.
   - Cons: Larger review footprint; risks exceeding the landing-page block; legal content may need product-owner approval.
   - Effort: Medium/High

3. **Prototype-faithful port** — Recreate most handoff landing sections (hero collage, marquee, pillars, briefing mock, quote, CTA) in production.
   - Pros: Highest visual fidelity to handoff and strong first impression.
   - Cons: More code and more responsive/a11y risk; some prototype copy conflicts with the requested Spanish headline/CTA and existing English-copy docs.
   - Effort: High

### Recommendation

Proceed with **Focused production landing refresh**. The proposal should define Block 3 as a frontend-only public landing change: rebuild `LandingPage` around the required Spanish hero message (“Cualquier IA genera un one-shot. Lazy Lands recuerda tu campaña.”), a concise subtitle/value prop, three visual flow steps (vuelca campaña → registra sesión → genera la siguiente), differentiation against one-shot generators, minimal nav, primary CTA “Empieza gratis” linking to `/register`, minimal footer, and Privacy/Cookies affordances.

Keep scope disciplined: do not implement real authentication, backend behavior, billing, RAG, embeddings, or collaboration. Treat `/register` as the existing route target. If full legal pages are required, make that an explicit spec decision; otherwise use minimal footer links/copy that can be expanded later.

### Risks

- **Copy language conflict:** docs say production UI copy is English unless decided otherwise, while this block explicitly requests Spanish headline/CTA. Proposal/spec should record Spanish landing copy as the decision for this change.
- **Privacy/Cookies ambiguity:** no existing legal content or routes are documented; implementing links without pages may be incomplete, but adding pages may exceed scope.
- **Prototype fidelity vs review budget:** a near-complete prototype port could exceed the 800-line review budget. Keep the first implementation focused or split if tasks forecast high churn.
- **Responsive/a11y risk:** hero collage/visual steps must not hide core content on mobile, must keep logical headings/landmarks, visible focus, 44px comfortable touch targets, and reduced-motion behavior.
- **Existing tests will fail until updated first:** strict TDD means tests must be rewritten to the new landing expectations before implementation.

### Ready for Proposal

Yes. The next phase should create an SDD proposal for a focused, frontend-only Block 3 landing page, with an explicit decision on Spanish landing copy and the minimal Privacy/Cookies treatment.
