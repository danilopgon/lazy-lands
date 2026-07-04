---
name: frontend-handoff-contract
description: 'Trigger: implementing frontend page, UI component, screen, or route. Mandatory handoff-first contract — read prototype, extract checklist, implement, adversarial self-review before completion.'
license: Apache-2.0
metadata:
  author: gentleman-programming
  version: '1.0'
---

## Activation Contract

Activate when ANY of these are true:

- Implementing a page, screen, or route in `apps/web/`
- Building or modifying a UI component that maps to a handoff prototype screen
- Any SDD task that touches frontend rendering

This skill is MANDATORY, not advisory. It defines a hard workflow that must be followed in order. Skipping steps is not permitted.

## Hard Rules

1. **Handoff is the source of truth.** `DESIGN.md` + `handoff/app/` define what to build. If the spec says one thing but the handoff shows another, flag the conflict — do not silently deviate.
2. **Read before writing.** Never write a single line of implementation code before completing the Pre-Implementation phase below.
3. **Self-review before declaring done.** Never report task completion before completing the Adversarial Self-Review phase below.
4. **No copy placeholders.** Every field, label, state, and interaction from the handoff must exist in the implementation. "I'll add it later" is not acceptable.
5. **Design tokens are non-negotiable.** Use CSS custom properties from DESIGN.md. Never hardcode colors, shadows, or border-radius.

## Execution Steps

### Phase 1: Pre-Implementation (BEFORE writing code)

1. **Identify the route** being implemented (e.g., `/campaigns/new`).
2. **Read `references/route-map.md`** to find the handoff file and component name.
3. **Read the handoff component source** (e.g., `handoff/app/views-dashboard.jsx` lines containing the target component).
4. **Read `handoff/app/ui.jsx`** to understand shared components used (Field, Loading, ErrorNotice, etc.).
5. **Read `DESIGN.md`** sections relevant to the screen (tokens, typography, component patterns).
6. **Extract a checklist** from the handoff. Write it down explicitly:
   - [ ] Every field (label, type, required/optional, placeholder, validation)
   - [ ] Layout structure (grid, columns, containers, cards)
   - [ ] Copy text (kicker, h1, subtitle, labels, button text — exact strings)
   - [ ] States (loading, empty, error, success — what triggers each)
   - [ ] Interactions (navigation, form submission, validation timing)
   - [ ] Shared components used (Field, Loading, ErrorNotice, etc.)
   - [ ] Design tokens referenced (colors, shadows, typography)
   - [ ] Motion requirements (entrance animations, action feedback, transitions — check if handoff uses `.ll-view-enter`, `.ll-rise`, `.ll-stamp`, `.ll-strike`, `.ll-quill`, button press physics)

### Phase 2: Implementation

- Build against the checklist. One item at a time.
- Use existing design system components (shadcn/ui + custom Lazy Lands primitives).
- Map handoff CSS classes to Tailwind + CSS custom properties:
  - `.ll-paper` → Card with `border-2 border-[var(--border)] shadow-[6px_6px_0_var(--shadow)] bg-[var(--paper)]`
  - `.ll-input` → Input with `border-[1.5px] border-dashed border-[var(--dotted)] rounded-none`
  - `.ll-label` → `font-mono text-[10px] font-semibold uppercase tracking-[0.1em]`
  - `.ll-kicker` → `font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--accent)]`
  - `.ll-btn.accent` → Button with `bg-[var(--accent)] text-white shadow-[4px_4px_0_var(--shadow)] hover:translate-x-[1.5px] hover:translate-y-[1.5px] hover:shadow-[2px_2px_0_var(--shadow)]`
- If a shared component from `ui.jsx` is needed (Loading, ErrorNotice, Field, etc.) and does not exist in the codebase yet, implement it as a reusable component first.

### Phase 3: Adversarial Self-Review (MANDATORY before declaring done)

After implementation, perform this review. Do NOT skip. Do NOT abbreviate.

1. **Re-read the handoff component** (the same file from Phase 1).
2. **Re-read your implementation** side by side.
3. **Check every checklist item** from Phase 1:
   - Is every field present? (name, type, placeholder, validation, required/optional)
   - Is every state implemented? (loading, error, empty)
   - Is the copy exact? (compare character by character — do not paraphrase)
   - Is the layout structure identical? (grid columns, card wrappers, spacing)
   - Are shared components used where the handoff uses them?
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
   category — you MUST enumerate every handoff state on its own line, never
   collapse them into a single "states: X/Z" score. A state that exists in the
   handoff but not the implementation (or is implemented with a weaker pattern —
   e.g. a disabled button instead of a full loading takeover) is a FAIL, not a
   rounding error.
   ```
   ## Handoff Compliance Report
   - Structure: X/Y elements match
   - Copy: X/Y strings exact (list any paraphrased/generic vs handoff voice)
   - States (one row PER handoff state — loading, error, empty, success, …):
     - loading: handoff = <what it shows> | impl = <what it shows> | MATCH/GAP
     - error:   handoff = <…>            | impl = <…>            | MATCH/GAP
     - empty:   handoff = <…>            | impl = <…>            | MATCH/GAP
   - Design tokens: X violations found
   - Motion: X/Y animations implemented (list missing)
   - VERDICT: PASS (>=90% match AND every state MATCH) / FAIL
   ```
7. **If FAIL:** fix every gap before reporting completion. Do not report a failing implementation.

## Decision Gates

| Situation                          | Action                                                                                                                                                                                                                                                                                          |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Handoff file not found for route   | Stop. Ask user which handoff file to use.                                                                                                                                                                                                                                                       |
| Spec/tests contradict handoff      | HARD STOP. Surface both to the user and ask which wins. NEVER self-resolve in favor of the spec or of already-passing tests — passing tests that encode a non-handoff behavior are evidence of the gap, not authority over it. Existing green tests do not exempt a screen from handoff review. |
| Shared component missing           | Build it as reusable component before the page.                                                                                                                                                                                                                                                 |
| Self-review finds >2 CRITICAL gaps | Fix all before reporting. Report the fixes made.                                                                                                                                                                                                                                                |
| Unsure about a design detail       | Check `DESIGN.md` first, then `handoff/app/chronicle.css` for the exact CSS.                                                                                                                                                                                                                    |

## Output Contract

When reporting completion, include:

1. The Phase 1 checklist (with all items checked).
2. The Phase 3 compliance report.
3. List of files created or modified.
4. Any deviations from handoff with explicit justification.

## References

- `references/route-map.md` — Route-to-handoff file mapping, shared component catalog, design token quick reference.
- `DESIGN.md` — Full design system specification (tokens, typography, components, motion).
- `handoff/app/chronicle.css` — Source stylesheet encoding the complete prototype system.
- `handoff/app/ui.jsx` — Shared prototype components (Field, Loading, ErrorNotice, Shell, etc.).
- `PRODUCT.md` — Product principles and entity model (for understanding what the screen does).
