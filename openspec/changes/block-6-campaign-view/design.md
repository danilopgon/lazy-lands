# Block 6 — Campaign View — Design (Architecture / HOW)

Status: **revised** for the owner-confirmed broadened scope (proposal `## Scope Amendment …
AUTHORITATIVE`). Scope now covers: full **CRUD** (create + edit + delete) for NPCs, factions,
and **arcs**; an arcs route/screen; **two data-touching migrations** (campaign `system`/`tone`
columns; `arc_status` enum reconciliation); the `/dashboard` list, campaign detail with
system/tone + dimmed Block-7 placeholders + live world-state + live arcs; and the reusable
`Field`/`Modal` primitives. No task checklist, no implementation code. Depends on Block 5
(per-user Supabase client, error mapping, `apiFetch`, schema-split, RLS). Reads proposal
`sdd/block-6-campaign-view/proposal`.

The first design pass' core decisions (Decisions 1–3 pattern, ADR-05 placement, 404-on-RLS-miss,
frozen-model write DTOs, hand-rolled Modal, TanStack Query) are **LOCKED**. This revision
**extends** them to cover create/delete and the two migrations; it does not reopen them.

Backend architecture follows ADR-05 (Modular Monolith with nested Clean/Hexagonal layers per
module); all code lives inside the existing `app/modules/campaigns/` module.

---

## 0. Constraints verified against source (not assumed)

| Constraint | Source checked | Result |
| --- | --- | --- |
| RLS coverage for all four verbs | `supabase/migrations/20260628101707_initial_schema.sql` | All 6 tables have SELECT/INSERT/UPDATE/DELETE policies. `campaigns` keys off `user_id = auth.uid()`; `npcs`/`factions`/`arcs` key off an `exists(select 1 from campaigns where campaigns.id = <child>.campaign_id and campaigns.user_id = auth.uid())` subquery — for **all four verbs** including INSERT (`with check`) and DELETE (`using`). **CRUD is fully covered by existing RLS — NO new policy needed** (locked "no new policy" holds; A1 confirmed against source). |
| **RLS failure semantics differ by verb** (advisor-flagged) | same migration + PostgREST/Postgres behavior | **SELECT/UPDATE/DELETE** against a non-owned row → `using` qual filters it → **zero rows, no error** → 404 (the locked pattern). **INSERT** with a forged/non-owned `campaign_id` → the `with check` **raises** (Postgres `42501`, "new row violates row-level security policy") → NOT empty rows. Create paths therefore need a distinct ownership guard (Decision 6.4), not the empty-rows→404 signal. |
| `campaigns` columns (for `system`/`tone` migration) | same migration lines 38–48 | `campaigns(id, user_id, title NOT NULL, description?, world_state?, accumulated_summary?, summarized_up_to_session?, created_at, updated_at)`. **No `system`, `tone`, or `status` column exists** → Migration A adds `system`/`tone` (additive). `status` stays out (A3/A7). |
| `arc_status` enum current values | same migration line 28 + `domain/enums.py` | Postgres enum `arc_status = ('open','resolved','dropped')`; `ArcStatus` mirror = `open/resolved/dropped`. Handoff wants `active/dormant/resolved/discarded` → Migration B reconciles (Decision 9). |
| `arcs` table columns | same migration lines 92–101 | `arcs(id, campaign_id, title NOT NULL, description?, status arc_status?, priority priority?, created_at, updated_at)`. Note: `arcs` has **no `content_source` column** in the base migration, but `test_schema.py:104,116` and `repository.py:99` reference/insert `content_source` on arcs — a later migration added it. Design treats `arcs.content_source` as present (confirm the actual live column set at apply time; if absent, drop it from arc create — see risk #7). |
| Arc-status touchpoints (for Migration B) | grep across `services/api` | Enumerated in Decision 9: Postgres enum, `domain/enums.py::ArcStatus`, `repository.py:98` (`insert_arcs` default `open`), manual-create default, `test_repository.py:86,97` (`status == "open"`), `test_schema.py:35` (`{"open","resolved","dropped"}`). Extraction output has **no** `status` (`ExtractedArc`, CP-003) — status is persistence-assigned only, so extraction is untouched by Migration B. |
| Block-5 create path (must stay byte-identical) | `apps/web/app/campaigns/new/page.tsx:34–46`, `routes.py`, `schemas.py`, `repository.py:29–50` | `composeRawText` folds name/system/tone/premise/details into `raw_text`; `POST /campaigns/extract` receives only `raw_text`; `POST /campaigns` receives `CreateCampaignRequest` (no system/tone today). Migration A threads system/tone **alongside** the unchanged fold — see Decision 8. |
| Frozen domain models not in write path | `create_campaign.py`, `repository.py`, `domain/models.py`/`arc.py` | Writes flow DTO → repo → `dict` → Supabase. Frozen `Campaign`/`NPC`/`Faction`/`Arc` are a compatibility barrel, **not** in any write path. Locked Decision 1 pattern extends unchanged to create/delete. |
| Frontend data pattern | `campaigns/new/review/page.tsx`, `lib/api.ts`, `lib/campaigns/api.ts`, `providers.tsx` | Client components + **TanStack Query** (`@tanstack/react-query` confirmed dep; `QueryClientProvider` in `providers.tsx`) + `apiFetch` (injects Supabase JWT client-side). No server-component data fetching. |
| Radix Dialog available | `apps/web/package.json` | `@radix-ui/react-dialog` NOT present → `Modal` is hand-rolled with explicit a11y (locked). |

---

## Decision 1 — Frozen-model write pattern: **Create/Update DTO + repository method** (LOCKED; extended to create/delete)

**Chosen (locked):** dedicated mutable `Create*Request` / `Update*Request` DTOs at the HTTP
boundary + repository `create_*` / `update_*` / `delete_*` methods that translate DTO → `dict` →
Supabase. The write path never hydrates the frozen domain models, so `frozen=True` is irrelevant
to mutation and `model_copy(update=…)` is unneeded (rationale unchanged from the first pass).

**Extension for A1 (create/delete):** the same seam carries manual creation and hard delete. New
repository methods return the affected row(s) as raw `dict` (or a boolean for delete) so the use
case can map "no row" to 404 (for delete/update) — see Decisions 3 and 6.

Locked update DTO shape (unchanged) plus the new `system`/`tone` on campaign update (Decision 8):

```python
class UpdateNpcRequest(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    current_state: str | None = Field(default=None, min_length=1, max_length=1000)
    motivation: str | None = Field(default=None, min_length=1, max_length=1000)

class UpdateFactionRequest(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    current_stance: str | None = Field(default=None, min_length=1, max_length=1000)
    goals: str | None = Field(default=None, min_length=1, max_length=1000)
```

> Null-wipe guard (locked): use cases build the write dict from
> `model_dump(exclude_unset=True, exclude_none=True)`; an explicit JSON `null` is dropped, and
> `min_length=1` means a supplied field can never blank a kept value.

---

## Decision 2 — PATCH semantics: **partial (only supplied fields)** + reject empty patch with **422** (LOCKED; extended to arcs + campaign system/tone)

- **Partial** for every entity PATCH: only keys present in the body are written; an empty object
  `{}` → the use case raises **422** ("At least one field is required.") after
  `model_dump(exclude_unset=True)` is empty. Explicit contract, not a silent 200 no-op (locked).
- Field bounds reused verbatim from the Block-5 `Create*Request` contract (name/title ≤ 200;
  current_state/motivation/current_stance/goals ≤ 1000; description ≤ 4000; world_state ≤ 4000;
  `min_length=1` whenever a field is present).
- **`UpdateArcRequest`** (new, same pattern): `title? (≤200)`, `description? (≤4000)`,
  `priority? (Priority)`, `status? (ArcStatus)`. Empty → 422.
- **`UpdateCampaignRequest` — authorized extension of A3 (NOT a relitigation of the locked
  world_state-overwrite decision).** The first pass had a single required `world_state`. A3
  makes `system`/`tone` editable via `PATCH /campaigns/{id}`, so the DTO becomes **partial**
  (all optional, empty → 422), aligning campaign with the npc/faction/arc pattern. World-state
  **overwrite semantics survive**: when `world_state` is supplied it plainly overwrites (free
  text, `min_length=1`, `max_length=4000`); it is simply now one of three optional keys.

```python
class UpdateCampaignRequest(BaseModel):
    world_state: str | None = Field(default=None, min_length=1, max_length=4000)
    system: str | None = Field(default=None, min_length=1, max_length=200)
    tone: str | None = Field(default=None, min_length=1, max_length=200)  # see Decision 8 note on clearing
```

Write-dict construction (in the use case, not the route) — unchanged from locked:

```python
changes = payload.model_dump(exclude_unset=True, exclude_none=True)
if not changes:
    raise CampaignValidationError("At least one field is required.")
updated = self._repository.update_npc(npc_id, changes)  # None -> not found -> 404
```

---

## Decision 3 — RLS not-found-vs-forbidden: **404 on RLS miss** (LOCKED; extended, with the INSERT caveat)

**404-on-RLS-miss is uniform across every Block 6 endpoint** — never 403 (returning 403 confirms
existence and enables id enumeration; 404 leaks nothing). Establishes the binding convention for
all future read/edit/delete endpoints.

How "no row" is detected, **by verb** (advisor-flagged — the failure surface is not uniform):

| Verb | RLS-miss behavior | Repo signal | HTTP |
| --- | --- | --- | --- |
| `GET /{id}` (SELECT) | filtered, no error | `data == []` → return `None` | 404 |
| `GET` (list SELECT) | filtered, no error | `data` (possibly `[]`) | 200 `[]` (empty list is valid, not 404) |
| `PATCH /{id}` (UPDATE) | filtered, no error | `data == []` → return `None` | 404 |
| `DELETE /{id}` (DELETE) | filtered, no error | `data == []` → return `False` | 404 |
| `POST` (INSERT, forged parent `campaign_id`) | **`with check` raises `42501`** — NOT empty rows | ownership pre-check (Decision 6.4) returns `None` → 404 before insert | 404 |

The INSERT row is the important divergence: a create with a `campaign_id` the caller does not own
does **not** return empty rows — it raises, and would otherwise be caught as a generic
`RepositoryError` → 500. Decision 6.4 defines the deterministic 404 path for create.

Module-local exception + handler (locked, colocated in `campaigns`):

```python
class CampaignNotFoundError(Exception):
    """Raised when a targeted resource returns no rows under the caller's RLS scope."""

async def campaign_not_found_error_handler(_req, _exc) -> JSONResponse:
    return JSONResponse(status_code=404, content={"error": "Not found."})
```

Registered in `app/main.py`. `CampaignValidationError` (empty patch) → 422 (recommend distinct
422 to match "unprocessable input" already used for LLM validation).

---

## Decision 4 — Backend placement (ADR-05, existing folder conventions) — extended for CRUD + arcs

All under `services/api/app/modules/campaigns/`.

### 4.1 `domain/ports.py` — extend the `CampaignRepository` Protocol

Add reads, updates, creates, deletes, and arcs (still a Protocol; the application layer depends
on this, never on Supabase). Return raw `dict` rows / `bool` at the port boundary (consistent
with the existing `insert_campaign` returning `rows[0]["id"]`):

```python
# reads
def list_campaigns(self, user_id: str) -> list[dict]: ...
def get_campaign(self, campaign_id: str) -> dict | None: ...          # None -> 404 (also the create pre-check, 6.4)
def get_campaign_children(self, campaign_id: str) -> tuple[list[dict], list[dict], list[dict]]: ...  # (npcs, factions, arcs)  <-- arcs added

# updates (partial; None -> 404)
def update_campaign(self, campaign_id: str, changes: dict) -> dict | None: ...
def update_npc(self, npc_id: str, changes: dict) -> dict | None: ...
def update_faction(self, faction_id: str, changes: dict) -> dict | None: ...
def update_arc(self, arc_id: str, changes: dict) -> dict | None: ...

# creates (manual; content_source forced 'manual' by the schema/use case; return the inserted row)
def create_npc(self, data: dict) -> dict: ...
def create_faction(self, data: dict) -> dict: ...
def create_arc(self, data: dict) -> dict: ...

# deletes (hard delete under RLS; False -> 404)
def delete_npc(self, npc_id: str) -> bool: ...
def delete_faction(self, faction_id: str) -> bool: ...
def delete_arc(self, arc_id: str) -> bool: ...
```

The existing `insert_campaign` / `insert_npcs` / `insert_factions` / `insert_arcs` /
`delete_campaign` (Block-5 bulk extraction-persistence path) are **unchanged in signature** —
Decision 8 only adds two keys to the `insert_campaign` dict. Reads deliberately do NOT hydrate
frozen domain models (no `id` on them; no consumer).

### 4.2 `application/` — one use case per file (matches `create_campaign.py` / `extract_campaign.py`)

- Reads: `get_campaigns.py` → `GetCampaigns`; `get_campaign_detail.py` → `GetCampaignDetail`
  (campaign + npcs + factions + **arcs**; 404 if campaign row absent under RLS).
- Updates: `update_campaign.py` (world_state/system/tone), `update_npc.py`, `update_faction.py`,
  `update_arc.py` — each owns the `exclude_unset`/empty-guard and `None`→404 translation.
- Creates: `create_npc.py`, `create_faction.py`, `create_arc.py` — each forces
  `content_source = manual`, applies the ownership pre-check (6.4), sets arc default
  `status = active` (post-Migration-B), and returns the created row.
- Deletes: `delete_npc.py`, `delete_faction.py`, `delete_arc.py` — each maps repo `False` → 404.

Each is repository-only (no LLM), constructed with the `CampaignRepository` Protocol.

### 4.3 `infrastructure/repository.py` — add methods to `SupabaseCampaignRepository`

- Reads: `.select(...).eq("id", id).execute()` (list: no `.eq`, RLS scopes to owner). Return
  `response.data` or `data[0] if data else None`. Detail children: three `.select().eq(
  "campaign_id", id)` calls (npcs, factions, arcs).
- Updates: `.update(changes).eq("id", id).execute()`; **`response.data == []` ⇒ RLS miss ⇒
  return `None`**.
- Creates: `.insert(row).execute()`; return `response.data[0]`. A forged-parent insert **raises**
  (`42501`) — but the use case's pre-check (6.4) has already returned 404, so this path is a
  backstop; still wrap raw exceptions in `RepositoryError`.
- Deletes: `.delete().eq("id", id).execute()`; **`response.data == []` ⇒ RLS miss ⇒ return
  `False`**; non-empty ⇒ `True`. (Distinct from Block-5's fire-and-forget `delete_campaign`,
  which ignores the return because it is a compensating cleanup. New deletes are user-initiated
  and must 404 on miss. **The "delete returns the deleted rows" assumption is pinned by a
  real-client RLS test — see §7.**)
- Wrap raw client exceptions in `RepositoryError` exactly as the existing `_write` helpers do.
- **Per-user client only** — never `get_supabase_client()` (service-role). Ownership is enforced
  entirely by RLS through the injected client (PU-003, NFR-CP-1).

### 4.4 `schemas.py` — new response + create + update schemas

**Response models** carry `id` and reflect nullable columns. Campaign responses gain
`system`/`tone` (Migration A); detail gains `arcs`:

```python
class NpcResponse(BaseModel):
    id: str; name: str
    description: str | None = None
    current_state: str | None = None
    motivation: str | None = None
    content_source: ContentSource | None = None

class FactionResponse(BaseModel):
    id: str; name: str
    description: str | None = None
    current_stance: str | None = None
    goals: str | None = None
    content_source: ContentSource | None = None

class ArcResponse(BaseModel):
    id: str; title: str
    description: str | None = None
    priority: Priority | None = None
    status: ArcStatus | None = None            # stable code; UI maps to a label (Decision 9)
    content_source: ContentSource | None = None

class CampaignSummary(BaseModel):              # GET /campaigns item
    id: str; title: str
    description: str | None = None
    system: str | None = None                  # Migration A — enables handoff card kicker
    tone: str | None = None

class CampaignDetailResponse(BaseModel):       # GET /campaigns/{id}
    id: str; title: str
    description: str | None = None
    world_state: str | None = None
    system: str | None = None                  # Migration A
    tone: str | None = None                    # Migration A
    npcs: list[NpcResponse] = Field(default_factory=list)
    factions: list[FactionResponse] = Field(default_factory=list)
    arcs: list[ArcResponse] = Field(default_factory=list)   # /03 is live (A5)
```

**Manual-create schemas** — deliberately **separate** from the strict extraction
`Create*Request` (which forces description/current_state/motivation `min_length=1` for LLM
output). Manual create mirrors the **nullable** columns: only name/title required; the rest
optional. `content_source` is **forced `manual` server-side** (mirroring how
`ScribeExtractedModel` forces `llm`) — never trusted from the client:

```python
class CreateNpcInput(BaseModel):
    campaign_id: str
    name: str = Field(min_length=1, max_length=200)
    description: str | None = Field(default=None, min_length=1, max_length=4000)
    current_state: str | None = Field(default=None, min_length=1, max_length=1000)
    motivation: str | None = Field(default=None, min_length=1, max_length=1000)
    # content_source NOT accepted from client; use case sets ContentSource.manual

class CreateFactionInput(BaseModel):
    campaign_id: str
    name: str = Field(min_length=1, max_length=200)
    description: str | None = Field(default=None, min_length=1, max_length=4000)
    current_stance: str | None = Field(default=None, min_length=1, max_length=1000)
    goals: str | None = Field(default=None, min_length=1, max_length=1000)

class CreateArcInput(BaseModel):
    campaign_id: str
    title: str = Field(min_length=1, max_length=200)
    description: str | None = Field(default=None, min_length=1, max_length=4000)
    priority: Priority = Priority.medium
    status: ArcStatus = ArcStatus.active          # post-Migration-B default
```

`GET /campaigns` returns `list[CampaignSummary]`. PATCH/POST endpoints return the affected
resource so the frontend can reconcile without a refetch (mutations `setQueryData`/invalidate).

### 4.5 `routes.py` — the campaigns router + three entity routers (flat, RLS-scoped)

- Existing `router = APIRouter(prefix="/campaigns")` gains: `GET ""`, `GET "/{campaign_id}"`,
  `PATCH "/{campaign_id}"`.
- **Three flat top-level routers** (proposal endpoints are `/npcs`, `/factions`, `/arcs`, not
  nested — consistent with the locked `/npcs/{id}` PATCH choice):
  - `npcs_router` (`prefix="/npcs"`): `POST ""`, `PATCH "/{npc_id}"`, `DELETE "/{npc_id}"`.
  - `factions_router` (`prefix="/factions"`): `POST ""`, `PATCH "/{faction_id}"`, `DELETE "/{faction_id}"`.
  - `arcs_router` (`prefix="/arcs"`): `POST ""`, `PATCH "/{arc_id}"`, `DELETE "/{arc_id}"`.
  Creation takes `campaign_id` in the **request body** (flat routers, so it can't be a path
  param); RLS `with check` + the 6.4 pre-check enforce ownership. Register all four routers in
  `app/main.py`. They live in the campaigns module because they mutate campaign-owned entities.
- Every handler depends on `get_user_supabase_client` (+ `get_auth_context` where a user id is
  needed, e.g. list). Blocking Supabase calls run through `run_in_threadpool`, matching
  `create_campaign`.

### 4.6 Error mapping reuse

- `CampaignNotFoundError` → 404 (new). `CampaignValidationError` (empty patch) → 422. Pydantic
  request-validation → FastAPI native 422, already handled by
  `lib/campaigns/api.ts::extractErrorMessage`.

---

## Decision 5 — Frontend architecture — extended for arcs + full CRUD

### 5.1 Data-fetching pattern (LOCKED) — client components + TanStack Query + `apiFetch`

- List: `useQuery({ queryKey: ['campaigns'], queryFn: getCampaigns })`.
- Detail (and the npcs/factions/arcs routes): `useQuery({ queryKey: ['campaign', id], queryFn:
  () => getCampaignDetail(id) })`. The child-entity routes **reuse the same detail query** (it
  returns npcs+factions+arcs) and slice client-side — one endpoint, shared cache key.
- Mutations: `useMutation` per action (create/update/delete for each entity + world-state/
  system/tone), `onSuccess` → `queryClient.invalidateQueries({ queryKey: ['campaign', id] })`
  (and `['campaigns']` when a summary field like title/system/tone changed). Mirrors the
  `useMutation` usage already in `campaigns/new/review/page.tsx`.

New API-client functions in `lib/campaigns/api.ts` (extend the existing file), each using
`apiFetch`, checking `response.ok`, throwing `CampaignApiError(await extractErrorMessage(...))`,
and parsing with a Zod schema (new schemas under `lib/campaigns/schemas/`):
`getCampaigns`, `getCampaignDetail(id)`, `updateCampaign(id, patch)` (world_state/system/tone),
`createNpc/updateNpc/deleteNpc`, `createFaction/updateFaction/deleteFaction`,
`createArc/updateArc/deleteArc`. A 404 surfaces as a `CampaignApiError` the container maps to a
"not found" screen.

### 5.2 Route / component tree (container–presentational split)

```
app/dashboard/page.tsx                 (container: useQuery list)  -> replaces placeholder
  └─ CampaignList / CampaignCard        (presentational; card shows title/description/system/tone)
app/campaigns/[id]/page.tsx            (container: useQuery detail)
  └─ CampaignDetailView                 (system/tone kicker; live world-state editor; live arcs summary/links;
                                          dimmed Block-7 placeholder cards for /02 sessions + /04 memories)
     ├─ WorldStateEditor                (inline view→edit→Save/Cancel, plain overwrite)
app/campaigns/[id]/npcs/page.tsx       (container: useQuery detail, slice npcs)
  └─ NpcList / NpcRow + NpcModal        (add + edit; uses Field + Modal) + delete confirm
app/campaigns/[id]/factions/page.tsx   (container: useQuery detail, slice factions)
  └─ FactionList / FactionRow + FactionModal (add + edit) + delete confirm
app/campaigns/[id]/arcs/page.tsx       (container: useQuery detail, slice arcs)   <-- NEW (A2)
  └─ ArcList / ArcRow + ArcModal        (add + edit; status/priority filter) + delete confirm
```

Containers own data + mutation state; presentational components take plain props. Entity modals
receive the current entity (or empty for add) + `onSave(payload)`; the container issues the
POST/PATCH. Delete uses a confirm affordance (a small confirm inside `Modal` or a native confirm —
recommend a `Modal`-based confirm for token/a11y consistency).

### 5.3 New primitives (built first, per handoff-first contract) — LOCKED

**`components/ui/field.tsx`** — label + control + help/error wrapper (handoff `Field`): renders
`ll-label` (mono, uppercase) with `· optional` suffix; error supersedes help; associates
`htmlFor`/`id`, sets `aria-describedby`, error node `role="alert"`. Composition (control as
`children`), not boolean proliferation.

**`components/ui/modal.tsx`** — hand-rolled dialog (Radix unavailable), composition API
(`title`, `onClose`, `footer?`, `children`). A11y (named deliverable, not deferred):
`role="dialog"` + `aria-modal="true"` + `aria-labelledby`; **focus trap** (focus in on open,
`Tab`/`Shift+Tab` cycle, **return focus to the invoking trigger on close**); **Escape** closes;
**backdrop mousedown** (target === overlay) closes, inner clicks do not; body-scroll lock;
portal render; respects `prefers-reduced-motion`. Reused by every entity modal + the delete
confirm. Public API is Radix-swappable later without touching call sites.

### 5.4 State handling (enumerated per screen — states are the most-missed category)

| Screen | loading | error | empty | success |
| --- | --- | --- | --- | --- |
| `/dashboard` | `LoadingScribe` takeover | `Notice variant="error"` + retry | `EmptyState` "Your chronicle starts here" + CTA → `/campaigns/new` | `CampaignCard` grid + client-side search (`X of Y`) |
| `/campaigns/[id]` | `LoadingScribe` | error + retry; **404 → not-found state** | n/a (campaign always has fields; empty world_state → muted prompt) | detail + inline `WorldStateEditor`; dimmed Block-7 placeholder cards; live arcs summary |
| `/campaigns/[id]/npcs` | `LoadingScribe` | error + retry; 404 → not-found | `EmptyState` "No NPCs yet" **+ "+ New NPC" CTA** (creation now in scope) | `NpcRow` list; `Edit` / `Delete` / `+ New NPC` open `NpcModal` |
| `/campaigns/[id]/factions` | `LoadingScribe` | error + retry; 404 → not-found | `EmptyState` "No factions yet" + "+ New faction" CTA | `FactionRow` list; `Edit`/`Delete`/`+ New` |
| `/campaigns/[id]/arcs` | `LoadingScribe` | error + retry; 404 → not-found | `EmptyState` "No arcs here" + "+ Add an arc" CTA | `ArcRow` list + status filter bar (All/Active/Dormant/Resolved/Discarded); `Edit`/`Delete`/`+ New arc` |

Per-mutation states (create/edit/delete): **pending** (disable action, "Saving…"/"Deleting…"),
**error** (inline in the modal footer / row — do NOT close the modal on failure), **success**
(close modal / exit inline edit, then invalidate-refetch or `setQueryData`).

### 5.5 Motion (consistent with handoff / DESIGN.md §7, gated by `data-motion`)

Route enter `.ll-view-enter`; button press physics via the existing `Button`; `LoadingScribe`
quill takeover; modal entrance rise/fade respecting `prefers-reduced-motion` /
`data-motion="off"|"subtle"`. No stamp/strike here (memory-review moments, out of scope).

---

## Decision 6 — Full CRUD create/delete design (A1)

### 6.1 Create — manual, DM-authored
Create is the DM manually adding an NPC/faction/arc (distinct from Block-5 extraction, which
bulk-inserts LLM output through `insert_*`). Manual creates use the separate `Create*Input`
schemas (Decision 4.4), force `content_source = manual`, and go through new `create_*` repo
methods that return the inserted row (so the modal closes with the real `id` and provenance).

### 6.2 Delete — hard delete under RLS
Hard delete (`.delete().eq("id", id)`). No soft-delete column exists and none is in scope.
`response.data == []` ⇒ RLS miss ⇒ `False` ⇒ 404 (Decision 3). Arcs/npcs/factions have no
children of their own, so cascade is a non-issue.

### 6.3 Delete confirmation (frontend)
Destructive; guard with a `Modal`-based confirm ("Remove this NPC? This can't be undone.").
Presentation only — the backend just hard-deletes.

### 6.4 Create ownership pre-check — the INSERT-RLS divergence (advisor-flagged, load-bearing)
An INSERT with a `campaign_id` the caller does not own does **not** return empty rows — the RLS
`with check` **raises `42501`**. To keep the uniform 404-on-miss contract deterministic (not a
500 from a caught `RepositoryError`, and without parsing DB error strings), each create use case
**pre-checks parent visibility** using the already-built `get_campaign(campaign_id)`:

```python
# create_npc.py (same shape for faction/arc)
if self._repository.get_campaign(payload.campaign_id) is None:   # RLS SELECT miss -> not visible
    raise CampaignNotFoundError()                                # -> 404, no existence leak
row = self._repository.create_npc({**manual_fields, "content_source": "manual"})
return NpcResponse(**row)
```

RLS `with check` still backstops the insert (defense in depth), but the 404 decision is made by
the pre-check. **The create security test asserts the pre-check/raise path (forged parent → 404),
NOT an empty-rows path.**

---

## Decision 7 — Arcs full stack (A2)

- **Backend:** arcs join reads (detail `arcs` list), `POST /arcs`, `PATCH /arcs/{id}`,
  `DELETE /arcs/{id}` — same patterns as npcs/factions. `ArcResponse` returns the stable
  `status` code; `CreateArcInput`/`UpdateArcInput` accept `priority`/`status` codes.
- **Frontend:** `/campaigns/[id]/arcs` (`ArcList`, `ArcRow`, `ArcModal`) per handoff
  `views-arcs.jsx`. **Reduced fields (A2):** `title`, `description`, `priority`, `status` only.
- **Status display map lives in the presentation layer** (never stored): `active→"Active"`,
  `dormant→"Dormant"`, `resolved→"Resolved"`, `discarded→"Discarded"` (frontend). Same idea for
  any backend serialization that needs a label. The DB and API traffic stable lowercase codes.
- **Handoff element classification (per handoff-contract, nothing left unlabeled):**
  - `title`, `description`, `priority`, `status` → **in scope**.
  - Inline **Resolve / Discard / Reopen** quick-actions (`patch(a.id, {status})`) → **in scope**
    as thin status-only `PATCH /arcs/{id}` calls (they map cleanly to the status field).
  - `npcs` / `factions` cross-reference fields → **Out of MVP** (Relationship graph; A2/A7).
  - `lastSession` → **Block 7** (sessions).
  - "Include in next session generation" checkbox → **Block 7** (generation).

---

## Decision 8 — Migration A: campaign `system` + `tone` (ADDITIVE; must not break Block 5)

### 8.1 Migration shape
```sql
-- <timestamp>_add_campaign_system_tone.sql
alter table campaigns add column system text;
alter table campaigns add column tone   text;
```
**Nullability + backfill — recommendation: both `text` NULL, no default, no backfill.**
Justification: existing campaigns genuinely have no structured system/tone (they were folded
into `raw_text` at extraction time and never captured structurally), so `NULL` is the honest
representation; an empty-string default would fabricate data. `system` is required only at the
**API schema** layer for new campaigns (`CreateCampaignRequest.system`), **not** as a DB
`NOT NULL` — mirroring how `title` is `NOT NULL` but `description`/`world_state` are nullable, and
avoiding a constraint that would reject legacy rows or require a fake backfill. Additive, no RLS
change (the existing `campaigns_*` policies cover the whole row).

### 8.2 Create-path threading (the non-negotiable Block-5 guarantee)
**`composeRawText` (`apps/web/app/campaigns/new/page.tsx:34–46`) is untouched.** The extract
request body remains exactly `{ raw_text: composeRawText(data) }`, so the LLM input — and every
Block-5 extraction test (`test_routes_extract.py`, `test_extract_campaign.py`) — is
**byte-identical**. system/tone are DM-form fields, **not** LLM-extracted (they are not in
`ExtractCampaignOutput`).

To persist them structurally, thread them along the draft path (they are already captured on the
form):

1. **Frontend `/campaigns/new`:** keep folding into `raw_text`; **additionally** carry `system`
   + `tone` into the extraction draft (`saveExtractionDraft` payload) so the review screen has
   them. (This is a draft-shape addition, not a change to `composeRawText`.)
2. **Frontend review (`/campaigns/new/review`):** include `system` + `tone` in the
   `POST /campaigns` body (`CreateCampaignRequest`).
3. **Schema (`schemas.py::CreateCampaignRequest`):** add `system: str = Field(min_length=1,
   max_length=200)` (required, matching the form) and `tone: str | None = Field(default=None,
   min_length=1, max_length=200)` (optional).
4. **Repository (`repository.py::insert_campaign`, lines 29–50):** add `"system": data.system`
   and `"tone": data.tone` to the existing insert dict. **This is the only repo change** and it
   does not alter the returned `id` or the extraction flow.

**Consistency note (advisor-flagged):** Block-5 bounds only the *composed* premise length, not
system/tone per field. Pick a `max_length` that agrees between form and API — recommend adding a
matching per-field bound (e.g. `≤200`) to the `/campaigns/new` Zod schema (`system`, `tone`) so
the API `≤200` can never 422 a premise the form accepted. If a per-field form bound is undesirable,
keep the API bound generous (≥ the form's practical ceiling).

### 8.3 Editing / clearing
`PATCH /campaigns/{id}` edits system/tone (Decision 2). With the locked null-wipe guard
(`exclude_none`), an explicit `null` cannot blank a value; if "clear tone" is ever needed it must
be an explicit sentinel decision — **out of scope now**; document that tone is set-or-keep, not
clearable, in Block 6.

---

## Decision 9 — Migration B: `arc_status` enum reconciliation (data-aware, i18n-stable codes) (A4)

Target stable lowercase codes: **`active`, `dormant`, `resolved`, `discarded`**. Display labels
live only in the presentation layer (Decision 7).

### 9.1 Migration shape
```sql
-- <timestamp>_reconcile_arc_status.sql
alter type arc_status rename value 'open'    to 'active';
alter type arc_status rename value 'dropped' to 'discarded';
alter type arc_status add  value if not exists 'dormant';
```
**Backfill is IMPLICIT.** `ALTER TYPE … RENAME VALUE` is a metadata rename of the enum label —
every existing row already storing `open`/`dropped` **automatically** reads back as
`active`/`discarded` with no `UPDATE` statement. `resolved` is unchanged; `dormant` is net-new
(no existing rows use it). So A4's "backfill existing open rows → active" is satisfied by the
rename itself.

**Postgres constraints to respect:**
- `RENAME VALUE` is fully transactional and the renamed value is usable immediately.
- `ADD VALUE` inside a transaction is allowed on Postgres 12+ (the DB is Postgres 17 per the base
  migration header), **but the newly added value cannot be *used* in the same transaction**. The
  migration only *adds* `dormant`; it does not insert a `dormant` row, so a single-transaction
  migration file (Supabase CLI default) is safe. `if not exists` makes the add idempotent.

### 9.2 Touchpoints (every one enumerated — all Block-5 surface)
| # | Touchpoint | Change |
| --- | --- | --- |
| 1 | Postgres `arc_status` enum | rename `open→active`, `dropped→discarded`, add `dormant` (9.1) |
| 2 | `domain/enums.py::ArcStatus` | members become `active/dormant/resolved/discarded` (drop `open`/`dropped`) |
| 3 | `infrastructure/repository.py:98` (`insert_arcs` default) | `ArcStatus.open.value` → `ArcStatus.active.value` |
| 4 | Manual arc create default (`CreateArcInput.status`, Decision 4.4) | default `ArcStatus.active` |
| 5 | Extraction→persistence default | still persistence-assigned (`ExtractedArc` has no `status`, CP-003) — now `active`; extraction output itself is unchanged |
| 6 | `tests/campaigns/test_repository.py:86,97` | rename test + assert `status == "active"` |
| 7 | `tests/test_schema.py:35` | `"arc_status": {"active","dormant","resolved","discarded"}` |
| 8 | `domain/arc.py::Arc.status` typing | unchanged (still `ArcStatus`); values follow enum #2 |

No RLS change (arcs policies are column-agnostic). No frontend stored value — the UI maps codes
to labels (Decision 7).

---

## 6.→ (renumbered) Handoff deviations (flagged, not silently dropped — per handoff-contract)

The reduced-scope classification, with the broadened CRUD scope folded in:

- **Dashboard `CampaignCard`:** now shows `title`, `description`, **`system`, `tone`** (backed
  by Migration A) and optionally `Updated {updated_at}`. Still **omitted** (no backing column /
  out of scope): `status` pill (A3/A7), the 5 counts (Sessions/NPCs/Factions/Memories/Open arcs
  — would need aggregation, out of scope). Client-side search kept.
- **Campaign detail:** header + **system/tone kicker** (Migration A) + live world-state view/edit
  + **live arcs summary/links** (A2/A5). `/02 Recent sessions` and `/04 Active memories` render
  as **dimmed "coming in a later chapter" placeholder cards** to preserve the two-column rhythm
  (A5) — not collapsed to one column, not live. Metrics bar omitted (needs counts).
- **Entity modals:** NPC edits **name/current_state/motivation**; faction edits
  **name/current_stance/goals**; arc edits **title/description/priority/status**. Now with
  **add** (manual create, `content_source=manual`) and **delete**. Still **omitted** (no backing
  column, A7): NPC `status`/`faction`/`relation`; faction `posture`/`influence`/`objective`/
  `last-reaction`; arc `npcs`/`factions`/`lastSession`/`include`. `description` shown/edited where
  a column exists; `content_source` read-only (system-managed provenance).
- **`SettingsView` (`/campaigns/:id/settings`):** **Out of MVP** (A7) — not built.

Design principle: implement every in-scope handoff field faithfully (tokens, copy, states,
motion); omit only fields with no backend column, each logged here and classified as later-block
or out-of-MVP.

---

## 7. Testing approach (Strict TDD active — write the failing test first)

### Backend — `uv run pytest` (from `services/api/`)

- **Repository:** reads return rows / `[]`; `update_*` return the row on match and `None` when
  `data == []`; `create_*` return the inserted row and force `content_source=manual`; `delete_*`
  return `True` on match and `False` when `data == []`; raw client exceptions → `RepositoryError`.
- **Use cases (mock the Protocol):** `GetCampaignDetail` composes campaign + npcs + factions +
  **arcs**, 404 on `None`; `Update*` build the dict via `exclude_unset`/`exclude_none`, 422 on
  empty patch, 404 on repo `None`; `Create*` apply the **ownership pre-check** (forged parent →
  `CampaignNotFoundError`), force `manual`, arc default `active`; `Delete*` map `False` → 404.
- **Routes (FastAPI `TestClient`, dependency overrides):** status/body for 200/201/404/422 across
  GET/POST/PATCH/DELETE for campaigns, npcs, factions, arcs.
- **RLS ownership (real per-user client where the harness supports it — the load-bearing security
  assertion):**
  - SELECT/UPDATE/DELETE miss → **404, zero rows, no existence leak** for `GET /{id}`,
    `PATCH /{id}`, `DELETE /{id}` on all four entities.
  - **INSERT miss (create) → 404 via the pre-check** (forged `campaign_id`), NOT an empty-rows
    path — pin this explicitly (advisor-flagged divergence).
  - **Pin `.delete().execute()` returns the deleted rows** so `data == []`→404 holds (mirrors the
    existing update-return risk).
- **Migration B pin (repo/enum):** a repository/enum test asserting `insert_arcs` default now
  persists `"active"` (was `"open"`), and `test_schema.py` asserts the new enum value set — proves
  the `open→active` rename backfill.
- **Migration A pin (extraction unchanged — the Block-5 regression guard):** a test asserting the
  `POST /campaigns/extract` input / `composeRawText` fold is **unchanged** after threading
  system/tone (backend: extract request body still `{raw_text}` and extraction tests untouched;
  the golden-fold assertion lives frontend, below).

### Frontend — `pnpm test` (Vitest + React Testing Library)

- **`Field`:** label/optional/help; error supersedes help; `aria-describedby`; error `role="alert"`.
- **`Modal`:** Escape closes; backdrop mousedown closes, inner click does not; focus in on open +
  **returns to trigger on close**; Tab trapped; `role="dialog"`+`aria-modal`+`aria-labelledby`.
- **`composeRawText` golden test (Block-5 regression guard):** assert the composed output for a
  fixed input is **byte-identical** after the system/tone draft-threading change — the pinned
  guarantee of Decision 8.2.
- **Screens:** dashboard states + client search + system/tone on the card; detail world-state
  view↔edit↔save, dimmed Block-7 placeholders present, arcs summary; each entity screen: modal
  **add** submits a create, **edit** submits a partial PATCH, **delete** confirm → DELETE, modal
  stays open + shows error on failure; arcs status filter + inline Resolve/Discard/Reopen status
  PATCH.
- **API client (`lib/campaigns/api.ts`):** mock `apiFetch`; ok-path Zod parse for each new
  function; non-ok throws `CampaignApiError`; 404 mapped for not-found handling.

---

## 8. Risks / tradeoffs (Block-5 regression surface called out first)

1. **Block-5 create/extraction regression (highest-priority guard).** Migration A threads
   system/tone through the *create* path while `composeRawText` and the *extract* path must stay
   byte-identical. Mitigation: `composeRawText` is untouched; the change is additive (draft carry
   + one schema field + two insert-dict keys); pinned by the golden-fold test and the untouched
   Block-5 extraction suite. If any extraction test changes output, the refactor is wrong.
2. **INSERT-RLS failure divergence.** Create ownership failure raises `42501`, not empty rows —
   naive `except → RepositoryError` would 500. Mitigation: the 6.4 pre-check + a create security
   test that targets the raise/pre-check path. If skipped, the whole new create surface ships with
   wrong ownership-failure semantics.
3. **`arc_status` enum migration is data-touching and only partly reversible.** `RENAME VALUE` is
   reversible; **`ADD VALUE 'dormant'` is NOT trivially reversible** (Postgres has no
   `ALTER TYPE … DROP VALUE`). Rollback requires recreating the type — see §9 rollback. Any code
   still referencing `open`/`dropped` after the enum member rename (#2) will raise. Mitigation:
   change all 8 touchpoints atomically with the migration; enum + schema tests pin the new set.
4. **RLS-miss detection depends on Supabase returning `[]` on filtered UPDATE *and* DELETE, and
   returning the row on INSERT/DELETE.** Design treats empty `data` as not-found. Pinned by
   real-client repository tests; if a future client/version changes update/delete return
   semantics, the not-found signal needs revisiting.
5. **Hand-rolled Modal a11y.** Focus-trap/return-focus is bespoke without Radix. Mitigation:
   explicit a11y test list (§7); Radix-swappable API if adopted later.
6. **`content_source` provenance on edit.** Handoff flips `OriginBadge` to "Edited by you" after
   an edit, but PATCH scope excludes `content_source` writes (system-managed). Manual **create**
   correctly stamps `manual`; **edits do not re-stamp** to `edited` in Block 6. Accepted; UI copy
   must not promise edit-provenance it doesn't deliver.
7. **`arcs.content_source` column presence.** The base migration's `arcs` table has no
   `content_source`, yet `repository.py`/`test_schema.py` reference it (a later migration added
   it). Confirm the live column set at apply time; if absent, drop `content_source` from arc
   create/response. Low risk (tests already assume it exists) but verify, don't assume.
8. **system/tone bound mismatch (form vs API).** An API-only per-field cap could 422 a premise the
   form accepted. Mitigation: agree the bound on both sides (Decision 8.2).

---

## 9. Migration ordering & rollback

**Two migrations, independent, order-flexible but recommend A then B** (A is purely additive and
lowest-risk; B is the data-aware enum change). Both are net-new timestamped files under
`supabase/migrations/`. They deploy via the existing CI `db push` path.

- **Migration A — `add_campaign_system_tone`:** additive columns, no data touched, no RLS change.
  **Rollback:** `alter table campaigns drop column tone; drop column system;` — clean, no data
  loss beyond the two new columns.
- **Migration B — `reconcile_arc_status`:** **data-aware** (unlike the original additive-only
  plan). Existing rows' labels change via `RENAME VALUE` (implicit backfill). **Rollback is only
  partial and must be honest:**
  - Reverse renames: `alter type arc_status rename value 'active' to 'open'; … 'discarded' to
    'dropped';` — reversible.
  - **`dormant` cannot be dropped in place** (no `DROP VALUE`). If any row now uses `dormant`,
    rollback must first migrate those rows to another value (e.g. `open`), then recreate the
    `arc_status` type without `dormant` (create new type → alter column → drop old type). This is
    the honest cost of the enum change and supersedes the original "nothing to un-migrate"
    rollback claim in the proposal.
- **Code/DB coupling:** Migration B's enum rename must ship together with the `ArcStatus` member
  rename (touchpoint #2) and dependents (#3–#8); deploying the migration without the code (or vice
  versa) leaves references to removed labels. Treat B + its code touchpoints as one atomic
  work-unit (§10).

---

## 10. Task-slicing guidance for sdd-tasks

Single PR, `size:exception` (A8 — do **not** split; do not re-ask). `sdd-tasks` should produce
reviewable **work-units** in this order, applied in batches with apply-progress continuity:

1. **Backend reads** — ports/use-cases/repo for `list_campaigns`, `get_campaign`,
   `get_campaign_children` (npcs+factions+**arcs**), response schemas, `GET` routes + tests.
   (No migration dependency; safe first slice.)
2. **Frontend reads** — `Field` + `Modal` primitives first (handoff-first), then `/dashboard`
   list, campaign detail (world-state view/edit, dimmed Block-7 placeholders, arcs summary), and
   the read side of the npcs/factions/arcs routes + component/a11y tests. (Depends on slice 1's
   response shape.)
3. **Migrations + writes** — the two migrations **with** their code touchpoints, then the write
   surface:
   - Migration A + `CreateCampaignRequest.system/tone` + `insert_campaign` dict + draft-threading
     + `composeRawText` golden test.
   - Migration B + all 8 `arc_status` touchpoints (§9.2) atomically.
   - Create/update/delete use-cases + repo methods + routes for npcs/factions/arcs (incl. the 6.4
     ownership pre-check) + entity modals (add/edit/delete confirm) + mutation wiring + RLS
     ownership tests (incl. the INSERT-miss→404 and delete-return pins).
4. **Docs / ENV sweep** (proposal Part 2) — additive text + `.env.example`; last, no code coupling.

Rationale: reads unblock the UI without touching data; migrations+writes are the risk-bearing
core kept together so a batch boundary never lands mid-migration; docs close out. Each batch is
independently green (`uv run pytest`, `pnpm test`) before the next.
