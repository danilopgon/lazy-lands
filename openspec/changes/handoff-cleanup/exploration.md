# Exploration — Handoff cleanup (Block 11)

> Artifact store: hybrid. Mirror of Engram topic `sdd/handoff-cleanup/explore`.
> Phase: exploration only (no proposal, specs, or code).

## Reframed intent

The roadmap (Block 11, `docs/10-roadmap.md`) says "remove handoff code", but the
real goal is **not** full, blind deletion. The goal is to prune `handoff/` almost
completely while preserving the minimum reference value future features need — so
the product/design/skill layers keep useful references — without keeping entire
prototype pages living in the repo.

## Current state

`handoff/` is 18 files, ~844K. All 16 prototyped MVP screens (Blocks 3–9) have
shipped under `apps/web/`. Investigation shows the parts that *look* durable are
already superseded elsewhere:

- `handoff/app/ui.jsx` (shared prototype components: Field, Modal, Loading,
  ErrorNotice, ScribeNotice, OriginBadge, …) — the entity-management spec required
  and shipped real production `Field`/`Modal` components; the prototype versions
  are dead weight.
- `handoff/app/chronicle.css` (~439 lines of tokens/components/motion) — `DESIGN.md`
  (§3–§10) independently documents tokens, typography, components, motion keyframes,
  and a Tailwind mapping guide. `chronicle.css` is cited only as a "reference
  implementation", not as the canonical source of values.
- `Lazy Lands - LinkedIn Card.png` (~630K brand asset) — no code consumer; only a
  descriptive `DESIGN.md` mention, which already has a broken filename reference
  (em-dash in `DESIGN.md` vs. hyphen in the actual filename).

## Affected areas (consumers of `handoff/`)

- `AGENTS.md` — two rules assume live per-view JSX: the design-reference rule and the
  mandatory frontend-handoff-contract rule (+ the orchestrator handoff-context rule).
- `.agents/skills/frontend-handoff-contract/SKILL.md` — Hard Rule 1, Phase 1 steps
  2–4, a Decision Gate row, and References all read `handoff/app/*.jsx` directly.
  **Highest-coupling risk.**
- `.agents/skills/frontend-handoff-contract/references/route-map.md` — Route→File
  table maps every route to prototype JSX (2 known-stale entries: MemoryReview,
  GeneratedSession). Also holds a shared-component catalog + distilled design
  quick-reference that already duplicates `DESIGN.md` and is **not** JSX-dependent.
- `README.md`, `docs/README.md`, `DESIGN.md`, `PRODUCT.md`, `.prettierignore` —
  descriptive/low-risk mentions needing small edits.
- `docs/conventions/handoff-deviations.md`, `docs/conventions/README.md` — process
  convention, independent of the raw files; can survive conceptually.
- `openspec/changes/**` (incl. archive) and non-archived `openspec/specs/**` —
  historical / acceptance-criteria citations of `handoff/app/*.jsx`. Leave as-is;
  deletion leaves these dangling-but-harmless (documented accepted risk).

## Approaches compared

1. **Delete-all-but-README** — max weight reduction, simplest; but no diffable
   prototype fallback. Effort: Low.
2. **Keep shared UI catalog + route-map + distilled design ref, delete per-view
   pages** — false economy: `ui.jsx`/`chronicle.css` duplicate content already in
   `DESIGN.md`/shipped components, and the standalone HTML loader breaks once
   per-view JSX is gone. Effort: Medium.
3. **Extract distilled reference into docs/route-map and delete `handoff/` entirely
   (recommended)** — the genuinely durable reference (shared-component + design
   quick-reference tables) already lives in `route-map.md`, generalized to describe
   shipped components instead of prototype JSX. Brand PNG optionally relocated
   (e.g. `docs/assets/brand/`) or dropped (recoverable from git history). Effort:
   Medium-High (mostly doc/skill rewrite, not deletion).

## Recommendation

**Approach 3.** Neither `ui.jsx` nor `chronicle.css` earns keeping as a literal file
— their value is already captured in `DESIGN.md` and `route-map.md`. Deletion is not
information loss (recoverable via git history), just removal of working-tree noise.
Open call for `sdd-propose`: relocate or drop the brand PNG.

### Skill consequence

- Retire the skill: rejected (the handoff-contract *process* has independent value).
- Slim to catalog-only: rejected (too narrow for future features with no prototype).
- **Recommended**: redefine "source of truth" as the shipped `apps/web` app +
  `DESIGN.md`; repoint `route-map.md`'s File column from `handoff/app/*.jsx` to
  `apps/web/app/**` (or drop it — Next.js routing is self-locating). This also
  silently fixes the two known route-map staleness bugs.

## Risks

- Skill breakage is a hard functional dependency: the skill/route-map rewrite MUST
  ship in the same change as file deletion, or `frontend-handoff-contract`
  hard-stops on the next frontend task.
- Non-archived `openspec/specs/**` will have dangling `handoff/app/*.jsx` citations
  after deletion — accepted/documented risk, not fixed in this change.
- Pre-existing broken filename reference in `DESIGN.md` (em-dash vs. hyphen) — worth
  an opportunistic fix.
- Recovery story for all deleted content is git history — state this explicitly in
  the proposal.

## Ready for proposal

Yes. One open decision for the user before `sdd-propose` (see below).

## Open decision for the user

The exploration's evidence pushes toward deleting `handoff/` entirely rather than
keeping a physical subset, because the "useful parts" are already distilled into
`DESIGN.md` + `route-map.md`. This still satisfies the reframed intent (durable
reference survives) but via existing docs, not retained handoff files. The user must
confirm whether that trade is acceptable or whether they want specific handoff
artifacts physically retained.
