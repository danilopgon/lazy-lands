# Spec: handoff-cleanup

**Change**: handoff-cleanup (Block 11)
**Capability**: `handoff-cleanup` (new — process/docs verification, no product behavior)

---

## Overview

This is a docs/skills/asset-cleanup change with no new or modified product capability
(`openspec/specs/` holds only `repository-bootstrap`, `campaign-view`,
`entity-management` — none of them change). There is no runtime code to test, so this
spec defines **verifiable end-states** for the `handoff/` prune instead of behavioral
requirements: physical file removal, reference repointing, skill/route-map resolution,
and repo-wide link integrity. Every requirement below is checkable by a human or a
grep/file-existence gate — not by exercising application behavior.

---

## Functional requirements

### HC-001: `handoff/` directory fully removed

The `handoff/` directory MUST contain zero physical files after this change ships.
Recovery MUST remain possible via git history only (no filesystem backup retained).

#### Scenario: Handoff directory is empty or absent

- GIVEN the change has shipped
- WHEN `handoff/` is inspected on disk
- THEN the directory either does not exist or contains 0 files
- AND the pre-change content is recoverable via `git log`/`git show` on the deletion
  commit

### HC-002: `frontend-handoff-contract/SKILL.md` source of truth is the shipped app

`.agents/skills/frontend-handoff-contract/SKILL.md` MUST declare the shipped
`apps/web/` app and `DESIGN.md` as the source of truth for frontend implementation,
replacing every reference to `handoff/app/*.jsx`. The handoff-contract *process*
(Pre-Implementation → Implementation → Adversarial Self-Review phases, Decision
Gates, mandatory activation) MUST remain intact — only its inputs change.

#### Scenario: Skill contains no handoff/ path reference

- GIVEN the updated `SKILL.md`
- WHEN grepped for `handoff/`
- THEN zero matches are found (Hard Rule 1, Phase 1 steps 2–4, Decision Gate row, and
  References section all point at `apps/web/**` and `DESIGN.md` instead)

#### Scenario: Skill process steps are unchanged in count and order

- GIVEN the updated `SKILL.md`
- WHEN compared to the pre-change version
- THEN the same three phases (Pre-Implementation, Implementation, Adversarial
  Self-Review) and the same Decision Gates table rows exist, with only the source
  citation edited

### HC-003: `route-map.md` repointed to shipped routes

`.agents/skills/frontend-handoff-contract/references/route-map.md` MUST map each
route either to its shipped `apps/web/app/**` file/component (File column repointed)
or drop the File column entirely if Next.js file-based routing makes it redundant. The
2 known-stale entries (`MemoryReview`, `GeneratedSession`) MUST resolve to their
correct shipped locations.

#### Scenario: Route map has no dangling handoff citation

- GIVEN the updated `route-map.md`
- WHEN grepped for `handoff/`
- THEN zero matches are found

#### Scenario: Stale entries resolve correctly

- GIVEN the updated `route-map.md`
- WHEN the `MemoryReview` and `GeneratedSession` rows are inspected
- THEN each points at the actual shipped route/component under `apps/web/app/**`
  (not the previous mismatched handoff file)

### HC-004: No dangling `handoff/` reference in core docs

`AGENTS.md`, `README.md`, `docs/README.md`, `DESIGN.md`, `PRODUCT.md`,
`.prettierignore`, and everything under `docs/conventions/**` MUST contain zero
`handoff/` references after this change, except the accepted exceptions in HC-005.

#### Scenario: Repo-wide grep gate passes

- GIVEN the change has shipped
- WHEN `grep -rn "handoff" AGENTS.md README.md docs/README.md DESIGN.md PRODUCT.md
  .prettierignore docs/conventions/` is run
- THEN it returns zero matches

### HC-005: Accepted grep exceptions are explicit and bounded

The repo-wide `handoff/` grep gate MUST exclude exactly these paths, and no others,
as accepted pre-existing/historical citations:

- `openspec/specs/**` (live specs: `entity-management`, `campaign-view` cite
  `handoff/app/*.jsx` in acceptance criteria — left dangling-but-harmless per proposal)
- `openspec/changes/archive/**` (historical, immutable once archived)
- `openspec/changes/{other non-archived change folders}/**` that predate this change
  (e.g. `per-section-regeneration`, `block-8-session-generation`,
  `block-7b-memory-review`, `i18n-next-intl`, `pdf-export`,
  `campaign-detail-loading-feedback`, `block-5-campaign-creation`,
  `block-3-landing-page`, `block-build-parallelization`, `supabase-setup` — historical
  change docs, not edited by this change)
- `docs/11-backlog.md` (historical backlog entry documenting a past bug, left as a
  record)
- Non-path prose uses of the word "handoff" in application source (e.g. a code
  comment describing a UX concept, not a `handoff/` path) — out of scope, since this
  change only touches the files enumerated in the proposal's Affected Areas

#### Scenario: Exception list matches actual remaining matches

- GIVEN the post-change repo-wide grep for `handoff`
- WHEN matches outside HC-004's file set are reviewed
- THEN every remaining match falls under one of the categories listed in this
  requirement, with no unexplained match

### HC-006: Brand asset relocated with a working reference

The brand PNG (`handoff/Lazy Lands - LinkedIn Card.png`) MUST either be relocated to
`docs/assets/brand/` with a hyphen-only filename and a corrected `DESIGN.md` reference
(fixing the pre-existing em-dash/hyphen mismatch), or be explicitly dropped with that
decision recorded in the change docs. Either outcome MUST leave `DESIGN.md` free of
broken asset references.

#### Scenario: Relocated asset resolves

- GIVEN the PNG was relocated to `docs/assets/brand/`
- WHEN `DESIGN.md`'s reference to the asset is followed
- THEN the file exists at the referenced path with the exact filename cited

#### Scenario: Dropped asset leaves no broken reference

- GIVEN the PNG was dropped instead of relocated
- WHEN `DESIGN.md` is inspected
- THEN it contains no reference to the asset's former path or filename

### HC-007: Roadmap Block 11 reframed and marked done

`docs/10-roadmap.md` Block 11 MUST be reworded from "remove handoff code" to reflect
the actual outcome (prune `handoff/` to zero physical files while preserving reference
value in `DESIGN.md` + `route-map.md` + the shipped app), and MUST be marked done once
this change ships.

#### Scenario: Roadmap entry reflects shipped outcome

- GIVEN the change has shipped
- WHEN `docs/10-roadmap.md` Block 11 is read
- THEN its text describes pruning to zero physical files with reference value
  preserved elsewhere, and its checkbox/status is marked done

### HC-008: Skill still resolves end-to-end

The `frontend-handoff-contract` skill MUST remain fully operable after this change:
activating it for a hypothetical new frontend route MUST successfully resolve a route
entry (or File-column-dropped equivalent), a shared-component reference, and a
design-token reference, using only `apps/web/**`, `route-map.md`, and `DESIGN.md` —
without needing any file under `handoff/`.

#### Scenario: Dry-run activation resolves without handoff/

- GIVEN `handoff/` has been deleted
- WHEN the `frontend-handoff-contract` skill is walked through Phase 1 for an existing
  shipped route (e.g. `/campaigns/:id/sessions/:sid`)
- THEN every Phase 1 step (route lookup, component source, shared components, design
  tokens) completes using only `apps/web/**`, `route-map.md`, and `DESIGN.md`

---

## Non-functional requirements

### NFR-HC-1: No product/runtime behavior change

This change MUST NOT alter any shipped application behavior, API contract, or
database schema. Verification is limited to file-existence and link-integrity checks;
no new automated test suite is required.

### NFR-HC-2: Single-change atomicity

The `handoff/` deletion and the skill/route-map repointing MUST ship in the same
change (hard functional dependency per proposal Risks) — never split across separate
PRs, to avoid `frontend-handoff-contract` hard-stopping on the next frontend task.

---

## Acceptance criteria

1. `handoff/` has 0 physical files; recovery is via git history only. (HC-001)
2. `SKILL.md` cites `apps/web/` + `DESIGN.md` as source of truth; process phases and
   Decision Gates are unchanged in structure. (HC-002)
3. `route-map.md` File column points at shipped routes (or is dropped); the
   `MemoryReview`/`GeneratedSession` stale entries resolve correctly. (HC-003)
4. Repo-wide `handoff/` grep across the named core docs returns zero matches. (HC-004)
5. Any remaining `handoff` match anywhere in the repo falls under the explicit
   exception list — no unexplained match. (HC-005)
6. Brand PNG is relocated with a working `DESIGN.md` reference, or explicitly dropped
   with no dangling reference. (HC-006)
7. `docs/10-roadmap.md` Block 11 is reframed and marked done. (HC-007)
8. A dry-run walkthrough of the skill's Phase 1 for a shipped route succeeds using
   only `apps/web/**`, `route-map.md`, and `DESIGN.md`. (HC-008)
