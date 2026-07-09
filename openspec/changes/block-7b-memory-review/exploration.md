## Exploration: Block 7b Memory Review

### Current State

- Block 7a is implemented and returns transient `memory_suggestions` from `POST /campaigns/{campaign_id}/sessions`. The backend contract is `RegisterSessionResponse(session_id, session_number, memory_suggestions[])`; suggestions are Pydantic-validated (`MemorySuggestion` and `MemorySuggestionsOutput`) and are never written by the sessions endpoint.
- The production Log Session form currently discards the response payload and navigates to `/campaigns/{id}` on success. Tests explicitly assert this 7a behavior, so Block 7b must change both implementation and tests if the review route becomes the success target.
- `services/api/app/modules/memory/` exists only as empty module stubs (`__init__.py` under module/application/domain/infrastructure). There are no memory routes, contracts, repository, use cases, or frontend API client yet.
- `memory_facts` DDL already exists in `supabase/migrations/20260628101707_initial_schema.sql`: `id`, `campaign_id`, nullable `source_session_id`, `content`, `type`, `importance`, `status`, timestamps, `importance` enum, `memory_status` enum, and the composite FK `(campaign_id, source_session_id) -> sessions(campaign_id, id)`. RLS is already enabled with owner-scoped select/insert/update/delete policies via parent campaign. This should be verified by tests, not rebuilt with a migration.
- API docs already define `POST /campaigns/{campaign_id}/memory-facts` and `PATCH /memory-facts/{memory_fact_id}`. They do not currently define a read endpoint, but the 7b UI needs active memories on the review screen and campaign detail needs its active memories placeholder wired to live data.
- Existing backend module patterns to mirror are the shipped `sessions` module for a fresh hexagonal template and `campaigns` child-entity commands for ownership pre-checks. Writes use `get_user_supabase_client`, app-layer parent visibility checks, repository dictionaries at the boundary, and module-local HTTP exception handlers.
- Existing frontend patterns are client components with TanStack Query, `apiFetch`, Zod response parsing, `@/i18n/navigation`, EN/ES message catalogs, and reusable Print Chronicle UI primitives (`Button`, `Field`, `Textarea`, `LoadingScribe`, `Notice`, `EmptyState`, `Modal`, `OriginBadge`).

### Affected Areas

- `services/api/app/modules/memory/**` — build the memory module: domain ports/enums, application contracts/read models/commands/queries, infrastructure repository, API routes/dependencies/exception handlers/schemas.
- `services/api/app/main.py` — mount the memory router and register module exception handlers.
- `services/api/tests/memory/**` and `services/api/tests/test_rls.py` — strict TDD coverage for create, update/archive, list active memories, ownership pre-checks, composite FK safety, and RLS behavior.
- `apps/web/lib/memory/**` — add Zod schemas and API client for memory facts.
- `apps/web/lib/sessions/**` and `components/sessions/log-session-form.tsx` — preserve the `POST /sessions` response, carry suggestions to memory review, and navigate locale-aware to `/campaigns/{id}/memory/review`.
- `apps/web/app/[locale]/campaigns/[id]/memory/review/**` — new review route from the `MemoryReview` handoff.
- `apps/web/components/campaigns/campaign-detail-view.tsx` — replace the active-memories placeholder with live active MemoryFacts.
- `apps/web/components/campaigns/entity-nav.tsx` — add the Memory nav item once the route exists.
- `apps/web/messages/en.json` and `apps/web/messages/es.json` — localize all memory-review and active-memory copy. No hard-coded UI copy; avoid em dashes in new UI strings.
- `handoff/app/views-sessions.jsx` and `handoff/app/ui.jsx` — visual/interaction source for `MemoryReview`, `SuggestionCard`, `SuggestionEditor`, `EmptyState`, loading/error patterns, stamp/strike motion, and shared component semantics.
- `.agents/skills/frontend-handoff-contract/references/route-map.md` — already corrected by the orchestrator: `/campaigns/:id/memory/review` maps to `views-sessions.jsx` / `MemoryReview`.

### Handoff Checklist for Later Frontend Phases

- Fields/data per suggestion: content, type, importance, reason/why, related/touches, Scribe provenance/source session context.
- Actions per suggestion: `Accept as memory`, `Edit & accept`, `Dismiss`; dismissed suggestions remain client-side only and send no request.
- Editor state: card switches to an accent-bordered editor with textarea, `Save & accept as memory`, and `Cancel`; accepted edited content is the only content sent.
- Active memories section: heading with count, type flag, edited provenance when relevant, content, accepted/source metadata, related text, `Retire` action.
- Empty states: no pending suggestions shows `The margins are clean`; no active memories shows `No memories yet`.
- Layout: `/campaigns/:id/memory/review`, mid-width page, breadcrumb, kicker, H1 `The Scribe's margins`, subcopy with suggestion count, stacked suggestion cards, rule separator, active memories card, footer actions back to campaign and prepare next session.
- Shared components: Shell/AppHeader layout, EntityNav, Kicker styling, EmptyState, LoadingScribe if the route fetches data, Notice/ErrorNotice, OriginBadge, Button, Textarea, optional Toast/Notice equivalent for feedback.
- Motion: route `.ll-view-enter`, accept stamp `.ll-stamp` (`★ Accepted`), dismiss strike `.ll-strike` plus slide/collapse, button press physics, reduced-motion and `data-motion` compliance.
- Localization: production copy must live in EN/ES messages and use locale-aware `Link`/`router`; Spanish should use `Dungeon Master`/`DM`; do not introduce em dashes in new UI copy.

### Approaches

1. **Carry suggestions in TanStack Query cache** — on `registerSession` success, call `queryClient.setQueryData(['campaign', id, 'memory-review-draft'], response)` and navigate to `/memory/review`.
   - Pros: truly in-memory, no browser storage of raw suggestions, matches existing data layer.
   - Cons: suggestions disappear on refresh; direct route visits always empty; page tests need QueryClient plumbing; no cross-tab recovery.
   - Effort: Low.

2. **Carry suggestions in scoped `sessionStorage`** — on `registerSession` success, store `{campaign_id, session_id, session_number, memory_suggestions}` under a Block 7b key, navigate to `/memory/review`, and clear it when review is completed or obsolete.
   - Pros: proven project precedent (`campaign-extraction-draft`), survives refresh in the same tab, no server persistence, works with Next App Router which has no route-state API, keeps direct visits empty when no scoped draft exists.
   - Cons: raw suggestions exist temporarily in browser storage; must validate with Zod on read, scope by campaign/session, and clear aggressively so stale suggestions do not appear later.
   - Effort: Medium.

3. **Persist suggestion drafts server-side** — create a temporary suggestions table or draft endpoint.
   - Pros: robust refresh/deep-link recovery and multi-device continuity.
   - Cons: contradicts the transient-suggestion architecture, adds schema/RLS surface, and risks making unaccepted AI proposals feel canonical.
   - Effort: High.

4. **Retire via `PATCH status=archived`** — archive active MemoryFacts using the existing `memory_status` enum and API contract.
   - Pros: aligns with docs, preserves auditability, lets future generation filter `status='active'`, and matches handoff language (`Retire`) better than destructive deletion.
   - Cons: requires read/list queries to filter active by default.
   - Effort: Low.

5. **Retire via `DELETE`** — remove MemoryFacts from the database.
   - Pros: simpler visible list behavior.
   - Cons: loses narrative audit trail, fights the existing `archived` enum/API contract, and makes accidental retire harder to reason about.
   - Effort: Low.

### Recommendation

Use **scoped `sessionStorage` for the transient review handoff** and **PATCH-to-archive for retire**.

The sessionStorage handoff is the best fit for this codebase because the app already uses client-side sessionStorage to bridge a stateless AI proposal flow (`/campaigns/new` to `/campaigns/new/review`), Next App Router does not provide durable navigation state, and TanStack Query cache would drop suggestions on refresh. Treat the storage as non-canonical browser handoff only: validate on read, include `campaign_id`, `session_id`, and `session_number`, clear after all suggestions are accepted/dismissed or when a different campaign/session is opened, and never send dismissed suggestions to the backend.

Backend should build a full `memory` module mirroring sessions/campaigns. Required endpoints should include the documented `POST /campaigns/{campaign_id}/memory-facts` and `PATCH /memory-facts/{memory_fact_id}` plus a small read endpoint needed by the UI, preferably `GET /campaigns/{campaign_id}/memory-facts?status=active` (or an equivalent active-only route documented in the spec). `POST` must perform a campaign ownership pre-check before insert; if `source_session_id` is supplied, the existing composite FK ensures it belongs to the same campaign. `PATCH` should validate non-empty updates, permit `content` and/or `status`, map RLS misses to 404, and use `status='archived'` for Retire.

### Risks

- Stale client-side suggestion drafts could surface after navigating away unless the storage key is campaign/session-scoped and cleared after review.
- A direct visit or refresh after storage is cleared has no pending suggestions; the empty state must be intentional and tested.
- The active-memory list needs a read contract not currently present in `docs/06-api-contracts.md`; later phases should explicitly add it to the SDD spec rather than smuggling it into implementation.
- `memory_facts.status` is nullable in the DDL; create use case must explicitly set `active`, and active reads/generation must filter `status='active'`.
- `source_session_id` is nullable but, when present, must be same-campaign; tests should prove the composite FK rejects cross-campaign session ids.
- Existing production and tests assert navigation to campaign detail after session save; strict TDD means Block 7b must first update/add failing tests for navigation to review with carried suggestions.
- Frontend motion details (stamp/strike) and state enumeration are easy to underbuild; the handoff compliance checklist must be injected into spec/design/tasks.
- Backend verification should mirror CI exactly: `uv run ruff check app/ tests/`, `uv run ruff format --check app/ tests/`, `uv run mypy app/ --ignore-missing-imports`, and `uv run pytest -m "not dev_inference"` from `services/api/`.

### Ready for Proposal

Yes. The proposal should frame Block 7b as the DM-controlled conversion of transient Scribe suggestions into active MemoryFacts, with no migrations for `memory_facts`, a new memory module plus active read endpoint, scoped browser handoff for suggestions, PATCH-based retirement, and strict TDD across backend ownership/RLS and frontend handoff states.
