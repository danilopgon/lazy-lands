# Spec: campaign-persistence

**Change**: block-5-campaign-creation
**Capability**: `campaign-persistence` (new)

---

## Overview

`POST /campaigns` persists a DM-reviewed campaign (title, description, world state,
NPCs, factions, arcs) as the campaign owner's own RLS-protected data. This is the
first backend write path in the codebase that writes user-owned data through Supabase
RLS, and it MUST use the per-user (JWT-bound) Supabase client described in the
`per-user-supabase-access` spec — never the service-role client.

Because campaign + NPCs + factions + arcs are written as separate PostgREST calls with
no built-in cross-table transaction, this endpoint follows an ordered-insert-with-
compensating-delete strategy (parent first, then children; on child failure, delete the
just-created parent) rather than a Postgres RPC, per the proposal's decision #7.

This capability also introduces the first schema change since the base migration: an
additive `content_source` column on `arcs`, so arcs carry the same persisted provenance
column as `npcs` and `factions` (per the proposal's decision #8). See CP-003 and NFR-CP-3.

---

## Functional requirements

### CP-001: Request/response schema (including arcs)

The request body MUST match:

```json
{
  "title": "string",
  "description": "string",
  "world_state": "string",
  "npcs": [
    { "name": "string", "description": "string", "current_state": "string", "motivation": "string", "content_source": "llm | edited | manual" }
  ],
  "factions": [
    { "name": "string", "description": "string", "current_stance": "string", "goals": "string", "content_source": "llm | edited | manual" }
  ],
  "arcs": [
    { "title": "string", "description": "string", "priority": "high | medium | low", "content_source": "llm | edited | manual" }
  ]
}
```

`title`, `description`, and `world_state` MUST be non-empty strings. `npcs`, `factions`,
and `arcs` MAY be empty lists. Each npc/faction/arc item's `content_source` MUST be one
of `"llm"`, `"edited"`, or `"manual"` (per `docs/03-domain-model.md`'s `ContentSource`
value object — `"manual"` covers items the DM added during review). Arc items MUST NOT
accept a `status` field from the client; arc `status` is always assigned by the
persistence layer (see CP-003).

The success response MUST be `{ "id": "<uuid>" }`, the id of the newly created campaign.

---

### CP-002: Authentication required

The endpoint MUST depend on `get_current_user`. Requests without a valid Supabase JWT
MUST be rejected before any database write.

#### Scenario: Unauthenticated request is rejected

- GIVEN no `Authorization` header (or an invalid/expired token)
- WHEN `POST /campaigns` is called with any body
- THEN the response is HTTP 401 and no row is created in `campaigns`, `npcs`, `factions`,
  or `arcs`

---

### CP-003: Happy path — persists campaign, NPCs, factions, and arcs

Given a valid, authenticated request, the create-campaign use case MUST insert one
`campaigns` row, then one `npcs` row per submitted NPC, then one `factions` row per
submitted faction, then one `arcs` row per submitted arc, all attributed to the
authenticated user's `user_id` (on `campaigns`) and scoped via `campaign_id` foreign
keys (on children).

Each persisted arc row MUST have `status` set to `"open"` (the `arc_status` enum is
`open | resolved | dropped`; `"active"` is not a valid value and MUST NOT be used). Each
arc row's `priority` MUST be persisted from the reviewed payload (defaulting to
`"medium"` if the extracted item did not have it edited). Each arc row's `content_source`
MUST be persisted from the reviewed payload (`"llm"`, `"edited"`, or `"manual"`), on the
`arcs` table's `content_source` column — the same provenance treatment as `npcs` and
`factions` (see NFR-CP-3 for the migration that adds this column).

#### Scenario: A reviewed payload with NPCs, factions, and arcs is persisted

- GIVEN an authenticated DM and a reviewed payload with 2 NPCs, 1 faction, and 1 arc
- WHEN `POST /campaigns` is called
- THEN the response is HTTP 200/201 with `{ "id": <uuid> }`, and a subsequent read (as
  the same user) shows 1 campaign row, 2 npc rows, 1 faction row, and 1 arc row (with
  `status = "open"` and `content_source` matching the submitted item), all linked to the
  returned campaign id

#### Scenario: A reviewed payload with no NPCs, factions, or arcs is persisted

- GIVEN an authenticated DM and a reviewed payload with empty `npcs`, `factions`, and
  `arcs`
- WHEN `POST /campaigns` is called
- THEN the response returns `{ "id": <uuid> }` and only the campaign row is created

---

### CP-004: Ownership — writes land under the authenticated user, and RLS prevents cross-user writes

Every row created by this endpoint MUST have `user_id` (on `campaigns`) resolving to
`auth.uid()` of the authenticated caller, enforced by the existing RLS policies and by
routing all writes through the per-user Supabase client (see `per-user-supabase-access`
spec). This MUST be verified at the application layer (not only via the existing raw-SQL
RLS tests), since this is the first app-layer write path exercising RLS.

#### Scenario: A user's campaign is created under their own user_id

- GIVEN User A is authenticated
- WHEN User A calls `POST /campaigns` with a valid payload
- THEN the created campaign's `user_id` equals User A's `auth.uid()`, verified via an
  app-layer (not raw-SQL) assertion

#### Scenario: User A cannot create data attributed to User B

- GIVEN User A is authenticated with User A's JWT
- WHEN User A calls `POST /campaigns` (there is no way to specify a different owner in
  the request body — `user_id` is never accepted from the client)
- THEN the created campaign is owned by User A, never by any other user, and no request
  parameter can override this

---

### CP-005: Partial-failure handling — compensating delete, no orphaned campaign

If the campaign row insert succeeds but a subsequent NPC, faction, or arc insert fails,
the use case MUST issue a compensating delete of the just-created campaign row before
returning an error, so the DM is never left with a persisted, empty, orphaned campaign.
The error response MUST be retryable and MUST preserve enough information for the
frontend to retry with the same reviewed payload (i.e., the endpoint MUST NOT discard or
mutate the DM's payload on failure).

If the compensating delete itself fails, the endpoint MUST surface the created campaign
id in the error response (so it can be cleaned up) and MUST log the failure per
`docs/05-ai-system.md` trace rules.

#### Scenario: NPC insert fails after campaign insert succeeds

- GIVEN an authenticated DM and a reviewed payload
- WHEN the campaign row insert succeeds but an NPC insert fails (e.g. transient DB
  error)
- THEN the use case deletes the just-created campaign row, the response is a retryable
  error, and a subsequent read shows zero campaigns for this user matching this attempt

#### Scenario: Arc insert fails after campaign, NPC, and faction inserts succeed

- GIVEN an authenticated DM and a reviewed payload with at least one arc
- WHEN the campaign, npc, and faction inserts succeed but the arc insert fails (e.g.
  transient DB error)
- THEN the use case deletes the just-created campaign row (cascading its already-inserted
  npcs and factions), the response is a retryable error, and a subsequent read shows zero
  campaigns for this user matching this attempt

#### Scenario: Compensating delete also fails

- GIVEN the scenario above, and the compensating delete itself fails
- WHEN `POST /campaigns` returns its error response
- THEN the response includes the orphaned campaign id for manual cleanup, and the
  failure is logged

---

## Non-functional requirements

### NFR-CP-1: No service-role client on this path

The create-campaign use case and its repository implementation MUST NOT construct or
use the service-role Supabase client (`get_supabase_client()`) for any write in this
endpoint. See `per-user-supabase-access` spec for the required client.

### NFR-CP-2: Ordered inserts, not a Postgres RPC

This endpoint MUST implement persistence via ordered application-level inserts with a
compensating delete, not a `SECURITY DEFINER` or `SECURITY INVOKER` Postgres RPC. (A
`SECURITY DEFINER` RPC would bypass RLS entirely and MUST NOT be introduced for this
purpose.)

### NFR-CP-3: Additive migration adds `content_source` to `arcs`

This capability requires one additive migration —
`supabase/migrations/<timestamp>_add_content_source_to_arcs.sql` containing
`alter table arcs add column content_source content_source;` — using the
`content_source` enum type that already exists for `npcs`/`factions`. The migration MUST
be nullable with no default and no backfill (zero-downtime, backward-compatible). This is
the first migration since the base schema (`20260628101707_initial_schema.sql`); it MUST
NOT alter, drop, or rename any existing column, table, enum, or RLS policy.

---

## Acceptance criteria

1. `POST /campaigns` accepts the request shape in CP-001, including `arcs`, and
   returns `{ "id": <uuid> }` on success. (CP-001)
2. The endpoint depends on `get_current_user`; unauthenticated requests are rejected
   with HTTP 401 and no rows are written. (CP-002)
3. A valid reviewed payload results in one campaign row, N npc rows, M faction rows,
   and P arc rows (each with `status = "open"` and a persisted `content_source`), all
   correctly linked. (CP-003)
4. An app-layer test proves campaigns are created under the authenticated user's
   `user_id` and that no client-supplied field can attribute a campaign to a different
   user. (CP-004)
5. A simulated child-insert failure after a successful campaign insert triggers a
   compensating delete, leaves no orphaned campaign, and returns a retryable error that
   preserves the DM's payload for retry. (CP-005)
6. If the compensating delete fails, the error response surfaces the orphaned campaign
   id and the failure is logged. (CP-005)
7. No code path in this endpoint uses the service-role Supabase client. (NFR-CP-1)
8. The additive migration adds `content_source` to `arcs` as a nullable column with no
   default and no backfill, and does not modify any other existing schema object.
   (NFR-CP-3)
