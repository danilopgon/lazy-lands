# Spec: demo-audit-hardening

**Change**: demo-audit-hardening
**Capability**: `demo-audit-hardening` (new — audit/hardening pass over PR #82's public
demo; no new product capability, no `openspec/specs/` domain exists for `demo`)

---

## Overview

PR #82 shipped a public no-login `/demo/**` tour on a GREEN baseline. This spec covers
the 12 approved baremo items (#1–#7, #9–#12, #16). #1 (bug), #2 (UX), and #16 (i18n
parity) are behavior changes; the rest are test-coverage and refactor items with NO
behavior change — captured below as coverage/quality requirements, not new capability
scenarios.

---

## Functional requirements (behavior changes)

### DA-001: Suggestions cleared on accept/dismiss (Bug #1)

The demo store (`apps/web/lib/demo/store.tsx`) MUST remove an accepted or dismissed
memory suggestion from `state.suggestions` at the time of the decision, so re-entering
`/demo/memory` MUST NOT resurrect it as a duplicate memory fact.

#### Scenario: Accept then return

- GIVEN `/demo/memory` lists a suggestion S
- WHEN the user accepts S and later navigates back to `/demo/memory`
- THEN S is no longer present in `state.suggestions`
- AND the accepted memory fact appears exactly once in the memory list

#### Scenario: Dismiss then return

- GIVEN `/demo/memory` lists a suggestion S
- WHEN the user dismisses S and later navigates back to `/demo/memory`
- THEN S is no longer present in `state.suggestions`
- AND no memory fact is created from S

#### Scenario: Accept all then return

- GIVEN `/demo/memory` lists suggestions S1, S2, S3
- WHEN the user accepts all three and later navigates back to `/demo/memory`
- THEN `state.suggestions` is empty
- AND the memory list contains exactly 3 new facts, with no duplicates

### DA-002: Empty-state primary action navigates to campaign (UX #2)

`/demo/memory`'s empty-state primary button MUST link to `demoHrefs.campaign`, matching
the real `memory/review/page.tsx` empty-state behavior, instead of `demoHrefs.logSession`.

#### Scenario: Empty-state button navigates correctly

- GIVEN `/demo/memory` has zero pending suggestions
- WHEN the empty-state primary button is rendered
- THEN its `href` resolves to `demoHrefs.campaign`

---

## Coverage and quality requirements (no behavior change)

These items MUST NOT alter observable demo or real-flow behavior; they add missing
verification or remove duplicated code.

### DA-003: Faction/Arc CRUD coverage (#3)

`tests/demo/store.test.tsx` MUST cover create/update/delete for factions and arcs,
mirroring existing NPC CRUD coverage.

#### Scenario: Faction and arc CRUD are exercised

- GIVEN the demo store test suite
- WHEN it runs
- THEN faction and arc create/update/delete each have passing assertions

### DA-004: Factions/Arcs page-level tests (#4)

`demo/factions` and `demo/arcs` MUST have page-level tests analogous to
`demo/npcs/__tests__`.

#### Scenario: Page tests exist and pass

- GIVEN `demo/factions/__tests__` and `demo/arcs/__tests__`
- WHEN the web test suite runs
- THEN both suites pass, covering the same scenario classes as the npcs page test

### DA-005: Shared suggestion types deduplicated (#5)

`suggestionId` and `Feedback` types MUST be declared only in `memory-review-parts.tsx`
and imported by `demo/memory/page.tsx`, not duplicated.

#### Scenario: No duplicate type declarations

- GIVEN the post-change source
- WHEN `suggestionId`/`Feedback` are searched
- THEN they are declared only in `memory-review-parts.tsx`

### DA-006: saveSession isolated coverage (#6)

`tests/demo/store.test.tsx` MUST include an isolated assertion for `saveSession`.

#### Scenario: saveSession behavior is asserted

- GIVEN the demo store test suite
- WHEN it runs
- THEN a dedicated `saveSession` test passes independent of other store actions

### DA-007: Adapter-path tests on real components (#7)

`{arc,faction,npc}-modal.tsx`, `world-state-editor.tsx`, and `log-session-form.tsx`
MUST have focused unit tests exercising their optional adapter props (`onSubmit`,
`onSave`, `navigate`, etc.) without regressing the default (real, non-demo) code path.

#### Scenario: Adapter props are tested without touching default behavior

- GIVEN each listed real component
- WHEN its adapter-prop test runs
- THEN the adapter path is asserted AND existing default-path tests still pass unchanged

### DA-009: Regression test on world-state-editor default path (#9)

`world-state-editor.tsx`'s default (real) mutation path MUST have a regression test
proving behavior-equivalence with pre-PR-82 behavior.

#### Scenario: Default path matches pre-existing behavior

- GIVEN `world-state-editor.tsx` used without demo adapter props
- WHEN the regression test runs
- THEN the resulting state mutation matches the documented pre-PR-82 contract

### DA-010: Tour coverage extended (#10)

`demo-tour.tsx` MUST add 1–2 callouts covering `/demo/memory` and
`/demo/sessions/generated`.

#### Scenario: Tour includes new screens

- GIVEN the guided tour definition
- WHEN it is inspected
- THEN it includes at least one step referencing `/demo/memory` and one referencing
  `/demo/sessions/generated`

### DA-011: log-session-form prop surface (#11, optional)

IF `log-session-form.tsx`'s four adapter props are collapsed into a single
`onRegistered` callback, the refactor MUST preserve all call-site behavior and pass
existing tests unchanged.

#### Scenario: Collapsed callback preserves behavior

- GIVEN the refactored `log-session-form.tsx`
- WHEN existing session-registration tests run
- THEN they pass without modification to their assertions

### DA-012: Landing inline styles replaced (#12)

`landing/cta.tsx` and `landing/hero.tsx` MUST replace inline `style={{...}}` with
Tailwind classes or a `Button` size variant, with no visual regression.

#### Scenario: No inline styles remain

- GIVEN the post-change landing components
- WHEN grepped for `style={{`
- THEN zero matches are found in these two files

### DA-013: Demo sample content follows the active locale (#16)

The demo (reachable at `/es/demo` and `/en/demo`, with a `<LanguageSwitcher>`) MUST
render its sample campaign content in the active locale. `apps/web/lib/demo/fixtures.ts`
MUST provide bilingual (es + en) fixture sets selected by locale, shipping in the same
PR. Prose fields (campaign title/description/world_state, NPC names, descriptions,
motivations, memory facts, session content) MUST be translated; stable non-prose values
(entity IDs, dates, enum fields such as `content_source`/`system`) MUST remain identical
across locales.

#### Scenario: English locale renders English sample content

- GIVEN the demo is viewed under the `en` locale
- WHEN any demo screen renders sample campaign prose (campaign title/description/
  world_state, NPC names/descriptions/motivations, memory facts, session content)
- THEN that content renders in English

#### Scenario: Spanish locale renders Spanish sample content with stable identifiers

- GIVEN the demo is viewed under the `es` locale
- WHEN the same demo screens render sample campaign prose
- THEN that content renders in Spanish, neutral/professional register
- AND entity IDs, dates, and enum fields (`content_source`, `system`) are identical to
  the `en` locale's values

#### Scenario: Mid-demo language switch keeps entity routes valid

- GIVEN the user is on a demo entity-detail route (e.g. an NPC detail page) in `es`
- WHEN they switch the active language to `en` via `<LanguageSwitcher>`
- THEN the sample content re-renders in English
- AND the same entity-detail route (shared entity ID) remains valid and resolves to the
  same entity

#### Scenario: Both locale fixture sets validate against the shared schemas

- GIVEN `apps/web/lib/demo/fixtures.ts`'s es and en fixture sets
- WHEN `tests/demo/fixtures.test.ts` runs at module load
- THEN both fixture sets parse successfully through the identical Zod schemas with no
  validation errors

---

## Non-functional requirements

### NFR-DA-1: Real-flow parity

Items #7, #9, #11, #12 (touching real, non-demo files) MUST NOT change observable
behavior of the real (non-demo) application flow. Verification MUST run the full
`pnpm --filter web` suite, not only demo tests.

### NFR-DA-2: No scope creep

This change MUST NOT touch #8 (dropped, belongs to #81), #13/#14/#15 (deferred),
introduce RAG/embeddings/billing/multi-user features, or rewrite the demo
store/fixtures architecture.

---

## Acceptance criteria

1. #1: suggestions removed from state on accept/dismiss; no duplicate facts on
   re-entry. (DA-001)
2. #2: empty-state button links to `demoHrefs.campaign`. (DA-002)
3. #3–#6: store/page coverage added and passing. (DA-003–DA-006)
4. #7, #9: real-component adapter/regression tests added; full web suite GREEN.
   (DA-007, DA-009, NFR-DA-1)
5. #10: tour covers `/demo/memory` and `/demo/sessions/generated`. (DA-010)
6. #11 (optional), #12: refactor/style items ship with no behavior/visual regression.
   (DA-011, DA-012)
7. Full `pnpm --filter web` typecheck + lint + test + build stay GREEN throughout.
8. #8/#13/#14/#15 remain untouched. (NFR-DA-2)
9. #16: bilingual (es + en) demo sample content renders by active locale; stable
   non-prose fields stay identical across locales; both fixture sets validate against
   the shared schemas. (DA-013)
