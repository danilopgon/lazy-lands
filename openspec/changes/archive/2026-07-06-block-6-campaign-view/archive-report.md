# Archive Report — block-6-campaign-view

**Archived:** 2026-07-06
**Status:** COMPLETE — implemented, verified (APPROVED), CI green, docs done.

## Summary

Block 6 (campaign view) delivered the DM's read UI (WU2) plus persistence and
write paths (WU3): `system`/`tone` columns, the `arc_status` enum reconciliation,
full backend CRUD for NPCs/factions/arcs + campaign PATCH with a create
ownership pre-check, and the frontend mutation client, world-state editor, and
entity create/edit/delete modals. Docs updated (WU4).

## Verification

- Adversarial dual review (Judgment Day, 3 rounds) → **APPROVED** by both judges.
- CI (PR #32): backend and frontend jobs green.
- See `verify-report.md` for details. Two capabilities (`campaign-view`,
  `entity-management`) were merged into `openspec/specs/`.

## Delta specs merged into source of truth

- `openspec/specs/campaign-view/spec.md`
- `openspec/specs/entity-management/spec.md`

## Delivery

- Branch: `feat/block-6-campaign-view-wu2` → PR #32.
- Key commits: read UI + fixes → 3A system/tone → 3B arc enum → 3C backend CRUD
  → 3D mutations/editor/modals → judgment-day hardening → WU4 docs.

## Non-blocking follow-ups (carried forward)

- Direct-API null-clear of campaign `system`/`world_state`; 404 typing in the
  mutation client; UUID validation on ids; whitespace-only name allowance.

## Next

Block 7 — sessions (post-session registration) and memory review; unblocks the
"coming in a later chapter" placeholder slots left in the campaign detail view.
