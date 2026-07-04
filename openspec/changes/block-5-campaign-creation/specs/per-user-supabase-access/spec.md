# Spec: per-user-supabase-access

**Change**: block-5-campaign-creation
**Capability**: `per-user-supabase-access` (new)

---

## Overview

Every backend write of user-owned data (campaigns, NPCs, factions, arcs, and all future
user-owned rows) MUST go through a Supabase client authenticated as the calling user, so
that `auth.uid()` resolves inside Postgres and RLS policies correctly scope the write to
that user. Today `services/api/app/shared/database.py` only exposes a service-role
singleton client, which is documented as admin/seed-only and explicitly forbidden for
feature-module user-data reads/writes (see `jwt-auth` spec, JA-004). This spec adds the
missing per-request, JWT-bound client and formalizes the constraint that campaign writes
MUST use it.

---

## Functional requirements

### PU-001: Per-request, JWT-bound Supabase client factory

`services/api/app/shared/` MUST provide a factory that, given the caller's raw bearer
token, constructs a Supabase client authenticated as that user (e.g. via
`client.postgrest.auth(token)` or an equivalent per-request `create_client` call using
the token). This client MUST be constructed fresh per request — it MUST NOT be cached
or reused as a process-level singleton, since it carries a request-scoped credential.

#### Scenario: Per-user client resolves auth.uid() correctly

- GIVEN a valid Supabase JWT for User A
- WHEN the per-user client factory is used to construct a client with that token, and
  that client performs an insert into a table with a `user_id = auth.uid()` RLS policy
- THEN the insert succeeds and the row's `user_id` matches User A's id

---

### PU-002: Raw bearer token exposed to use cases

The dependency chain MUST expose the raw bearer token to any use case that needs to
construct a per-user client, in addition to the resolved user id already provided by
`get_current_user`. This MAY be implemented either by extending `get_current_user` to
return both values, or by adding a sibling dependency — the exact shape is a `design`
decision, but the token MUST be available wherever `campaign-persistence` needs it.

#### Scenario: A route handler can obtain both the user id and the raw token

- GIVEN an authenticated request with a valid JWT
- WHEN the campaign-creation route handler executes
- THEN it has access to both the authenticated user's id and the raw bearer token
  needed to construct the per-user Supabase client

---

### PU-003: Service-role client is forbidden for user-owned writes

The service-role client (`get_supabase_client()`) MUST NOT be used, directly or
indirectly, by the `campaigns` module's repository implementation for any write of
campaign, NPC, faction, or arc data. This is a hard constraint carried forward from the
`jwt-auth` spec's forward requirement (JA-004) and is binding on this and all future
blocks that write user-owned data.

#### Scenario: Campaign repository never imports the service-role client for writes

- GIVEN the `SupabaseCampaignRepository` implementation
- WHEN its write methods (create campaign, create NPC, create faction, create arc) are
  inspected
- THEN none of them construct or depend on `get_supabase_client()`; all writes go
  through the per-user client

---

## Non-functional requirements

### NFR-PU-1: No cross-request credential leakage

The per-user client factory MUST NOT retain or log the raw bearer token beyond the
lifetime of the request it was constructed for.

### NFR-PU-2: Correctness verified at the app layer, not only via raw SQL

Because the existing RLS test suite (`test_rls.py`) validates policies via raw SQL and
does not exercise the app-layer client construction, this capability MUST be covered by
at least one app-layer (not raw-SQL) test proving the per-user client causes
`auth.uid()` to resolve correctly for a real HTTP request path (see `campaign-persistence`
spec, CP-004).

---

## Acceptance criteria

1. A per-request, JWT-bound Supabase client factory exists in `services/api/app/shared/`
   and is not a process-level singleton. (PU-001)
2. A route handler in the `campaigns` module has access to both the authenticated
   user's id and the raw bearer token. (PU-002)
3. `SupabaseCampaignRepository`'s write methods do not use the service-role client.
   (PU-003)
4. An app-layer test (not raw SQL) proves the per-user client resolves `auth.uid()`
   correctly for a real request. (NFR-PU-2)
