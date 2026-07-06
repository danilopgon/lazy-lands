-- Migration B (Block 6, WU3): reconcile `arc_status` to the product's stable
-- lowercase codes (design Decision 9). `RENAME VALUE` rewrites existing rows
-- implicitly — every 'open' row reads back as 'active' and every 'dropped' row
-- as 'discarded' with no UPDATE. `resolved` is unchanged; `dormant` is net-new.
--
-- Target set: active, dormant, resolved, discarded. Display labels
-- (Active/Dormant/Resolved/Discarded) live in the frontend, never stored.

alter type arc_status rename value 'open' to 'active';
alter type arc_status rename value 'dropped' to 'discarded';
alter type arc_status add value if not exists 'dormant';
