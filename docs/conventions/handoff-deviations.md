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
