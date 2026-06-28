-- Lazy Lands — initial schema migration
--
-- Establishes the campaign-data relational schema for Lazy Lands:
--   - 5 enum types (values from docs/03-domain-model.md — the domain source of
--     truth; NOT the stale table in proposal/design)
--   - 6 tables (parent-first): campaigns -> sessions, npcs, factions, arcs,
--     memory_facts (child of campaigns; memory_facts.source_session_id also
--     references sessions)
--   - ENABLE ROW LEVEL SECURITY on all 6 tables
--   - 24 RLS policies (SELECT / INSERT / UPDATE / DELETE per table):
--       campaigns -> direct ownership: user_id = auth.uid()
--       child tables -> EXISTS sub-select against the parent campaign
--   - GRANTs: schema USAGE to anon/authenticated/service_role; table DML to
--     authenticated; ALL to service_role; NO table grants to anon
--
-- Design decision D1 (load-bearing): campaigns.user_id has NO foreign key to
-- auth.users. seed.sql runs BEFORE seed-auth.ts creates the auth user, so an
-- FK would break `supabase db reset`. Ownership is enforced by RLS, not by a
-- referential constraint.
--
-- Postgres 17 provides gen_random_uuid() in core — no pgcrypto extension.

-- =============================================================================
-- 1. Enum types
-- =============================================================================

create type content_source as enum ('llm', 'edited', 'manual');
create type arc_status     as enum ('open', 'resolved', 'dropped');
create type priority       as enum ('high', 'medium', 'low');
create type importance     as enum ('high', 'medium', 'low');
create type memory_status  as enum ('active', 'archived');

-- =============================================================================
-- 2. Tables (parent-first)
-- =============================================================================

-- campaigns (parent; no FK to auth.users — see design D1)
create table campaigns (
  id                        uuid primary key default gen_random_uuid(),
  user_id                   uuid not null,
  title                     text not null,
  description               text,
  world_state               text,
  accumulated_summary       text,
  summarized_up_to_session  integer,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

-- sessions (child of campaigns; referenced by memory_facts)
create table sessions (
  id               uuid primary key default gen_random_uuid(),
  campaign_id      uuid not null references campaigns (id) on delete cascade,
  session_number   integer not null,
  summary          text,
  consequences     text,
  generated_content jsonb,
  trace_json       jsonb,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- npcs (child of campaigns)
create table npcs (
  id              uuid primary key default gen_random_uuid(),
  campaign_id     uuid not null references campaigns (id) on delete cascade,
  name            text not null,
  description     text,
  current_state   text,
  motivation      text,
  content_source  content_source,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- factions (child of campaigns)
create table factions (
  id              uuid primary key default gen_random_uuid(),
  campaign_id     uuid not null references campaigns (id) on delete cascade,
  name            text not null,
  description     text,
  current_stance  text,
  goals           text,
  content_source  content_source,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- arcs (child of campaigns)
create table arcs (
  id           uuid primary key default gen_random_uuid(),
  campaign_id  uuid not null references campaigns (id) on delete cascade,
  title        text not null,
  description  text,
  status        arc_status,
  priority      priority,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- memory_facts (child of campaigns; also references sessions)
create table memory_facts (
  id                 uuid primary key default gen_random_uuid(),
  campaign_id        uuid not null references campaigns (id) on delete cascade,
  source_session_id  uuid references sessions (id) on delete cascade,
  content            text not null,
  type               text,
  importance          importance,
  status              memory_status,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

-- =============================================================================
-- 3. Enable Row Level Security on all 6 tables
-- =============================================================================

alter table campaigns    enable row level security;
alter table sessions     enable row level security;
alter table npcs         enable row level security;
alter table factions     enable row level security;
alter table arcs         enable row level security;
alter table memory_facts enable row level security;

-- =============================================================================
-- 4. RLS policies (24 total: SELECT / INSERT / UPDATE / DELETE per table)
-- =============================================================================
--
-- Verb conventions:
--   SELECT, DELETE -> using (<predicate>)
--   INSERT         -> with check (<predicate>)
--   UPDATE         -> using (<predicate>) with check (<predicate>)

-- ---- campaigns: direct ownership (4 policies) -------------------------------

create policy campaigns_select on campaigns
  for select using (user_id = auth.uid());

create policy campaigns_insert on campaigns
  for insert with check (user_id = auth.uid());

create policy campaigns_update on campaigns
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy campaigns_delete on campaigns
  for delete using (user_id = auth.uid());

-- ---- sessions: ownership via parent campaign (4 policies) --------------------

create policy sessions_select on sessions
  for select using (
    exists (
      select 1 from campaigns
      where campaigns.id = sessions.campaign_id
        and campaigns.user_id = auth.uid()
    )
  );

create policy sessions_insert on sessions
  for insert with check (
    exists (
      select 1 from campaigns
      where campaigns.id = sessions.campaign_id
        and campaigns.user_id = auth.uid()
    )
  );

create policy sessions_update on sessions
  for update using (
    exists (
      select 1 from campaigns
      where campaigns.id = sessions.campaign_id
        and campaigns.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from campaigns
      where campaigns.id = sessions.campaign_id
        and campaigns.user_id = auth.uid()
    )
  );

create policy sessions_delete on sessions
  for delete using (
    exists (
      select 1 from campaigns
      where campaigns.id = sessions.campaign_id
        and campaigns.user_id = auth.uid()
    )
  );

-- ---- npcs: ownership via parent campaign (4 policies) -----------------------

create policy npcs_select on npcs
  for select using (
    exists (
      select 1 from campaigns
      where campaigns.id = npcs.campaign_id
        and campaigns.user_id = auth.uid()
    )
  );

create policy npcs_insert on npcs
  for insert with check (
    exists (
      select 1 from campaigns
      where campaigns.id = npcs.campaign_id
        and campaigns.user_id = auth.uid()
    )
  );

create policy npcs_update on npcs
  for update using (
    exists (
      select 1 from campaigns
      where campaigns.id = npcs.campaign_id
        and campaigns.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from campaigns
      where campaigns.id = npcs.campaign_id
        and campaigns.user_id = auth.uid()
    )
  );

create policy npcs_delete on npcs
  for delete using (
    exists (
      select 1 from campaigns
      where campaigns.id = npcs.campaign_id
        and campaigns.user_id = auth.uid()
    )
  );

-- ---- factions: ownership via parent campaign (4 policies) -------------------

create policy factions_select on factions
  for select using (
    exists (
      select 1 from campaigns
      where campaigns.id = factions.campaign_id
        and campaigns.user_id = auth.uid()
    )
  );

create policy factions_insert on factions
  for insert with check (
    exists (
      select 1 from campaigns
      where campaigns.id = factions.campaign_id
        and campaigns.user_id = auth.uid()
    )
  );

create policy factions_update on factions
  for update using (
    exists (
      select 1 from campaigns
      where campaigns.id = factions.campaign_id
        and campaigns.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from campaigns
      where campaigns.id = factions.campaign_id
        and campaigns.user_id = auth.uid()
    )
  );

create policy factions_delete on factions
  for delete using (
    exists (
      select 1 from campaigns
      where campaigns.id = factions.campaign_id
        and campaigns.user_id = auth.uid()
    )
  );

-- ---- arcs: ownership via parent campaign (4 policies) -----------------------

create policy arcs_select on arcs
  for select using (
    exists (
      select 1 from campaigns
      where campaigns.id = arcs.campaign_id
        and campaigns.user_id = auth.uid()
    )
  );

create policy arcs_insert on arcs
  for insert with check (
    exists (
      select 1 from campaigns
      where campaigns.id = arcs.campaign_id
        and campaigns.user_id = auth.uid()
    )
  );

create policy arcs_update on arcs
  for update using (
    exists (
      select 1 from campaigns
      where campaigns.id = arcs.campaign_id
        and campaigns.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from campaigns
      where campaigns.id = arcs.campaign_id
        and campaigns.user_id = auth.uid()
    )
  );

create policy arcs_delete on arcs
  for delete using (
    exists (
      select 1 from campaigns
      where campaigns.id = arcs.campaign_id
        and campaigns.user_id = auth.uid()
    )
  );

-- ---- memory_facts: ownership via parent campaign (4 policies) ---------------

create policy memory_facts_select on memory_facts
  for select using (
    exists (
      select 1 from campaigns
      where campaigns.id = memory_facts.campaign_id
        and campaigns.user_id = auth.uid()
    )
  );

create policy memory_facts_insert on memory_facts
  for insert with check (
    exists (
      select 1 from campaigns
      where campaigns.id = memory_facts.campaign_id
        and campaigns.user_id = auth.uid()
    )
  );

create policy memory_facts_update on memory_facts
  for update using (
    exists (
      select 1 from campaigns
      where campaigns.id = memory_facts.campaign_id
        and campaigns.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from campaigns
      where campaigns.id = memory_facts.campaign_id
        and campaigns.user_id = auth.uid()
    )
  );

create policy memory_facts_delete on memory_facts
  for delete using (
    exists (
      select 1 from campaigns
      where campaigns.id = memory_facts.campaign_id
        and campaigns.user_id = auth.uid()
    )
  );

-- =============================================================================
-- 5. GRANTs
-- =============================================================================
--
-- auto_expose_new_tables is unset in config.toml, so new public tables are NOT
-- auto-exposed to the Data API roles. Explicit GRANTs are required for
-- PostgREST and the SET ROLE authenticated RLS tests to work.
--
--   authenticated -> table DML granted; RLS narrows visibility to owned rows.
--   anon         -> NO table privileges (campaign data is never public). An
--                   unauthenticated request gets InsufficientPrivilege, NOT
--                   an empty result set — this is what test_rls.py verifies.
--   service_role  -> full access; bypasses RLS (trusted server-side only).
--
-- No sequence GRANTs needed — all PKs are UUIDs (gen_random_uuid()).

grant usage on schema public to anon, authenticated, service_role;

-- Authenticated users operate on all tables; RLS scopes them to their own rows.
grant select, insert, update, delete on all tables in schema public to authenticated;

-- service_role is used by trusted backend code; it also bypasses RLS.
grant all on all tables in schema public to service_role;

-- NOTE: anon is intentionally granted NO table privileges. No campaign data is
-- public.