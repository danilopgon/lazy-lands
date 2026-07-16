-- Add an explicit lifecycle marker to `sessions`, replacing the inferred
-- "is this an open draft?" predicate (`generated_content is not null and
-- consequences is null`) that the frontend used to reconstruct.
--
-- The inference was unsound: `consequences` is OPTIONAL when the DM records a
-- played session, so completing a prepared session with a summary alone left
-- `generated_content` filled and `consequences` null — indistinguishable from
-- a never-played draft. The next Log Session visit then defaulted to
-- completing that same row and OVERWROTE the real recorded chronicle. The
-- information needed to tell the two apart does not exist on the row; it has
-- to be stored.

create type session_status as enum ('draft', 'registered');

-- The default is deliberately 'registered', the fail-safe direction.
--
-- If a writer forgets to mark a genuine draft, the worst case is the old
-- duplicate-row bug: a second session row is inserted. That is noisy but
-- recoverable — no chronicle is lost.
--
-- If the default were 'draft', a forgotten mark would make an already-played
-- session look resumable, and completing it would OVERWRITE the DM's real
-- record. That is unrecoverable data loss.
--
-- Never default to the destructive direction.
alter table sessions
  add column status session_status not null default 'registered';

-- No legacy row is backfilled to 'draft'. Existing columns cannot distinguish a
-- genuine unfinished generated draft from a completed generated session whose
-- optional consequences were omitted. The migration therefore conservatively
-- leaves every historical row as 'registered'. This can hide a historical draft
-- from the resume affordance, but cannot offer a completed chronicle for a
-- destructive overwrite. Only newly generated rows are explicitly persisted as
-- 'draft' by the application.
comment on column sessions.status is
  'Persisted session lifecycle. Legacy rows default to registered because completion cannot be inferred from nullable consequences.';
