-- Additive, nullable: arcs gain the same provenance column as npcs/factions.
-- No default, no backfill, no destructive change to any existing schema object.
alter table arcs add column content_source content_source;
