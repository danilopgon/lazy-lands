# Design — Block 5: Campaign creation and AI onboarding

Architectural HOW for the first block that writes user-owned data through Supabase RLS and calls the LLM seam for a product feature. It introduces a **per-request, JWT-bound Supabase client**, the `campaigns` module (ADR-05 nested layers), the first **Jinja prompt** infra in `shared/`, and the first **application-layer + FakeLlmProvider** test pattern. Arcs are IN scope, first-class alongside NPCs and factions (proposal decision #1) — extracted, reviewed, and persisted using the `arcs` table and RLS policies that already exist.

## Quick path (the shape at a glance)

```
POST /campaigns/extract  (stateless)      POST /campaigns  (persists)
  routes.py                                 routes.py
    → get_current_user (user_id)             → get_user_supabase_client (client + user_id)
    → ExtractCampaign use case               → CreateCampaign use case
        render extract_campaign_v1.jinja        → SupabaseCampaignRepository (per-user client)
        llm.complete_json(prompt, Schema)          insert campaign → npcs[] → factions[] → arcs[]
        parse_llm_json guard                       compensating delete on child failure
    ← ExtractCampaignOutput                  ← { id }
```

Two dependency layers, one new module, one shared client factory, one shared prompt loader. One additive migration (arcs `content_source`) — see Decision 9.

## Decision 1 — Per-user JWT-bound Supabase client (critical path)

This is the riskiest new piece. Getting it wrong silently bypasses RLS.

### Construction

Add to `shared/database.py` (sibling of the existing service-role singleton, NOT a replacement):

```python
def create_user_supabase_client(access_token: str) -> Client:
    """Per-request Supabase client authenticated AS the calling user.

    apikey header stays the anon/publishable key; the Authorization bearer
    becomes the user's JWT, so auth.uid() resolves inside Postgres and RLS
    permits owner-scoped reads/writes. NEVER cached — a cached/shared client
    would leak one user's token into another user's request.
    """
    client = create_client(
        str(settings.supabase_url).rstrip("/"),
        settings.supabase_publishable_key,   # anon key = apikey header
    )
    client.postgrest.auth(access_token)      # Bearer = user JWT → auth.uid()
    return client
```

| Rule | Decision |
|------|----------|
| Key used | `supabase_publishable_key` (anon) as apikey; user JWT as bearer. NEVER `supabase_service_role_key` for campaign/NPC/faction writes — service role bypasses RLS (JA-004). |
| Lifecycle | **Per-request. No `@lru_cache`.** Contrast the existing `get_supabase_client()` singleton — that pattern is FORBIDDEN here because the client carries a scoped token. |
| Anti-pattern (forbidden) | Do NOT build one anon client and mutate `.postgrest.auth(token)` per request on a shared instance — that mutates shared state and cross-contaminates users. Fresh client each request. |
| Sync vs async | `create_client` returns the **sync** `Client`. Acceptable for MVP traffic inside async handlers (blocking PostgREST call is short). Tradeoff noted; migrating to `AsyncClient`/`acreate_client` is a post-MVP option and would change the repository method signatures to `await`. |
| Verify at implementation | Confirm `client.postgrest.auth(token)` against installed `supabase>=2.25.0` (design-level; the architecture does not hinge on exact syntax). If the version prefers `ClientOptions(headers={"Authorization": ...})`, use that — the invariant (anon apikey + user bearer, fresh per request) is what matters. |

### Dependency wiring (extend, don't duplicate JWT parsing)

`get_current_user` today re-derives the token internally but returns only `sub`. The use case needs **both** the user_id and the raw token from the *same* request. Chosen shape:

```python
# shared/security.py — return both, validated once
class AuthContext(NamedTuple):
    user_id: str
    access_token: str

async def get_auth_context(authorization: Annotated[str | None, Header()] = None) -> AuthContext:
    # ... existing validation, then:
    return AuthContext(user_id=sub, access_token=token)

# Keep get_current_user as a thin wrapper for id-only callers (back-compat):
async def get_current_user(ctx: Annotated[AuthContext, Depends(get_auth_context)]) -> str:
    return ctx.user_id
```

```python
# shared/database.py (or shared/dependencies.py) — factory dependency layered on auth
def get_user_supabase_client(
    ctx: Annotated[AuthContext, Depends(get_auth_context)],
) -> Client:
    return create_user_supabase_client(ctx.access_token)
```

| Why this shape | Rationale |
|----------------|-----------|
| One validation | JWT is parsed/verified once; id and token provably come from the same token. |
| Why id AND token | `campaigns.user_id` is `NOT NULL` with **no default** (migration line 40). The INSERT must set `user_id` explicitly; the RLS INSERT policy then checks it equals `auth.uid()`. The repository needs the token (to authenticate) and the use case needs the id (to populate the column). |
| Blast radius | `main.py` wires only `health` today — `get_current_user` has no production callers, so extending its return contract is near-zero risk. |
| Route depends on | `get_user_supabase_client` for `POST /campaigns`; `get_current_user` (id-only) is enough for `POST /campaigns/extract` (stateless, no DB). |

## Decision 2 — `campaigns` module layout (ADR-05 nested layers)

```
modules/campaigns/
  domain/
    models.py        # Campaign, NPC, Faction, Arc domain entities (frozen dataclasses/BaseModel)
    ports.py         # CampaignRepository (Protocol)
  application/
    extract_campaign.py   # ExtractCampaign use case (LLM only, no DB)
    create_campaign.py    # CreateCampaign use case (repository only, no LLM)
  infrastructure/
    repository.py         # SupabaseCampaignRepository(client: Client)
  prompts/
    extract_campaign_v1.jinja
  routes.py          # APIRouter — 2 endpoints
  schemas.py         # ExtractCampaignOutput, ExtractRequest, CreateCampaignRequest, CreateCampaignResponse
```

**Dependency direction (ADR-05):** `routes → application → domain`; `infrastructure` implements `domain/ports.py`; `application` depends on the port Protocol, never on `SupabaseCampaignRepository` concretely. Wiring (concrete client → repository → use case) happens in `routes.py` via FastAPI `Depends`, keeping the domain launchable without Supabase (ADR-05 validation test).

```python
# domain/ports.py
class CampaignRepository(Protocol):
    def create_campaign(self, user_id: str, data: CreateCampaignRequest) -> str: ...
    # returns new campaign id; raises on failure (use case handles compensation)
```

**Router wiring in `main.py`:** add `from app.modules.campaigns import routes as campaigns` and `app.include_router(campaigns.router)`. Router prefix `/campaigns` (matches `docs/06-api-contracts.md`; note the doc's `/api` base path is applied at the ingress/gateway layer, consistent with the existing `health` router which carries no `/api` prefix).

## Decision 3 — Jinja prompt-render helper in `shared/`

First prompt template in the codebase; sets the convention for sessions/memory/generation.

```python
# shared/prompts.py
_env = Environment(
    loader=FileSystemLoader(...),          # resolves modules/*/prompts/
    autoescape=False,                       # prompts are plain text, NOT HTML — escaping corrupts them
    undefined=StrictUndefined,              # fail fast on a missing template variable
    trim_blocks=True, lstrip_blocks=True,
)

def render_prompt(template_name: str, /, **context: object) -> str:
    return _env.get_template(template_name).render(**context)
```

| Choice | Decision |
|--------|----------|
| `autoescape` | **Off.** These render LLM prompts (plain text), not HTML. HTML escaping would mangle the DM's premise. |
| `undefined` | `StrictUndefined` — a typo'd variable raises at render time, not a silently blank prompt. |
| Loader roots | `FileSystemLoader` pointed at the module `prompts/` dirs (e.g. `modules/campaigns/prompts/`). Templates referenced by bare filename `extract_campaign_v1.jinja`. |
| Versioning convention | `<operation>_v<N>.jinja`. Bump `_v2` on breaking prompt changes; keep old versions for trace reproducibility (`prompt_version` trace field, docs/05). This block ships `extract_campaign_v1.jinja`. |
| Reuse | `render_prompt` is transversal (2+ future modules) → belongs in `shared/` per ADR-05 rule 3. |

## Decision 4 — `ExtractCampaignOutput` schema placement & shape

One Pydantic model in `modules/campaigns/schemas.py`, serving **both** as the `complete_json(prompt, ExtractCampaignOutput)` validation target AND the `/campaigns/extract` HTTP response model. Split only if constraints later diverge (noted, not now).

```python
class ContentSource(str, Enum):   # matches Postgres enum: llm | edited | manual
    llm = "llm"; edited = "edited"; manual = "manual"

class Priority(str, Enum):        # matches Postgres enum: high | medium | low
    high = "high"; medium = "medium"; low = "low"

class ExtractedNPC(BaseModel):
    name: str; description: str; current_state: str; motivation: str
    content_source: ContentSource = ContentSource.llm

class ExtractedFaction(BaseModel):
    name: str; description: str; current_stance: str; goals: str
    content_source: ContentSource = ContentSource.llm

class ExtractedArc(BaseModel):
    title: str; description: str
    priority: Priority = Priority.medium
    content_source: ContentSource = ContentSource.llm
    # status is NOT set here — it is assigned on persistence (see below), not by the LLM

class ExtractCampaignOutput(BaseModel):      # LLM target + extract response
    title: str; description: str; world_state: str
    npcs: list[ExtractedNPC]
    factions: list[ExtractedFaction]
    arcs: list[ExtractedArc]
```

| Schema | Role | Key constraint |
|--------|------|----------------|
| `ExtractRequest` | `/campaigns/extract` body | `raw_text: str = Field(min_length=100, max_length=8000)` — backend trust boundary (docs/07). The 8000-char cap is a product/UX + cost/latency + extraction-quality decision, not a model context-window limit (see proposal decision #6). |
| `ExtractCampaignOutput` | LLM output + extract response | `content_source` per npc/faction/arc item, defaulted to `llm`. Arc `priority` defaults to `medium`; arc `status` is not part of the LLM output. |
| `CreateCampaignRequest` | `/campaigns` body (reviewed payload) | Same field shape (npcs, factions, arcs); `content_source` now trusted from the reviewed client state (`llm`, `edited`, or `manual`). |
| `CreateCampaignResponse` | `/campaigns` response | `{ id: str }`. |

**Arc persistence now matches NPCs and factions (reversed from an earlier draft).** The base `arcs` table (migration `20260628101707_initial_schema.sql`, lines 92–101) shipped with columns `id, campaign_id, title, description, status (arc_status), priority (priority), created_at, updated_at` — no `content_source` column, unlike `npcs`/`factions` (migration lines 73/86). An earlier design draft accepted that gap as permanent ("arc provenance is UI-only, not persisted"). That is overruled: `PRODUCT.md` (line 124) models an Arc with `origin`/provenance like every other extracted entity, and leaving arcs asymmetric would mean the one entity type without a durable content-origin trail is also the one most likely to need it (arcs recur across sessions). Block 5 therefore ships one additive migration (Decision 9) adding `content_source` to `arcs`, and the repository inserts `title`, `description`, `priority`, `status`, **and `content_source`** for every arc — the same four columns as npcs/factions plus the two arc-specific fields. New arcs are persisted with `status = "open"` (the `arc_status` enum is `open | resolved | dropped` — **not** `active`; `active` belongs to the unrelated `memory_status` enum and must not be used here).

**Reasoning-model note (verify at implementation).** The dev/CI LLM provider configuration includes `groq qwen3-32b`, which is a reasoning model: Groq caps its output at 40,960 tokens, and any "thinking"/reasoning tokens are drawn from that same output budget before the JSON answer is emitted. For `complete_json` calls against `ExtractCampaignOutput` (a moderately sized structured JSON payload), reasoning should be limited or disabled at the provider-call level so the visible-thinking budget doesn't crowd out the actual JSON output and trigger truncation. This is an implementation-time provider-config concern, not a schema change.

## Decision 5 — Multi-table save atomicity (ordered inserts + compensating delete)

PostgREST has no cross-table transaction. MVP strategy, all through the **per-user client** under RLS:

```
CreateCampaign.execute(user_id, payload):
  campaign_id = repo.insert_campaign(user_id, payload)   # parent first (children need FK)
  try:
      repo.insert_npcs(campaign_id, payload.npcs)        # 1 bulk PostgREST call (array)
      repo.insert_factions(campaign_id, payload.factions) # 1 bulk PostgREST call (array)
      repo.insert_arcs(campaign_id, payload.arcs)         # 1 bulk PostgREST call (array); status="open", content_source carried through
  except RepositoryError:
      repo.delete_campaign(campaign_id)   # ON DELETE CASCADE removes any children too
      raise CampaignPersistenceError(retryable=True)   # payload preserved on frontend
  return campaign_id
```

| Aspect | Decision |
|--------|----------|
| Order | Campaign → npcs[] → factions[] → arcs[]. 4 PostgREST calls total (children bulk-inserted per table). |
| Rollback | Single `delete_campaign(campaign_id)`. FKs are `ON DELETE CASCADE` (migration lines 53/67/80), so children vanish automatically — no per-row cleanup. |
| Delete authorization | Compensating delete runs through the **same per-user client**; owner delete is RLS-permitted (DELETE policy `user_id = auth.uid()`). |
| Delete-also-fails (rare) | Surface the created `campaign_id` in the error/log so it can be cleaned up; log per docs/05 trace rules (no full campaign content). |
| Not now: RPC | A `SECURITY INVOKER` RPC gives true atomicity but reintroduces a migration (this block's standout advantage is needing none) and deadline risk. A `SECURITY DEFINER` RPC would bypass RLS — forbidden. Documented as **post-MVP hardening**. |

## Decision 6 — Error mapping (no leak of raw LLM output / prompts)

**Gap to close:** `LlmOutputValidationError` is a bare `Exception`; the global handler only catches `AppError` → 400. As-is a validation failure becomes an unhandled **500**. The design closes it explicitly.

| Failure | Source | HTTP | Body (safe) |
|---------|--------|------|-------------|
| Premise < 100 or > 8000 chars | Pydantic `ExtractRequest` | 422 | FastAPI field error (no LLM involved) |
| LLM JSON invalid / schema mismatch | `LlmOutputValidationError` (retryable=True) | **422** (or 503) with `{ error, retryable: true }` | Generic message; **never** `raw_output` or the rendered prompt |
| Partial save failure | `CampaignPersistenceError` (retryable=True) | 409/503 `{ error, retryable: true }` | Generic; frontend preserves reviewed payload |
| Missing/invalid JWT | `get_auth_context` | 401 | `Could not validate credentials` |

**Wiring:** register a dedicated handler for `LlmOutputValidationError` (and `CampaignPersistenceError`) in `main.py`, OR catch-and-translate inside `routes.py`. Preferred: a small handler in `shared/errors.py` (or make these subclasses of `AppError` with an overridable status), so the mapping is centralized and reused by later AI modules. The handler logs `schema_name` + trace metadata (docs/05) and returns a generic retryable body — `raw_output` stays server-side only.

## Decision 7 — Frontend (architectural)

Two new App Router screens; reuse `apiFetch` (injects the Supabase JWT) + TanStack Query mutations. Component/data-flow level only.

```
/campaigns/new  (page.tsx, client component)
  react-hook-form + zod: raw_text.min(100).max(8000)  ← mirrors backend (UX, not trust)
  visible char counter (e.g. "1234 / 8000") next to the textarea
  useMutation → apiFetch('/campaigns/extract', POST { raw_text })
    on error: keep typed text (form state preserved), show retryable message
    on success: stash ExtractCampaignOutput → navigate to review
       (Block-5 transport: sessionStorage or router state; NO server draft — extract is stateless)

/campaigns/new/review  (page.tsx, client component)
  local state seeded from the extracted payload
  editable sections: summary (title/description/world_state), NPCs[], Factions[], Arcs[]
    each item shows provenance badge: ✦ Scribe (llm) / ✎ Edited (edited or manual)
    on any field touch: flip that item's content_source llm → edited
    add / remove NPC / faction / arc supported
  useMutation → apiFetch('/campaigns', POST { reviewed payload })
    on error: preserve edited state, show retryable message
    on success: redirect to campaign detail route (Block 6 target — not built here)
```

| Concern | Decision |
|---------|----------|
| Validation | zod `min(100).max(8000)` mirrors backend; backend Pydantic is the real boundary. Errors NEVER clear the textarea. |
| Provenance | Per-item `content_source`; touch → `edited`. Embodies PRODUCT.md P1 (DM has the last word). |
| Cross-screen data | Stateless extract → carry payload client-side (session storage / router state). Dropped session loses the extract (acceptable MVP; proposal decision #2). |
| Types | New `apps/web/lib/campaigns/` zod schemas/types mirroring the two payloads, including arcs. |
| Client | Reuse `apiFetch`; caller checks `res.ok` and throws for TanStack Query (existing convention). |

## Decision 8 — Testing strategy (strict TDD, precedent-setting)

Backend `uv run pytest` (asyncio auto); frontend `pnpm test` (Vitest + RTL). Write failing test first.

| Test | Layer | What it proves |
|------|-------|----------------|
| `ExtractCampaign` use case | application | `FakeLlmProvider.register(ExtractCampaignOutput, payload)`, assert use case renders prompt + returns validated output (npcs, factions, arcs); register a bad payload → `LlmOutputValidationError`. Sets the first use-case + fake-LLM pattern. |
| **App-layer ownership** | application/infra | **User A's token cannot write into User B's campaign** through the per-user client (RLS blocks it). This is the headline security test — existing RLS tests are raw-SQL only. Proves the per-user client (not service role) is on the write path. |
| Client isolation | shared | Two requests with different tokens get independent clients (no shared-state token leak) — guards the "fresh per request" invariant. |
| Route tests | routes | `/campaigns/extract` happy + <100-char 422 + >8000-char 422 + LLM-invalid mapping (no raw leak); `/campaigns` happy (including arcs) + partial-failure compensation + 401 without JWT. |
| Repository tests | infrastructure | Ordered insert (campaign → npcs → factions → arcs) + compensating delete against local Supabase (or a faked PostgREST) — parent-first, cascade cleanup. |
| Frontend | Vitest/RTL | `/campaigns/new` keeps text on error + min/max-length UX with char counter; `/campaigns/new/review` flips `content_source` on edit, add/remove works for npcs/factions/arcs, confirm calls `/campaigns`. |

## Decision 9 — Migration & deployment (arcs `content_source`)

Block 5 is the first block after the base schema (`20260628101707_initial_schema.sql`) to ship a schema change. It is additive and small, but it is a first for this codebase, so both the migration shape and the deployment path are specified here.

### The migration

| Aspect | Decision |
|--------|----------|
| File | `supabase/migrations/<new_timestamp>_add_content_source_to_arcs.sql` — new timestamped file, standard Supabase CLI convention (`pnpm supabase migration new add_content_source_to_arcs` at apply time). |
| Statement | `alter table arcs add column content_source content_source;` — the `content_source` enum type (`llm | edited | manual`) already exists (created for `npcs`/`factions` in the base migration); this statement only adds a column, it does not touch the enum. |
| Safety | **Additive and nullable.** No `not null`, no `default`, no backfill required — existing arc rows (if any, from local dev/testing) simply get `content_source = NULL`. This is a zero-downtime, backward-compatible change: it does not lock the table for rewrites and does not break any code that inserts arcs without the column. |
| Domain model | `Arc` (domain model) gains a `content_source: ContentSource` field, mirroring `NPC`/`Faction`. |
| Repository | `SupabaseCampaignRepository.insert_arcs` writes `content_source` alongside `title`, `description`, `priority`, `status` — the same shape as `insert_npcs`/`insert_factions`. |
| Not part of this change | Writing the migration SQL file itself is an **apply-phase** task, not a design-phase deliverable — this section specifies exactly what that file must contain. |

### Deployment path (provisional — pending final user confirmation)

There is currently no automated cloud migration pipeline: `ci.yml` runs tests only against a local fake Supabase stack, and `supabase/CLOUD.md`'s "Current status" section documents that the CI/CD `db push` workflow does not exist yet — only a manual controlled path is sanctioned today.

| Aspect | Decision |
|--------|----------|
| For this block | Deploy the arcs migration to hosted Supabase via the `CLOUD.md`-sanctioned **manual controlled path**: `pnpm supabase db push --dry-run`, review the plan, then `pnpm supabase db push`. Record the dry-run output and the push result in the Block 5 PR description. |
| Why `--dry-run` first | The base schema may have been applied to the hosted project via the Supabase dashboard rather than `db push`, so the hosted `supabase_migrations` history is not guaranteed to already reflect the base migration. `--dry-run` surfaces exactly what the CLI believes is pending before anything is applied, so a mismatch is caught before a real push. |
| Automated pipeline | Out of scope for this block. A GitHub Actions workflow running `supabase db push`, gated by a protected environment and manual approval (as `CLOUD.md` already recommends), is a **separate fast-follow infra PR** — it is a cross-cutting concern needed for every future schema change, not specific to arcs or Block 5, and keeping it out preserves this block's single-PR feature focus. |
| Status | **Provisional.** This deployment approach is recorded here as the current plan; final confirmation from the user is pending before the migration is pushed to hosted Supabase. |

## Checklist (design is complete when the reviewer can confirm)

- [ ] Per-user client: anon apikey + user bearer, fresh per request, never `lru_cache`, service role forbidden for these writes.
- [ ] `get_auth_context` returns `(user_id, access_token)` validated once; `get_user_supabase_client` layered on it; routes wire it.
- [ ] `campaigns` module follows ADR-05 direction; application depends on `CampaignRepository` Protocol, not the Supabase concrete.
- [ ] `shared/prompts.py` render helper: autoescape off, StrictUndefined, `<operation>_v<N>.jinja` convention.
- [ ] `ExtractCampaignOutput` = LLM target + extract response, including arcs; request schemas distinct; `raw_text` `Field(min_length=100, max_length=8000)`.
- [ ] Arc persistence writes `title`/`description`/`priority`/`status`/`content_source` (`status="open"`, never `"active"`) — arcs are persisted with the same provenance column as npcs/factions.
- [ ] Additive migration `supabase/migrations/<timestamp>_add_content_source_to_arcs.sql` (`alter table arcs add column content_source content_source;`) — nullable, no backfill, no destructive change.
- [ ] Migration deployed to hosted Supabase via the manual controlled `db push --dry-run` / `db push` path for this block (provisional, pending user confirmation); automated protected-pipeline `db push` tracked as a separate fast-follow infra PR.
- [ ] Save = parent-first + compensating cascade delete via per-user client (campaign → npcs → factions → arcs); RPC deferred.
- [ ] `LlmOutputValidationError`/`CampaignPersistenceError` mapped to retryable HTTP without leaking raw output/prompt.
- [ ] Frontend preserves text on error, flips provenance on edit, reuses `apiFetch`.
- [ ] Tests: use-case (fake LLM), app-layer ownership, route, repository, frontend — TDD-first.

## Next step

`sdd-tasks` (once the spec is also ready) — break these decisions into ordered, TDD-first work units. Flag `size:exception` (single PR spanning module + client + 2 screens + tests, per proposal risk).
