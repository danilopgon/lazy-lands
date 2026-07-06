-- Migration A (Block 6, WU3): persist campaign `system` and `tone`.
--
-- Additive and nullable, no backfill (design §8.1). These two columns were
-- deliberately deferred in WU1 (see 8a966af "drop system/tone from WU1 reads
-- until WU3 adds the columns"); the reads re-select them in this same unit.
-- The extraction fold (`composeRawText`) is untouched — system/tone are
-- persisted from the reviewed create payload, not re-derived from raw_text.

alter table campaigns add column system text;
alter table campaigns add column tone text;
