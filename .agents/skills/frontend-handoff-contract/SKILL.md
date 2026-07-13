---
name: frontend-handoff-contract
description: 'Trigger: implementing frontend page, UI component, screen, or route. Mandatory handoff-first contract — read the shipped screen + `DESIGN.md`, extract checklist, implement, adversarial self-review before completion.'
license: Apache-2.0
metadata:
  author: gentleman-programming
  version: '1.0'
---

## Activation Contract

Activate when ANY of these are true:

- Implementing a page, screen, or route in `apps/web/`
- Building or modifying a UI component that maps to a shipped screen or a new screen with a design precedent
- Any SDD task that touches frontend rendering

This skill is MANDATORY, not advisory. It defines a hard workflow that must be followed in order. Skipping steps is not permitted.

## Hard Rules

1. **`DESIGN.md` + the shipped `apps/web/` screen define what to build.** For a screen with no shipped precedent, `DESIGN.md` + `PRODUCT.md` + the spec's handoff checklist are authoritative. If the spec contradicts the design system, flag the conflict — do not silently deviate.
2. **Read before writing.** Never write a single line of implementation code before completing the Pre-Implementation phase below.
3. **Self-review before declaring done.** Never report task completion before completing the Adversarial Self-Review phase below.
4. **No copy placeholders.** Every field, label, state, and interaction from the reference substrate (the shipped screen, `DESIGN.md`, or the spec's checklist) must exist in the implementation. "I'll add it later" is not acceptable.
5. **Design tokens are non-negotiable.** Use CSS custom properties from DESIGN.md. Never hardcode colors, shadows, or border-radius.
6. **Approved bug fixes and UX improvements can override the reference.** If a bug or improvement proves the shipped screen is ergonomically wrong, surface the contradiction to the user explicitly and follow the approved fix. Never silently deviate and never preserve a known bug just to match the shipped screen.

## Execution Steps

### Phase 1: Pre-Implementation (BEFORE writing code)

1. **Identify the route** being implemented (e.g., `/campaigns/new`).
2. **Read `references/route-map.md`** to find the shipped screen file and component name (or confirm it is marked `— not shipped —`).
3. **Read the shipped screen source** (the `page.tsx` + its presentational components under `apps/web/components/**`). If there is no shipped precedent, read the nearest shipped sibling screen instead and skip this step's exact-file requirement.
4. **Read the shared production primitives** under `apps/web/components/**` referenced in `route-map.md`'s Shared Components table (Field, Notice, LoadingScribe, etc.).
5. **Read `DESIGN.md`** sections relevant to the screen (tokens, typography, component patterns).
6. **Extract a checklist** from the shipped screen (or, for a new screen, from `DESIGN.md` + `PRODUCT.md` + the spec's handoff checklist + the nearest shipped sibling). Write it down explicitly:
   - [ ] Every field (label, type, required/optional, placeholder, validation)
   - [ ] Layout structure (grid, columns, containers, cards)
   - [ ] Copy text (kicker, h1, subtitle, labels, button text — exact strings)
   - [ ] States (loading, empty, error, success — what triggers each)
   - [ ] Interactions (navigation, form submission, validation timing)
   - [ ] Shared components used (Field, Loading, ErrorNotice, etc.)
   - [ ] Design tokens referenced (colors, shadows, typography)
   - [ ] Motion requirements (entrance animations, action feedback, transitions — check if the reference substrate uses `.ll-view-enter`, `.ll-rise`, `.ll-stamp`, `.ll-strike`, `.ll-quill`, button press physics)

### Phase 2: Implementation

- Build against the checklist. One item at a time.
- Use existing design system components (shadcn/ui + custom Lazy Lands primitives).
- Map the design-system `.ll-*` CSS classes (documented in `DESIGN.md`) to Tailwind + CSS custom properties:
  - `.ll-paper` → Card with `border-2 border-[var(--border)] shadow-[6px_6px_0_var(--shadow)] bg-[var(--paper)]`
  - `.ll-input` → Input with `border-[1.5px] border-dashed border-[var(--dotted)] rounded-none`
  - `.ll-label` → `font-mono text-[10px] font-semibold uppercase tracking-[0.1em]`
  - `.ll-kicker` → `font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--accent)]`
  - `.ll-btn.accent` → Button with `bg-[var(--accent)] text-white shadow-[4px_4px_0_var(--shadow)] hover:translate-x-[1.5px] hover:translate-y-[1.5px] hover:shadow-[2px_2px_0_var(--shadow)]`
- If a shared production primitive under `apps/web/components/**` is needed (LoadingScribe, Notice, Field, etc.) and does not exist in the codebase yet, implement it as a reusable component first.

### Phase 3: Adversarial Self-Review (MANDATORY before declaring done)

After implementation, perform this review. Do NOT skip. Do NOT abbreviate.

1. **Re-read the reference substrate** (the shipped sibling/precedent screen + `DESIGN.md` from Phase 1).
2. **Re-read your implementation** side by side.
3. **Check every checklist item** from Phase 1:
   - Is every field present? (name, type, placeholder, validation, required/optional)
   - Is every state implemented? (loading, error, empty)
   - Is the copy exact? (compare character by character — do not paraphrase)
   - Is the layout structure identical? (grid columns, card wrappers, spacing)
   - Are shared components used where the reference substrate uses them?
4. **Check design system compliance:**
   - Zero border-radius on everything?
   - Hard ink shadows (no blur)?
   - CSS custom properties for all colors (no hardcoded hex)?
   - Correct typography (mono for labels, serif for headings, sans for body)?
   - Button press physics (translate + shadow shrink on hover)?
5. **Check motion compliance (if `data-motion="full"`):**
   - Route transitions: fade + 10px rise on page enter (`.ll-view-enter`)?
   - Button press physics: `:hover` nudges `translate(1.5px,1.5px)` and shrinks shadow?
   - Loading state: animated quill (`.ll-quill`) + mono caption with ellipsis?
   - Accept actions: stamp animation (green "★ Accepted" drops in rotated)?
   - Dismiss actions: strike-through draws across, then card slides off-page?
   - Section reveals: ink rule draws left→right (`.ll-rule-anim`)?
   - Element entrances: subtle 8px rise + fade (`.ll-rise`)?
   - Respect `prefers-reduced-motion: reduce`?
   - `data-motion="subtle"`: drop decorative entrances, keep action feedback?
   - `data-motion="off"`: remove all animations and transitions?
6. **Generate a compliance report.** States are the most commonly-missed
   category — you MUST enumerate every reference state on its own line, never
   collapse them into a single "states: X/Z" score. A state that exists in the
   reference but not the implementation (or is implemented with a weaker pattern —
   e.g. a disabled button instead of a full loading takeover) is a FAIL, not a
   rounding error.
   ```
   ## Compliance Report
   - Structure: X/Y elements match
   - Copy: X/Y strings exact (list any paraphrased/generic vs the reference voice)
   - States (one row PER reference state — loading, error, empty, success, …):
     - loading: reference = <what it shows> | impl = <what it shows> | MATCH/GAP
     - error:   reference = <…>            | impl = <…>            | MATCH/GAP
     - empty:   reference = <…>            | impl = <…>            | MATCH/GAP
   - Design tokens: X violations found
   - Motion: X/Y animations implemented (list missing)
   - VERDICT: PASS (>=90% match AND every state MATCH) / FAIL
   ```
7. **If FAIL:** fix every gap before reporting completion. Do not report a failing implementation.

## Decision Gates

| Situation                                    | Action                                                                                                                                                                                                                                                                                          |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| No shipped precedent (new screen)            | Build from `DESIGN.md` + `PRODUCT.md` + the spec's handoff checklist; do not hard-stop.                                                                                                                                                                                                          |
| Spec/tests contradict the reference          | HARD STOP. Surface both to the user and ask which wins. NEVER self-resolve in favor of the spec or of already-passing tests — passing tests that encode a non-reference behavior are evidence of the gap, not authority over it. Existing green tests do not exempt a screen from reference review. |
| Approved bug/improvement contradicts the reference | HARD STOP. Tell the user the reference would be contradicted, explain why the bug/improvement should win, and proceed only after the user-visible decision is recorded in the issue, PR, SDD artifact, or docs. |
| Shared component missing                     | Build it as reusable component before the page.                                                                                                                                                                                                                                                 |
| Self-review finds >2 CRITICAL gaps           | Fix all before reporting. Report the fixes made.                                                                                                                                                                                                                                                |
| Unsure about a design detail                 | Check `DESIGN.md` first, then `route-map.md`'s quick-reference, then a shipped sibling screen.                                                                                                                                                                                                   |

## Output Contract

When reporting completion, include:

1. The Phase 1 checklist (with all items checked).
2. The Phase 3 compliance report.
3. List of files created or modified.
4. Any deviations from the reference with explicit justification.

## References

- `references/route-map.md` — Route-to-shipped-screen mapping, shared component catalog, design token quick reference.
- `DESIGN.md` — Full design system specification (tokens, typography, components, motion).
- `apps/web/components/**` — Shared production primitives (Field, Notice, LoadingScribe, Modal, etc.).
- `apps/web/app/[locale]/**` — Shipped screens (the reference substrate for regression/parity work).
- `PRODUCT.md` — Product principles and entity model (for understanding what the screen does).
