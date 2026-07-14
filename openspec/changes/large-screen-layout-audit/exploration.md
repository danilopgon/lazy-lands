# Exploration: large-screen-layout-audit

## Scope and decision boundaries

Issue #45 identifies a composition problem from 1440px upward: several authenticated views remain a narrow centered island even when their information architecture could use more width. This is a responsive-layout and UX improvement, not a request to make every page full width.

- In scope: all shipped frontend routes, with priority on the landing page and private campaign workspace.
- Lower priority: authentication routes; their centered `440px` card is intentional.
- Preserve: Print Chronicle tokens, hard edges/shadows, readable prose measures, localized copy, all current states and interactions, and the DM-control/provenance model.
- Not assumed: the Stitch three-zone reference is inspiration only. A persistent private-notes bar has no approved product or persistence model and remains undecided.

## Current State

The public landing already uses a `1420px` composition band and intentionally pairs hero copy with the graph. The private app has no shared desktop workspace container: `AppHeader` and `EntityNav` are full-width horizontal chrome, while individual routes independently choose centered `720px`, `820px`, `900px`, or `1100px` max widths. At 1440px this leaves approximately 540px of total outer space for a `900px` page before gutters, even on pages whose two-column content and record collections can use a wider frame.

Existing responsive behavior is mostly the single `llg` breakpoint at `901px`. It correctly collapses editorial grids for small screens, but does not define a large-screen expansion policy. The resulting inconsistency is structural rather than a color, typography, or component-system problem.

### Current layout primitives and constraints

| Primitive | Current use | Constraint relevant to the audit |
| --- | --- | --- |
| `AppHeader` | `/dashboard`, all `/campaigns/*` | Full-width header with `px-4 llg:px-10`; no private workspace rail or shared content frame. |
| `EntityNav` | `/campaigns/:id/*` | Full-width horizontal contextual nav; six items and no large-screen alternate. |
| Page frames | Route-local `max-w-[720\|820\|900\|1100px]` | Repeated literals prevent a coherent `>=1440px` policy. |
| Editorial grids | Detail, prepare, generated session, export | Activate at `901px`; current sidebars are `340px`, 1/3, or `280px`, inside mostly `900px` frames. |
| Landing bands | Hero and major sections | `max-w-[1420px]`, `llg` two-column compositions; already materially better at wide widths. |
| Long-form controls | Creation, review, log-session, private notes | `720–820px` frames are deliberate reading/form measures and should not be widened merely to fill space. |

## Candidate Route Audit

| Route group | Current frame / composition | Priority at >=1440px | Direction to validate |
| --- | --- | --- | --- |
| `/` | `1420px` public bands; hero two columns | Medium | Retain its public composition; audit section-specific rhythm, not a private-app shell. |
| `/dashboard` | `900px`; two campaign cards | High | Expand the workspace frame and validate 2–3 card columns only when card content remains readable. |
| `/campaigns/:id` | `1100px`; detail plus `1fr / 340px` side column | Highest | First pilot for a wide workspace: keep world-state prose constrained, give continuity panels and ledger more room. |
| `/campaigns/:id/npcs`, `/factions`, `/arcs` | `1100px`; shared entity-list scaffold | High | Wider collection frame, controls and rows; retain modal sizes and row reading measures. |
| `/campaigns/:id/memory/review` | `900px`; proposal list + active memories below | High | Evaluate a broader two-zone layout only if it improves simultaneous review of suggestions and accepted canon; keep Accept/Edit/Dismiss obvious. |
| `/campaigns/:id/prepare` | `900px`; `1.5fr / 1fr` context/form grid | High | Expand modestly; maintain form labels and fields above inputs and a bounded instructions measure. |
| `/campaigns/:id/sessions/:sid` | `900px`; draft plus memories sidebar | High | Expand the existing split, cap draft prose around 65–75ch, and keep the sidebar contextual rather than decorative. |
| `/campaigns/:id/sessions/:sid/export` | `900px`; `280px / 1fr` selector/preview | Medium | Expand only enough for selection and printable-preview contrast; the paper preview itself should stay bounded. |
| `/campaigns/new`, `/campaigns/new/review`, `/campaigns/:id/sessions/new` | `720px`, `820px`, `720px` form/review frames | Low | Preserve focused reading/editing widths; at most align outer gutters and supporting context without widening the core form. |
| `/login`, `/register`, `/forgot-password`, `/auth/reset`, `/auth/confirm` | Shared centered `440px` card | Low | Preserve the intentional auth-card pattern; check only surrounding vertical balance and header absence. |
| `/privacy`, `/cookies` | `max-w-2xl` prose | Low | Preserve legal reading measure. |
| `/campaigns/:id/settings` | Not shipped | N/A | Exclude from implementation until that route exists; future work uses PRODUCT.md + DESIGN.md. |

## Handoff Checklist for a Follow-up Frontend Change

The implementation phase must derive a route-by-route checklist from the shipped source and use the current shared primitives. The shared audit checklist is:

- [ ] Preserve every existing field, label, localized string, CTA, breadcrumb, provenance badge, and navigation target; no hard-coded UI copy.
- [ ] Preserve each state separately: loading (`LoadingScribe`), error (`Notice` with retry where present), empty (`EmptyState` or route-specific empty copy), success/feedback (notices, toasts, stamps), and typed-input preservation on failed writes.
- [ ] Keep public and private layouts distinct: public sections may use the `1420px` storytelling band; private workspaces use task-oriented information regions with capped prose/forms.
- [ ] Reuse `AppHeader`, `EntityNav`, `Field`, `LoadingScribe`, `Notice`, `EmptyState`, `OriginBadge`, `StatLedger`, `SectionHeader`, `Modal`, and existing session/campaign views where applicable.
- [ ] Use only Print Chronicle tokens: radius `0`, hard ink shadows, emerald as the only accent, mono for system metadata, serif for reading, Instrument Sans for controls.
- [ ] Preserve `llg` collapse at `<=900px`; add a named large-screen policy at `>=1440px` without changing narrower layouts unless a documented responsive defect requires it.
- [ ] Keep text measures bounded: prose and form help approximately 65–75ch; printable PDF preview remains deliberately narrow.
- [ ] Preserve motion gates: existing `ll-view-enter`, `ll-rule-anim`, loading quill, stamp/strike feedback, press physics, `data-motion`, and `prefers-reduced-motion` behavior.
- [ ] Perform the contract's adversarial review at 1440px, 1600px, and 1920px plus the existing 900px/mobile collapse; enumerate every state per route in the compliance report.

## Approaches

1. **Shared wide workspace frame with selective content zones** — Introduce semantic private-layout width tokens/primitives and apply them to dashboard, campaign detail, entity collections, memory review, prepare, generated session, and export. Use one content rail for reading/forms and an optional contextual rail only on information-rich routes.
   - Pros: fixes the root cause (route-local width literals), preserves focused forms, limits duplication, and offers a coherent desktop language without copying the Stitch reference.
   - Cons: touches several route and component boundaries; requires visual regression coverage across all state variants.
   - Effort: Medium.

2. **Route-by-route max-width increases** — Increase selected `max-w-*` values and add grid columns locally.
   - Pros: small, individually reversible diffs.
   - Cons: perpetuates scattered layout policy; likely produces inconsistent spacing and a series of one-off breakpoints.
   - Effort: Medium.

3. **Persistent three-zone app shell with private-notes bar** — Add fixed campaign navigation, central content, and persistent notes at desktop sizes.
   - Pros: strongest use of large viewport and direct visual resemblance to the inspiration.
   - Cons: changes information architecture, creates sticky/focus/overflow complexity, risks distracting task flow, and has no defined note ownership, save lifecycle, privacy boundaries, or cross-route value.
   - Effort: High.

## Recommendation

Adopt Approach 1. Define a private-workspace large-screen tier beginning at `1440px`, above the existing `901px` mobile-collapse boundary. Use it first for campaign detail, dashboard, entity collections, memory review, prepare, generated session, and export; explicitly retain narrow frames for auth, legal, focused creation, log-session, and extraction review.

The public landing should remain a separate, wider editorial composition (`1420px` band) and be audited for intentional section balance rather than converted into app-shell columns. The private workspace should use width to expose task-relevant context (campaign navigation, ledgers, memories, collections) while keeping prose and forms bounded. Do not include a persistent notes bar in the initial proposal: evaluate it later through a dedicated product decision with concrete persistence, privacy, keyboard, and route-transition requirements.

## Testing and Verification Candidates

- Extend existing Vitest/RTL route tests only for user-visible behavior affected by new layout regions, semantics, navigation, and state preservation; do not assert Tailwind class names.
- Add Playwright visual/regression coverage or documented screenshot review for 1440px, 1600px, and 1920px, plus 900px and mobile, covering landing, dashboard, detail, entity list, memory review, prepare, generated session, export, creation form, and one auth route.
- Verify no horizontal overflow; visible keyboard focus; correct tab order in any added rail; no loss of typed form text; preserved motion/reduced-motion behavior; and unchanged i18n literal-sweep compliance.

## Affected Areas

- `apps/web/app/[locale]/dashboard/page.tsx` and `components/campaigns/campaign-list.tsx` — narrow dashboard and two-card desktop grid.
- `apps/web/app/[locale]/campaigns/[id]/page.tsx` and `components/campaigns/campaign-detail-view.tsx` — primary large-screen pilot with existing contextual column.
- `apps/web/components/campaigns/entity-list-screen.tsx` and entity list components — shared collection layout.
- `apps/web/app/[locale]/campaigns/[id]/memory/review/page.tsx` — review-heavy candidate with proposal and canonical-memory states.
- `apps/web/components/sessions/{prepare-session-form,generated-session-view,session-export-view}.tsx` — existing split layouts bounded by `900px`.
- `apps/web/app/[locale]/campaigns/new/**` and `campaigns/[id]/sessions/new/page.tsx` — intentional narrow form/review frames to protect.
- `apps/web/components/layout/{app-header,entity-nav}.tsx` — shared private chrome that could host a semantic workspace frame but must remain accessible.
- `apps/web/components/landing/**` — public wide-band composition to audit separately.
- `apps/web/components/auth/auth-card.tsx` — intentional centered-card exception.
- `apps/web/app/globals.css` — likely home for named layout tiers while retaining current tokens and motion gates.

## Risks

- Overexpansion can damage long-form readability or make sparse states feel more empty; apply width by task type rather than globally.
- A desktop rail can cause overflow, hidden focus targets, or changed reading/tab order if it is introduced without responsive and keyboard validation.
- Moving contextual information into a new region may obscure the DM's review/approval control or provenance badges.
- Visual-only changes can evade RTL coverage; large-viewport screenshot review is required.
- The existing `openspec/config.yaml` describes a pre-build stage although the app is implemented; downstream artifacts should use the codebase as the current source of truth.

## Ready for Proposal

Yes. The proposal should define a selective `>=1440px` private-workspace policy, name the pilot routes and protected narrow routes, mandate the handoff checklist and visual verification matrix, and record that persistent private notes are deferred rather than included.
