# Handoff Deviation Conventions

`DESIGN.md` and the shipped `apps/web/` screens are the visual source of truth (see the
`frontend-handoff-contract` skill's `route-map.md`), but they are not allowed to preserve a
known bug or UX regression.

## Decision Rule

If an approved bug fix or UX improvement conflicts with the reference substrate (the shipped
sibling screen, or `DESIGN.md` + `PRODUCT.md` for a new screen), the approved fix can win.

That exception must be explicit. Do not silently deviate from the reference substrate and do
not silently preserve a known UX bug just to match it.

## Localization Rule

Handoff checklists produced by SDD phases may cite English copy as the visual/copy reference.
Any production UI task that touches those screens or components must localize the resulting
user-facing copy in both English and Spanish message files (`apps/web/messages/en.json` and
`es.json`).

Do not hard-code new English literals in production components without adding the matching
Spanish catalog entry. Handoff fidelity and bilingual production copy are both required;
untranslated literals are implementation debt.

## Required Process

When a bug fix or improvement conflicts with the reference substrate during implementation,
handoff review, or SDD planning:

1. Surface the contradiction explicitly to the user.
2. Explain the UX/product reason for deviating from it.
3. Record the decision in the relevant issue, PR, SDD artifact, or docs.
4. Implement the approved bug fix or improvement instead of silently matching the outdated reference.

## Example

If the reference substrate shows a single-line input for a long campaign review field, but a
tracked UX bug requires comfortable paragraph editing, the implementation should use a textarea
after the contradiction is called out and approved.

## Block 7a — Log Session screen deviations (historical)

The original Log Session prototype (removed in Block 11; see `docs/10-roadmap.md`) included
several fields that the Block 7a backend deliberately did not persist. Each was dropped for the
reason below, per `AGENTS.md`'s "do not implement features outside the current spec" rule and
the `sessions` table schema in `supabase/migrations/20260628101707_initial_schema.sql`.

| Prototype field | Reason dropped |
|---|---|
| Session title | No `title` column on `sessions`; sessions are identified by `session_number`. Adding it is a schema change outside Block 7a's locked two-field contract (`summary` + `consequences`). |
| Editable Session # | `session_number` is server-assigned as `MAX(session_number) + 1` scoped to `campaign_id` (design Decision 2); accepting a client-supplied number would let a forged value break ordering/uniqueness assumptions with no `unique(campaign_id, session_number)` constraint to guard it. |
| Changes to the world (dedicated field) | Folded into the existing `consequences` column per the roadmap wording; no separate `world_state_delta` column exists, and adding one is out of MVP scope for this block. |
| Changes to NPCs | No column/table captures a per-session NPC delta; NPC state changes are DM-authored edits via the existing `PATCH /npcs/{id}` endpoint, not a session-registration side effect. |
| Changes to factions | Same reasoning as NPCs — no per-session faction-delta column; faction state changes go through `PATCH /factions/{id}`. |
| Arcs touched (multi-select) | Would require a session-arc join table, which is a migration; deferred to 7b+ per the design's "7a -> 7b seam" section. |
| Private DM notes | No column, and no migration is planned for it in 7a. The "never sent to the LLM, never exported" boundary this field implies is explicitly out of scope for this block — introducing the field without that boundary would be a silent regression, not a deviation. |

These fields were reference-only in the original prototype; the production `LogSessionForm`
implements only `summary` (required) and `consequences` (optional).
