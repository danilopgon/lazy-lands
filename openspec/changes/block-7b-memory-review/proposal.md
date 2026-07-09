# Proposal: Block 7b Memory Review

## Intent

Let the DM turn transient Scribe `MemorySuggestion` proposals from session logging into durable `MemoryFact` records only after review. This affects the critical path: Login → Campaign → Session → **Memory** → Generate, and follows `PRODUCT.md`, `docs/05-ai-system.md`, `docs/06-api-contracts.md`, and `docs/07-data-security-and-rls.md`.

## Scope

### In Scope
- Memory Review UI at `/campaigns/[id]/memory/review` from the `MemoryReview` handoff.
- Accept, edit then accept, or dismiss transient suggestions; only accepted or edited content is persisted.
- Backend memory module endpoints: `POST /campaigns/{campaign_id}/memory-facts`, `PATCH /memory-facts/{id}`, and `GET /campaigns/{campaign_id}/memory-facts?status=active` for the review/detail UI.
- Retire active memories via `PATCH status=archived`.
- Verify existing `memory_facts` RLS and composite FK behavior without rebuilding schema.
- Use scoped `sessionStorage` handoff from Log Session success to review route.

### Out of Scope
- RAG, embeddings, draft suggestion persistence, billing, collaboration.
- Changing 7a suggestion generation.
- Block 8 next-session generation.

## Capabilities

### New Capabilities
- `memory-review`: MemoryFact create/list/update contracts, transient suggestion review UX, sessionStorage handoff, retire behavior, backend validation/ownership/RLS expectations.

### Modified Capabilities
- `campaign-view`: Replace the campaign-detail Active memories placeholder with live active MemoryFacts and add memory navigation affordances.

## Approach

- Mirror sessions/campaigns Clean Architecture patterns in `services/api/app/modules/memory/**` with Pydantic request models before write, app-layer campaign ownership pre-checks, per-user Supabase client, and RLS as the data backstop.
- On Log Session success, Zod-validate and store `{ campaign_id, session_id, session_number, memory_suggestions }` in a campaign/session-scoped `sessionStorage` key, navigate locale-aware to `/campaigns/{id}/memory/review`, and clear stale/completed drafts.
- Review UI fetches active memories, renders loading/error/empty/success states, uses EN/ES i18n only, and follows handoff stamp/strike motion with reduced-motion support.
- Strict TDD: backend endpoint/RLS tests first; frontend storage, route, action, i18n, and handoff-state tests first.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `services/api/app/modules/memory/**` | New | Memory domain, use cases, repository, routes, schemas. |
| `services/api/app/main.py` | Modified | Mount memory router and handlers. |
| `services/api/tests/**` | Modified | Memory endpoint, ownership, RLS tests. |
| `apps/web/app/[locale]/campaigns/[id]/memory/review/**` | New | Review route. |
| `apps/web/lib/{memory,sessions}/**` | New/Modified | API clients, schemas, handoff storage. |
| `apps/web/components/**`, `messages/*.json` | Modified | Log-session navigation, detail active memories, nav, i18n. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Stale browser drafts | Med | Scope by campaign/session, Zod-validate, clear aggressively. |
| Ownership leak | Low | App guard plus RLS tests for every memory op. |
| Large PR | High | Maintainer-approved `size:exception`; keep tasks reviewable inside one PR. |

## Rollback Plan

Revert memory module registration, frontend review route/navigation/storage changes, and delta specs. No `memory_facts` migration is introduced, so persisted accepted facts can remain or be archived manually.

## Dependencies

- Existing `memory_facts` table, enums, RLS policies, and Block 7a `memory_suggestions` response.
- Handoff: `handoff/app/views-sessions.jsx`, `handoff/app/ui.jsx`.

## Success Criteria

- [ ] Accepted or edited suggestions create active MemoryFacts; dismissed suggestions send no request.
- [ ] Retire archives facts via PATCH and active reads exclude archived rows.
- [ ] Direct review visits without a valid draft show the empty state.
- [ ] EN/ES UI has no hard-coded copy and no new em dashes.
- [ ] Backend and frontend strict-TDD gates pass.
