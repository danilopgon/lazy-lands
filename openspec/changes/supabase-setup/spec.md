# Spec: supabase-setup

> Canonical OpenSpec delta: `openspec/changes/supabase-setup/specs/supabase-setup/spec.md`.
>
> This root-level file is retained only for legacy readers that still open
> `openspec/changes/supabase-setup/spec.md` directly. The dispatcher reads the nested path above,
> and that nested spec is authoritative.

## Canonical consistency note

The canonical nested spec reflects the accepted PR #9 review fixes:

- `campaigns.user_id` MUST reference `auth.users(id)` with `ON DELETE CASCADE`.
- `sessions` MUST expose `UNIQUE (campaign_id, id)` so `memory_facts` can use a tenant-scoped
  composite FK.
- `memory_facts(campaign_id, source_session_id)` MUST reference `sessions(campaign_id, id)` with
  `ON DELETE CASCADE`, preventing a memory fact from pointing at a session in another campaign.
- `supabase/seed.sql` MUST contain no campaign/session rows because it runs before the fixed local
  auth user exists.
- `supabase/scripts/seed-auth.ts` MUST create or detect the fixed local auth user first, then insert
  the deterministic local campaign and two sessions idempotently.
- Cloud deployment MUST apply migrations only; local seed data and `pnpm supabase:seed-auth` are not
  part of the hosted deployment workflow.

Read and update the canonical nested spec for full requirements, scenarios, and acceptance criteria.
