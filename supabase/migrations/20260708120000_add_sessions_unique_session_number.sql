-- Additive, forward-only: backstop MAX(session_number)+1 numbering (Block 7a
-- design Decision 2) with a real uniqueness constraint. The sessions feature
-- is brand new and has no existing rows in production, so this cannot
-- conflict with existing data; still added defensively (no destructive change
-- to any existing schema object, matching the repo's migration convention).
--
-- The application-layer repository now detects a unique-violation on insert
-- and retries with a freshly recomputed MAX(session_number)+1 (bounded
-- attempts) rather than trusting the race-prone read-then-insert alone.
alter table sessions
  add constraint sessions_campaign_id_session_number_key
  unique (campaign_id, session_number);
