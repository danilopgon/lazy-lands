# ADR-04 — Auth and DB: Supabase as Unified Service

**Status:** Accepted  
**Date:** 2025  
**Area:** Infrastructure / Auth / Persistence

## Context and problem

The MVP needs user authentication and relational data persistence. Options range from separate
solutions (Auth0 + own PostgreSQL) to unified services like Supabase or Firebase.

## Alternatives evaluated

| Option | Pros | Cons |
|---|---|---|
| Auth0 + own PostgreSQL | Full control, clear separation | Two services to manage, complex setup for MVP |
| Firebase | Fast setup, integrated auth + DB | NoSQL — poor fit for the relational campaign/session/NPC model |
| **Supabase** ✅ | Auth + PostgreSQL + RLS in one service, real SQL, native RLS, SDK compatible with Next.js/React | Moderate vendor lock-in, RLS requires attention to avoid production mistakes |

## Decision

Supabase for the MVP. Auth + DB + RLS in one service reduces infra complexity without
sacrificing the relational model the domain needs.

FastAPI validates the Supabase JWT on every request. Supabase knows nothing about the
application backend — the contract is only the JWT.

Ownership is enforced by RLS policies (`user_id = auth.uid()`), not by a foreign key
constraint to `auth.users`. Child tables use an `EXISTS` sub-select against the parent
campaign to propagate ownership without duplicating the user_id column.

## Consequences

**Positive:**

- Auth setup in hours, not days.
- Native RLS in PostgreSQL: per-user data isolation without extra logic in the backend.
- Real SQL — the relational model Campaign → Sessions → NPCs → Factions → MemoryFacts works
  directly.

**Negative / trade-offs:**

- Moderate vendor lock-in: migrating to own PostgreSQL would require rewriting the auth layer
  and RLS policies.
- Misconfigured RLS policies are silent — a configuration error can expose another user's data
  without a visible error.

## RLS pattern used

- `campaigns`: direct ownership (`user_id = auth.uid()`).
- All child tables (`sessions`, `npcs`, `factions`, `arcs`, `memory_facts`): `EXISTS` sub-select
  on `campaigns` to verify the parent belongs to the authenticated user.
- `anon` role: no table privileges — unauthenticated requests receive `permission denied`,
  not an empty result set.
