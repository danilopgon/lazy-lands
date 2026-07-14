# Proposal: Large-screen layout audit

## Intent

At `>=1440px`, several authenticated views remain narrow centered islands. Give DMs task-relevant context and collection space without weakening Print Chronicle, readable measures, or DM review control. This affects the Campaign → Session → Memory → Generate critical path.

## Scope

### In Scope
- Establish a named selective private-workspace tier at `>=1440px`, preserving the existing `<=900px` collapse.
- Apply it first to dashboard, campaign detail, entity lists, memory review, prepare, generated session, and export; prioritize generated-session workspace, dashboard, and detail.
- Audit every shipped view at 1440px, 1600px, and 1920px; preserve all fields, states, copy, provenance, navigation, motion, focus order, and bounded prose/forms.

### Out of Scope
- A global persistent rail, fixed private-notes bar, notes persistence model, or changed information architecture.
- Automatic widening of landing, focused forms/review, log-session, legal, or centered auth cards; these require validation/preservation only.
- New backend APIs, data models, AI behavior, or localization copy.

## Capabilities

### New Capabilities
- `large-screen-layout`: Selective responsive workspace policy and viewport verification matrix for shipped frontend routes.

### Modified Capabilities
- `campaign-view`: Dashboard, campaign detail, and entity-list layout requirements gain the selective `>=1440px` workspace behavior while preserving existing states and interactions.

## Approach

Introduce semantic private-layout widths/zones in the frontend rather than route-by-route `max-w-*` increases. Keep public landing storytelling bands distinct; widen information-rich workspace regions selectively, cap prose/forms at about 65–75ch, and keep the PDF preview bounded. Follow the frontend handoff checklist and Print Chronicle tokens/motion gates.

## Affected Areas

| Area | Impact | Description |
|---|---|---|
| `apps/web/app/globals.css` | Modified | Named large-screen layout tier. |
| `apps/web/app/[locale]/dashboard/page.tsx` | Modified | Wider campaign workspace. |
| `apps/web/app/[locale]/campaigns/[id]/page.tsx` | Modified | Primary detail pilot. |
| `apps/web/components/campaigns/` | Modified | Shared collection and detail layouts. |
| `apps/web/components/sessions/` | Modified | Selective prepare, draft, and export layouts. |
| `docs/04-architecture.md`, `docs/08-quality-strategy.md` | Referenced | Frontend ownership and visual-quality guidance. |

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Overexpansion harms reading or sparse states | Medium | Selective zones and bounded measures. |
| Rails change focus/order or obscure review controls | Medium | No global rail; keyboard and state checks. |
| Visual regressions evade unit tests | High | Screenshot review at 1440/1600/1920, 900, and mobile. |

## Rollback Plan

Revert the semantic tier and route opt-ins; existing route frames and data behavior remain intact.

## Dependencies

- Current shipped route source and the frontend handoff-contract checklist.

## Success Criteria

- [ ] Priority workspaces use width purposefully at `>=1440px` without global expansion.
- [ ] Protected routes retain intentional measures and all route states/interactions remain intact.
- [ ] Visual, overflow, keyboard, reduced-motion, and i18n checks pass across the viewport matrix.
