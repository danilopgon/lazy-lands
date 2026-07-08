# Deferred Backlog

This document is a parking lot for work that was explicitly deferred, scoped out, or identified as cleanup debt. It is **not** current MVP scope and must not be treated as an implementation plan unless a future SDD change promotes an item into active work.

Use this backlog to avoid losing decisions while protecting the TFM MVP from scope creep.

## How to Use This Document

| Reader goal | What to do |
|---|---|
| Planning current MVP work | Treat these items as out of scope unless the active spec says otherwise. |
| Starting a post-MVP change | Use the relevant row as context, then create a focused SDD proposal/spec. |
| Cleaning up known debt | Verify the referenced source first; some items may already be fixed. |
| Adding new deferred work | Record why it was deferred, where it came from, and any implementation constraints. |

## Deferred Product Opportunities

| Item | Why deferred | Source | Notes |
|---|---|---|---|
| Rich Log Session form | The MVP shipped a 2-field session form: required `summary` and optional `consequences`. The prototype included more fields, but they require schema, API, UI, and prompt/export changes. | Engram #547; `PRODUCT.md`; `docs/conventions/handoff-deviations.md`; Block 7a scope | Candidate mini-block. Deferred fields: session title, world state changes, NPC changes, faction changes, arcs touched, and private DM notes. Editable session number should likely stay deferred or rejected because session numbers are server-assigned for atomic sequential numbering. |
| Private DM notes | Private notes have special semantics that are larger than a simple column. | `PRODUCT.md` section 3; Engram #547 | If reintroduced, they must never be sent to the Scribe, never be included in summarize/suggest prompts, and never be exported to PDF. |
| Scribe chatbot | A conversational Scribe surface could help DMs explore campaign context, ask follow-up questions, or draft ideas, but it is not part of the MVP sacred demo path. | User backlog request; `PRODUCT.md` product principles | Must preserve the rule that the Scribe proposes and never decides. It must not mutate canon automatically; any generated memory, entity change, or session draft must remain an editable proposal confirmed by the DM. |
| Timeline view | Useful for long-running campaigns, but not required for the core MVP memory loop. | `docs/01-mvp-scope.md`; `docs/10-roadmap.md`; `docs/README.md` | Could visualize sessions, accepted memories, faction reactions, and arc changes after the MVP flow is stable. |
| Advanced filtering | Helpful once campaigns contain many sessions, memories, NPCs, factions, and arcs. | `docs/01-mvp-scope.md` | Keep post-MVP unless needed to protect the core demo path. |
| Better generated-session layout | Valuable polish for session prep and table use, but not a blocker for structured generation. | `docs/01-mvp-scope.md` | Consider together with print/PDF improvements so screen and export layouts stay coherent. |
| More detailed faction reasoning | Could improve continuity explanations, but it expands prompt and UI complexity. | `docs/01-mvp-scope.md` | Keep tied to accepted memories and visible reasoning so the DM can review it. |
| Dark theme and theme settings | The MVP ships light-only Print Chronicle. Theme toggles would add surface area without helping the sacred demo path. | `DESIGN.md` sections 2, 3, and 9 | Do not scaffold until a dedicated post-MVP theme task exists. |
| Interactive campaign generation demo | A standalone interactive demo of the AI campaign extraction flow would help showcase the product, but it is not part of the MVP sacred demo path. | User backlog request | Would need a sandboxed environment with no auth and a fake or rate-limited LLM provider to avoid abuse. |

## Post-MVP Technical and Product Opportunities

| Item | Why deferred | Source | Notes |
|---|---|---|---|
| RAG, embeddings, and vector search | Explicitly out of TFM MVP. They add infrastructure and retrieval complexity beyond the current rolling-summary and accepted-memory model. | `docs/01-mvp-scope.md`; `docs/10-roadmap.md`; `AGENTS.md`; `docs/README.md` | Post-MVP only. Do not scaffold during MVP work. |
| Visual campaign timeline | Out of TFM scope and not required for the sacred demo path. | `docs/10-roadmap.md`; `docs/README.md` | Related to the timeline product opportunity above. |
| Advanced relationship graph | Out of TFM scope. Relationship modeling would require new entities and UX for graph interpretation. | `docs/01-mvp-scope.md`; `docs/10-roadmap.md`; `docs/README.md` | Avoid adding `Relationship` as an MVP entity. |
| Advanced memory compiler | Out of TFM scope. The MVP relies on reviewable MemoryFacts and rolling accumulated summaries. | `docs/01-mvp-scope.md`; `docs/10-roadmap.md` | Any future compiler must keep memory reviewable and DM-confirmed. |
| WorldFact entity | Cut from the MVP persistent entity model. | `docs/10-roadmap.md` | Do not add unless a future domain-model change promotes it. |
| Relationship entity | Cut from the MVP persistent entity model. | `docs/10-roadmap.md` | Do not add unless a future relationship feature is accepted. |
| Real PDF export enhancements | Basic export is MVP-relevant, but richer controls and print polish can expand later. | `docs/01-mvp-scope.md`; `docs/10-roadmap.md`; `PRODUCT.md` | Must continue excluding private notes if those are ever reintroduced. |
| Basic observability | Useful but should not block delivery. | `docs/01-mvp-scope.md` | Add only if it supports deployment/debugging without broad platform work. |
| Advanced visual identity | Could improve brand impact, but the MVP already has the Print Chronicle system. | `docs/01-mvp-scope.md`; `DESIGN.md` | Preserve existing design principles unless a redesign is explicitly scoped. |

## Intentional Non-Goals and Not Planned

| Item | Why not planned for MVP | Source | Notes |
|---|---|---|---|
| Billing | Explicitly out of scope. | `docs/01-mvp-scope.md`; `AGENTS.md`; `docs/README.md` | Not planned; do not scaffold payment flows. |
| Free/Premium plan enforcement | Explicitly out of scope. | `docs/01-mvp-scope.md`; `docs/README.md` | Not planned for the MVP. |
| Multi-user campaign collaboration | Explicitly out of scope and not planned. | `docs/01-mvp-scope.md`; `AGENTS.md`; `docs/README.md` | Lazy Lands currently models private campaign data owned by one user. |
| Shared campaigns | Explicitly out of scope. | `docs/01-mvp-scope.md`; `docs/README.md` | Would require new sharing and authorization rules. |
| Mobile app | Explicitly out of scope. | `docs/01-mvp-scope.md` | Responsive web remains sufficient for MVP expectations. |
| Standalone one-shot generator | Explicitly out of scope and contrary to the continuity-first positioning. | `docs/01-mvp-scope.md`; `PRODUCT.md` | Lazy Lands is about campaign memory, not disposable one-shots. |
| Obsidian sync | Explicitly out of scope. | `docs/01-mvp-scope.md` | Requires integration design and conflict handling. |

## Known Documentation and Cleanup Debt

| Item | Why it matters | Source | Notes |
|---|---|---|---|
| `campaign-card` empty tone/factions copy | It renders an em dash for empty tone/factions, which violates the project UI copy preference against em dashes. | Engram #547 | Cleanup only; not a blocker. |
| Frontend handoff route map for MemoryReview | `.agents/skills/frontend-handoff-contract/references/route-map.md` points MemoryReview to `views-review.jsx`, but the component lives in `handoff/app/views-sessions.jsx`. | Engram #547 | Fix before starting memory review UI work. |
| Arc status documentation drift | `docs/03-domain-model.md` still lists old arc statuses: `open`, `resolved`, `dropped`. Block 6 uses `active`, `dormant`, `resolved`, `discarded`. | Engram #547; Block 6 implementation context | Align the domain docs during a docs sweep. |

## Guardrails

- Do not re-add session-number concurrency hardening to this backlog. It was already completed in Block 7a PR #36 with the unique constraint and retry migration.
- Do not implement anything from this document without a current SDD change and a clear scope decision.
- Keep AI-facing features aligned with the product principle: the Scribe proposes, the DM decides.
