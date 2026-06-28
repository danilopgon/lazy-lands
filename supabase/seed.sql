-- Seed data for local Supabase development.
--
-- This file is executed by `supabase db reset` as the postgres superuser,
-- before the matching auth user exists. Do not add a foreign key from
-- campaigns.user_id to auth.users: the matching auth user is created later by
-- supabase/scripts/seed-auth.ts using the same fixed UUID below.

insert into campaigns (id, user_id, title)
values (
  '10000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  'Dev Campaign'
);

insert into sessions (id, campaign_id, session_number)
values
  (
    '20000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    1
  ),
  (
    '20000000-0000-0000-0000-000000000002',
    '10000000-0000-0000-0000-000000000001',
    2
  );
