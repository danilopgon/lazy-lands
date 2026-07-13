# Proposal: Handoff cleanup (Block 11)

## Intent

`handoff/` (18 files, ~844K) holds pure prototype JSX/CSS for all 16 MVP screens (Blocks 3–9), every one of which has shipped under `apps/web/`. The prototypes are now dead working-tree weight: `ui.jsx` duplicates shipped `Field`/`Modal` components, `chronicle.css` duplicates `DESIGN.md` tokens/motion, and the brand PNG has no code consumer. Meanwhile `route-map.md` has 2 stale entries and `DESIGN.md` has a broken brand-asset filename reference. Block 11 (`docs/10-roadmap.md`) asks to "remove handoff" — the real goal is to prune it to zero physical files while preserving its durable reference value in `DESIGN.md`, `route-map.md`, and the shipped app.

## Scope

### In Scope
- **Delete `handoff/` entirely** (18 files, ~844K): extract the brand PNG first (see below), then delete the remainder of `handoff/`, leaving zero physical files. Recovery path is git history — stated explicitly; deletion is not information loss.
- **Rewrite `frontend-handoff-contract/SKILL.md`**: redefine its "source of truth" as the shipped `apps/web/` app + `DESIGN.md` (not prototype JSX). The handoff-contract *process* is retained; only its inputs change (Hard Rule 1, Phase 1 steps 2–4, Decision Gate row, References).
- **Repoint `frontend-handoff-contract/references/route-map.md`**: File column from `handoff/app/*.jsx` to shipped `apps/web/app/**` routes (or drop the column if Next.js routing makes it redundant). Fixes the 2 stale entries (MemoryReview, GeneratedSession).
- **Update handoff mentions** in `AGENTS.md` (2 design/handoff-contract rules + orchestrator handoff-context rule), `README.md`, `docs/README.md`, `DESIGN.md`, `PRODUCT.md`, `.prettierignore`, `docs/conventions/handoff-deviations.md`, `docs/conventions/README.md`.
- **Brand PNG (adjustable sub-decision):** RECOMMEND relocating `handoff/Lazy Lands - LinkedIn Card.png` (~630K) to `docs/assets/brand/` with a hyphen-only filename, and fixing the pre-existing broken `DESIGN.md` reference (em-dash vs hyphen) in the same change. Adjustable: user may instead drop it (recoverable via git).
- **Roadmap:** reframe Block 11 in `docs/10-roadmap.md` from "remove handoff" to "prune handoff to zero physical files while preserving reference value in DESIGN.md + route-map + the shipped app"; mark done when shipped.

### Out of Scope
- Retiring the `frontend-handoff-contract` skill (its process has independent value).
- Editing archived openspec changes or rewriting historical specs.
- Fixing dangling `handoff/app/*.jsx` citations in non-archived `openspec/specs/**` (accepted, documented risk).
- New product features.

## Capabilities

> `openspec/specs/` holds only `repository-bootstrap`, `campaign-view`, `entity-management`. This change touches docs/skills/assets only — no product behavior or spec-level requirement changes.

### New Capabilities
- None.

### Modified Capabilities
- None.

## Approach

Exploration Approach 3 (user-confirmed): the genuinely durable reference (shared-component + design quick-reference tables) already lives in `route-map.md` and `DESIGN.md`, so `handoff/` deletion and reference-repointing ship as ONE change. The skill + route-map rewrite is a hard functional dependency on the deletion, not optional cleanup — they must land together. No runtime code changes; verification is link-integrity / no-dangling-reference and "skill still resolves" checks (spec/tasks phases must define the exact verification since there is no product code to test).

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `handoff/` (18 files) | Removed | Deleted entirely; recovery via git history |
| `handoff/Lazy Lands - LinkedIn Card.png` | Moved | Relocated to `docs/assets/brand/` (hyphen filename) — adjustable |
| `.agents/skills/frontend-handoff-contract/SKILL.md` | Modified | Source of truth → shipped app + DESIGN.md; process retained |
| `.agents/skills/frontend-handoff-contract/references/route-map.md` | Modified | File column → `apps/web/app/**`; fixes 2 stale entries |
| `AGENTS.md` | Modified | 2 handoff rules + orchestrator handoff-context rule |
| `README.md`, `docs/README.md`, `PRODUCT.md` | Modified | Descriptive handoff mentions |
| `DESIGN.md` | Modified | Handoff mentions + fix broken brand-asset reference |
| `.prettierignore` | Modified | Drop `handoff/` entry |
| `docs/conventions/handoff-deviations.md`, `docs/conventions/README.md` | Modified | Repoint process convention off raw files |
| `docs/10-roadmap.md` | Modified | Reframe + mark Block 11 done |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Skill/route-map not repointed → `frontend-handoff-contract` hard-stops on next frontend task | High if split | Ship skill + route-map rewrite in the SAME change as deletion (hard dependency) |
| Dangling `handoff/app/*.jsx` citations in non-archived `openspec/specs/**` | Certain | Accepted, documented risk; do NOT edit live specs or historical changes |
| Missed handoff mention leaves a broken repo reference | Medium | Repo-wide `handoff/` grep as verification gate before done |
| Brand PNG relocation breaks the (already broken) DESIGN.md link | Low | Fix reference to hyphen filename in same change; verify link resolves |

## Rollback Plan

Single-change revert restores everything: `git revert` the deletion/move commits brings back `handoff/`, the original `SKILL.md`/`route-map.md`, and all doc wording. No schema, runtime, or data changes involved. All deleted content remains recoverable from git history independent of revert.

## Dependencies

- Shipped `apps/web/app/**` routes and `DESIGN.md` must adequately cover the reference value formerly read from prototype JSX (verified in exploration).
- `frontend-handoff-contract` skill governs future frontend work and must resolve post-rewrite.

## Success Criteria

- [ ] `handoff/` directory fully removed (0 physical files); recovery documented as git history.
- [ ] `frontend-handoff-contract/SKILL.md` reads shipped app + DESIGN.md as source of truth; process steps intact.
- [ ] `route-map.md` File column points at `apps/web/app/**` (or column dropped); 2 stale entries resolved.
- [ ] No `handoff/` reference remains in `AGENTS.md`, `README.md`, `docs/README.md`, `DESIGN.md`, `PRODUCT.md`, `.prettierignore`, `docs/conventions/**` (repo-wide grep clean except accepted `openspec/specs/**` + archive).
- [ ] Brand PNG relocated to `docs/assets/brand/` with fixed DESIGN.md reference (or explicitly dropped per adjustable sub-decision).
- [ ] Roadmap Block 11 reframed and marked done.
- [ ] Verification defined for a no-runtime-code change (link-integrity / no-dangling-reference; skill still resolves) — spec/tasks phases specify exact checks.
