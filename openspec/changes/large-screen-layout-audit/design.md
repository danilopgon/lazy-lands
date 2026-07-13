# Design: Large-screen layout audit

## Technical Approach

Add a semantic, CSS-only private-workspace policy at `>=1440px`. Routes opt into it explicitly; it expands operational collections and contextual panels, not copy, data, APIs, or the application shell. This implements `large-screen-layout` and the campaign-view delta while retaining the `<=900px` document-flow collapse.

## Architecture Decisions

| Decision | Alternatives considered | Rationale |
| --- | --- | --- |
| Semantic workspace utilities | Route-specific `max-w-*`; global shell/rail | `ll-workspace`, `ll-workspace-main`, and `ll-workspace-context` centralize the 1440 policy without widening protected routes or changing IA. |
| CSS-only responsive composition | Runtime viewport hook; new client state | Tailwind/CSS already owns responsive layout; avoids hydration, bundle, and focus-order risk. |
| Bounded reading lanes | Fill available columns | Long prose, editors, and PDF preview remain 65–75ch / existing 640px cap; space goes to context or collections. |
| Local contextual panels | Sticky/fixed notes or navigation rail | Existing memories, provenance, actions, and notes remain in normal flow; no new persistence or global chrome. |

## Data Flow

```
existing route data/query -> existing view + primitives -> route-local layout utility
                                      |                    |
                                      +-> unchanged actions/states
CSS @ >=1440px -----------------------> workspace columns/collection density
```

No request, schema, cache-key, localization, or mutation contract changes. Keep generated-session query parallelism and pass existing data only.

## Route Policy

| Route group | `>=1440px` decision |
| --- | --- |
| Dashboard | Opt in: wider header/search region and three-column campaign collection; loading, error, empty, and empty-search retain the same content. |
| Campaign detail | Opt in: wider frame; metadata/ledger stay full width; world-state reading lane remains bounded while arcs and active memories use the contextual column. |
| NPCs, factions, arcs | Opt in: wider collection frame only; filters, rows, provenance, and modals retain DOM order and behavior. |
| Generated session | Opt in: wider draft workspace with a bounded editable prose lane and normal-flow continuity/legend context; private notes remain a local editable section, never a bar. |
| Memory review, prepare | Assess and preserve current bounded review/form composition unless screenshot audit proves a concrete operational benefit. |
| Export | Optional outer workspace only for selection controls; retain the 640px PDF preview. |
| Landing, auth, create/review, log session, legal | Protected: no opt-in. Auth remains its 440px centered card. |

## File Changes

| File | Action | Description |
| --- | --- | --- |
| `apps/web/app/globals.css` | Modify | Add named 1440px workspace utilities and no global container override. |
| `apps/web/app/[locale]/dashboard/page.tsx` | Modify | Opt dashboard frame into policy. |
| `apps/web/components/campaigns/campaign-list.tsx` | Modify | Add wide collection grid behavior. |
| `apps/web/app/[locale]/campaigns/[id]/page.tsx` | Modify | Opt detail state frames into policy. |
| `apps/web/components/campaigns/campaign-detail-view.tsx` | Modify | Bound reading lane and contextual detail column. |
| `apps/web/components/campaigns/entity-list-screen.tsx` | Modify | Opt entity collections into the shared frame. |
| `apps/web/components/sessions/generated-session-view.tsx` | Modify | Apply wide draft/context layout without moving controls or notes into fixed UI. |
| `apps/web/components/sessions/session-export-view.tsx` | Modify | Assess/limit outer controls while preserving preview width. |
| `DESIGN.md` | Modify | Document eligibility, protected layouts, measures, and prohibited global rails. |
| `docs/04-architecture.md` | Modify | Assign workspace-policy ownership to frontend CSS + route composition. |
| `docs/08-quality-strategy.md` | Modify | Add viewport/state/i18n/motion/keyboard visual verification matrix. |
| relevant dashboard/detail/generated tests and `tests/e2e/` | Modify | RED-first behavioral and viewport coverage. |

## Interfaces / Contracts

CSS is the only new contract: route composition may use the named workspace utilities; they activate only at `min-width: 1440px`. Utilities must not change DOM order, positioning to fixed/sticky, color tokens, motion gates, or protected route widths. Existing primitives (`AppHeader`, `Button`, `Field`, `LoadingScribe`, `Notice`, `EmptyState`, `OriginBadge`, `StatLedger`, `Modal`, `MarkdownBody`) remain authoritative.

## Testing Strategy

| Layer | RED-first test | Approach |
| --- | --- | --- |
| Unit | Priority routes retain every named control/state and generated edits/provenance | Extend RTL tests using roles, labels, visible feedback, and locale providers; do not assert utility class names. |
| E2E | 1440×900, 1536×960, 1920×1080 layouts; English/Spanish and reduced motion at 1440×900 | Add Playwright route fixtures/screenshots plus keyboard tab-order and overflow assertions for populated, loading, error, empty, success, and action-failure states. |
| Regression | `<=900px` remains normal flow; protected routes stay bounded | Run `pnpm test`, then configured Playwright, lint, and typecheck. |

## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary.

## Migration / Rollout

No migration required. Ship as one PR within the 800-line review budget; rollback removes route opt-ins and workspace utilities.

## Open Questions

- [ ] None; secondary route opt-ins are evidence-gated by the required audit.
