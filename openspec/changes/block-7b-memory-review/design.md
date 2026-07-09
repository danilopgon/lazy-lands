# Design: Block 7b Memory Review

## Technical Approach

Implement a full-stack review loop where Block 7a's transient `memory_suggestions` are carried from session logging to `/campaigns/[id]/memory/review`, and only DM-accepted content becomes `memory_facts`. Backend work builds `services/api/app/modules/memory/**` using the existing sessions/campaigns Clean Architecture shape: api schemas/routes → application commands/queries/read models → domain ports/enums → Supabase infrastructure. No schema migration is required; `memory_facts` already has owner-scoped RLS and the `(campaign_id, source_session_id)` composite FK.

## Architecture Decisions

| Decision | Choice | Alternatives considered | Rationale |
|---|---|---|---|
| Transient suggestion handoff | Store a scoped, Zod-validated `sessionStorage` draft keyed by campaign and session, clear after completion/stale mismatch | TanStack Query cache; server-side draft persistence | Matches existing client draft precedent, survives same-tab refresh, avoids making Scribe proposals canonical. |
| Retire behavior | `PATCH /memory-facts/{id}` with `status=archived` | DELETE | Preserves audit trail and uses existing `memory_status`; active reads filter `status=active`. |
| Active read endpoint | Add `GET /campaigns/{campaign_id}/memory-facts?status=active` | Frontend-only placeholder; overloading campaign detail | Review and campaign detail both need live active memories; docs lack this, so design it explicitly. |
| Ownership model | App-layer campaign visibility pre-check plus caller-scoped Supabase/RLS | RLS-only | Existing sessions/campaigns pattern gives deterministic 404s and RLS remains the security backstop. |
| UI composition | New route component plus small `MemoryReview*` children, not a boolean-heavy monolith | One large mode-driven component | Keeps suggestion card, editor, active list, and storage concerns isolated and testable. |

## Data Flow

```text
LogSessionForm ─POST /sessions─> RegisterSessionResponse(memory_suggestions)
      │
      ├─ validate + sessionStorage draft ──> router.push(/memory/review)
      ▼
MemoryReview route ─GET active facts─> memory module ─RLS─> memory_facts
      │
      ├─ Accept/Edit ─POST /campaigns/{id}/memory-facts(status=active)
      ├─ Dismiss ─client removal only
      └─ Retire ─PATCH /memory-facts/{id} status=archived
```

## File Changes

| File | Action | Description |
|---|---|---|
| `services/api/app/modules/memory/**` | Create | Domain enums/ports, contracts/read models, create/list/update use cases, repository, routes, dependencies, handlers, schemas. |
| `services/api/app/main.py` | Modify | Include memory router and exception handlers. |
| `docs/06-api-contracts.md` | Modify | Document `GET /campaigns/{campaign_id}/memory-facts?status=active`. |
| `apps/web/lib/memory/{schemas,api}.ts` | Create | Zod contracts and API client for create/list/update. |
| `apps/web/lib/sessions/memory-review-draft.ts` | Create | Versioned, campaign/session-scoped `sessionStorage` read/write/clear helpers. |
| `apps/web/components/sessions/log-session-form.tsx` | Modify | Store validated draft on success and navigate to review. |
| `apps/web/app/[locale]/campaigns/[id]/memory/review/page.tsx` | Create | Handoff-aligned review screen. |
| `apps/web/components/campaigns/{campaign-detail-view,entity-nav}.tsx` | Modify | Live active memories and Memory nav item. |
| `apps/web/messages/{en,es}.json` | Modify | Add all UI strings; no hard-coded copy or em dashes. |
| Tests under `services/api/tests/memory/**`, `services/api/tests/test_rls.py`, `apps/web/**/__tests__/**` | Create/Modify | Strict TDD coverage. |

## Interfaces / Contracts

- Create: `POST /campaigns/{campaign_id}/memory-facts` body `{source_session_id?, content, type, importance}` returns full persisted fact or `{id,status}` compatible with docs; application always sets `status='active'`.
- List: `GET /campaigns/{campaign_id}/memory-facts?status=active` returns ordered `MemoryFactResponse[]` with `id,campaign_id,source_session_id,content,type,importance,status,created_at,updated_at`.
- Patch: `PATCH /memory-facts/{memory_fact_id}` accepts non-empty `{content?, status?}` with status limited to `active|archived`.
- Draft storage: `{version:1,campaign_id,session_id,session_number,memory_suggestions}` validated on read; invalid or mismatched drafts are cleared.

## Handoff Acceptance Notes

The route must use AppHeader/EntityNav and shared `button`, `textarea`, `empty-state`, `loading-scribe`, `notice`, `origin-badge`. It must render suggestion origin/source, type, importance, content, why/reason, related/touches; Accept, Edit & accept, Dismiss; editor textarea seeded from suggestion; active-memory count/help, rows with type, edited marker, accepted/source metadata, related, Retire. States: loading, backend error/retry, empty pending suggestions, empty active memories, success feedback, busy disabled controls. Motion: `.ll-stamp`, `.ll-strike`/slide-out, button press physics, route/section entrance, reduced-motion and `data-motion` compliance.

## Testing Strategy

| Layer | What to Test | Approach |
|---|---|---|
| Backend unit/route | create/list/patch validation, 404 ownership misses, empty patch rejected, active filter excludes archived | Write failing pytest route/use-case tests with mocked per-user Supabase client first. |
| Backend RLS | owner can CRUD, foreign user cannot select/insert/update, composite FK rejects cross-campaign session | Extend local-stack opt-in RLS tests; no migration changes. |
| Frontend unit | draft storage validation/clearing, log-session success navigation, review actions, active list states, i18n | Vitest/RTL tests before implementation. |
| Frontend handoff | loading, error, empty, success, busy controls, stamp/strike hooks | Route/component tests plus required adversarial handoff self-review during apply. |

## Migration / Rollout

No migration required. Roll out by adding backend endpoints first, then frontend route/storage wiring. Existing accepted facts remain valid; rollback removes route/module registration without schema rollback.

## Open Questions

- None.
