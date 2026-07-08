# Handoff Deviation Conventions

`DESIGN.md` and `handoff/` remain the visual source of truth, but they are not allowed to preserve a known bug or UX regression.

## Decision Rule

If an approved bug fix or UX improvement conflicts with the handoff, the approved fix can win over the prototype.

That exception must be explicit. Do not silently deviate from handoff and do not silently preserve a known UX bug just to match the prototype.

## Localization Rule

Handoff prototype text is authored in English and remains the visual/copy reference for the English catalog. Any production UI task that touches those screens or components must localize the resulting user-facing copy in both English and Spanish message files.

Do not copy new English literals from `handoff/` directly into production components without adding the matching Spanish catalog entry. Handoff fidelity and bilingual production copy are both required; untranslated literals are implementation debt.

## Required Process

When a bug fix or improvement conflicts with the handoff during implementation, handoff review, or SDD planning:

1. Surface the contradiction explicitly to the user.
2. Explain the UX/product reason for deviating from the handoff.
3. Record the decision in the relevant issue, PR, SDD artifact, or docs.
4. Implement the approved bug fix or improvement instead of silently matching the outdated handoff.

## Example

If the handoff shows a single-line input for a long campaign review field, but a tracked UX bug requires comfortable paragraph editing, the implementation should use a textarea after the contradiction is called out and approved.

## Block 7a — Log Session screen deviations

The `handoff/` Log Session prototype includes several fields that the Block 7a
backend deliberately does not persist. Each is dropped for the reason below,
per `AGENTS.md`'s "do not implement features outside the current spec" rule
and the `sessions` table schema in
`supabase/migrations/20260628101707_initial_schema.sql`.

| Handoff field | Reason dropped |
|---|---|
| Session title | No `title` column on `sessions`; sessions are identified by `session_number`. Adding it is a schema change outside Block 7a's locked two-field contract (`summary` + `consequences`). |
| Editable Session # | `session_number` is server-assigned as `MAX(session_number) + 1` scoped to `campaign_id` (design Decision 2); accepting a client-supplied number would let a forged value break ordering/uniqueness assumptions with no `unique(campaign_id, session_number)` constraint to guard it. |
| Changes to the world (dedicated field) | Folded into the existing `consequences` column per the roadmap wording; no separate `world_state_delta` column exists, and adding one is out of MVP scope for this block. |
| Changes to NPCs | No column/table captures a per-session NPC delta; NPC state changes are DM-authored edits via the existing `PATCH /npcs/{id}` endpoint, not a session-registration side effect. |
| Changes to factions | Same reasoning as NPCs — no per-session faction-delta column; faction state changes go through `PATCH /factions/{id}`. |
| Arcs touched (multi-select) | Would require a session-arc join table, which is a migration; deferred to 7b+ per the design's "7a -> 7b seam" section. |
| Private DM notes | No column, and no migration is planned for it in 7a. The "never sent to the LLM, never exported" boundary this field implies is explicitly out of scope for this block — introducing the field without that boundary would be a silent regression, not a deviation. |

These fields are all reference-only in `handoff/`; the production `LogSessionView` implements only `summary` (required) and `consequences` (optional).
