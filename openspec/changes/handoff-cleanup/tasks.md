# Tasks: Handoff cleanup (Block 11)

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~150-250 authored (doc/skill edits + 1 file move) + ~8,000-10,000 pure deletion (`handoff/`, not line-by-line reviewable) |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Low

Rationale: the bulk of the diff is a wholesale directory deletion (18 dead prototype files) that a
reviewer verifies by git-diff-stat + the grep gates below, not by reading each line. The only
content a reviewer must actually read is the doc/skill rewrite (~150-250 lines across `SKILL.md`,
`route-map.md`, `AGENTS.md`, and the doc sweep) plus one `git mv`. NFR-HC-2 (single-change
atomicity) forbids splitting the deletion from the substrate rewrite regardless of size, so chaining
is not applicable here even if the estimate had been higher.

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | Whole change (brand move + substrate rewrite + doc sweep + deletion + verification) | PR 1 (single) | Gate A/B `rg` commands + Check C/D (see Phase 6) | N/A — no runtime code; `frontend-handoff-contract` dry-run walkthrough is the harness | `git revert` the single commit/PR restores `handoff/`, original `SKILL.md`/`route-map.md`/`AGENTS.md`, doc wording, and the brand asset's original path |

## Phase 1: Brand Asset Relocation (must precede deletion)

- [x] 1.1 `git mv "handoff/Lazy Lands - LinkedIn Card.png" docs/assets/brand/lazy-lands-linkedin-card.png` (create `docs/assets/brand/` if absent).
- [x] 1.2 Fix `DESIGN.md`'s brand-asset reference (the em-dash `Lazy Lands — LinkedIn Card.png` mismatch, around line 209) to point at `docs/assets/brand/lazy-lands-linkedin-card.png`.

## Phase 2: Substrate Rewrite (ships in the SAME change as the deletion — HC-002, HC-003, NFR-HC-2)

- [x] 2.1 Rewrite `.agents/skills/frontend-handoff-contract/references/route-map.md`: rename columns to **Route → Shipped screen → Presentational component(s) → Notes**; repoint every row to `apps/web/app/[locale]/**` using the three-form policy (Direct / Path-diverged / Not-shipped) from the design. Fix `/campaigns` → `apps/web/app/[locale]/dashboard/page.tsx` (Path-diverged, Notes: "list view ships at `/dashboard`"), `MemoryReview` and `GeneratedSession` (both were stale → `views-sessions.jsx`; repoint to their real shipped routes under `apps/web/app/[locale]/campaigns/[id]/**`), and `/campaigns/:id/settings` → `— not shipped —` with Notes "build from `DESIGN.md` + `PRODUCT.md` (no shipped precedent)".
- [x] 2.2 In the same file, repoint the "Shared Components (handoff/app/ui.jsx)" section header and table to the production primitives under `apps/web/components/**` (Field, Modal, Notice, LoadingScribe, etc.), preserving the Purpose/Key Props columns. Leave the "Design System Quick Reference (DESIGN.md)" section verbatim (already JSX-independent).
- [x] 2.3 Rewrite `.agents/skills/frontend-handoff-contract/SKILL.md`: frontmatter `description` ("read prototype" → "read the shipped screen + `DESIGN.md`"); Hard Rule 1 (new wording naming shipped-screen and no-precedent cases per design Decision 2); Phase 1 steps 2-4 (route-map lookup → shipped screen file; read shipped `page.tsx` + presentational components, skip if no precedent; read shared primitives under `apps/web/components/**`); Phase 2 bullet ("shared component from `ui.jsx`" → "shared production primitive under `apps/web/components/**`; build first if missing"); Phase 3 step 1 ("re-read the handoff component" → "re-read the reference substrate: shipped sibling/precedent screen + `DESIGN.md`"); Decision Gates rows ("Handoff file not found" → "No shipped precedent"; "check `handoff/app/chronicle.css`" → "check `route-map.md` quick-reference, then a shipped sibling screen"); References section (drop the two `handoff/app/*` bullets, add `apps/web/components/**` and `apps/web/app/[locale]/**`). Keep Phase 3 steps 3-7 (report, per-line states, verdict) and the three-phase/Decision-Gates structure unchanged.
- [x] 2.4 Rewrite the AGENTS.md "Orchestrator: frontend tasks require handoff context in SDD phases" rule per design Decision 3: checklist-authoring steps become route-map → shipped screen source (or `DESIGN.md` + `PRODUCT.md` + nearest shipped sibling for a new screen) → shared primitives under `apps/web/components/**` → extract field/copy/states/layout/tokens/shared-components/motion checklist. Keep it mandatory SDD context.

## Phase 3: Doc Mention Sweep

- [x] 3.1 Update the other 2 AGENTS.md handoff rules (design-reference, mandatory-handoff-contract) to describe `handoff/` as removed/historical and point at `apps/web/`, `DESIGN.md`, and the rewritten skill.
- [x] 3.2 Update `README.md` and `docs/README.md`: drop or reword any `handoff/` directory reference.
- [x] 3.3 Update `DESIGN.md`: sweep remaining `handoff/`/`chronicle.css`/`ui.jsx`/`views-*.jsx` mentions (lines 7, 215, 314-316 per design scan) to reference `apps/web/` and the rewritten skill/route-map instead.
- [x] 3.4 Update `PRODUCT.md`: drop or reword any `handoff/` reference.
- [x] 3.5 Remove the `handoff/` entry from `.prettierignore`.
- [x] 3.6 Update `docs/conventions/handoff-deviations.md` and `docs/conventions/README.md` to repoint the deviation-recording process off raw `handoff/app/*.jsx` files and onto the shipped-screen/DESIGN.md substrate.

## Phase 4: Roadmap Reframe

- [x] 4.1 Reword `docs/10-roadmap.md` Block 11 from "remove handoff code" to describe pruning `handoff/` to zero physical files while preserving reference value in `DESIGN.md` + `route-map.md` + the shipped app; mark the block's checkbox/status done.

## Phase 5: Delete `handoff/`

- [x] 5.1 Delete the remaining 17 files under `handoff/` (all except the already-moved PNG): `app/data.js`, `app/main.jsx`, `app/ui.jsx`, `app/views-arcs.jsx`, `app/views-dashboard.jsx`, `app/views-detail.jsx`, `app/views-entities.jsx`, `app/views-export.jsx`, `app/views-prepare.jsx`, `app/views-public.jsx`, `app/views-sessions.jsx`, `app/views-landing.jsx`, `app/views-review.jsx`, `app/chronicle.css`, `lib/tweaks-panel.jsx`, `Lazy Lands Prototype.html`, `README.md`; confirm `handoff/` no longer exists or contains 0 files.

## Phase 6: Verification (link-integrity gates, no runtime code — HC-001..HC-008)

- [x] 6.1 Run Gate A: `rg -n --hidden -g '!.git' -g '!openspec/specs/**' -g '!openspec/changes/**' 'handoff/'` — must return zero matches (HC-004, HC-005). PASS — only match is the accepted `docs/11-backlog.md` exception.
- [x] 6.2 Run Gate B: `rg -n --hidden -g '!.git' -g '!openspec/specs/**' -g '!openspec/changes/**' 'chronicle\.css|ui\.jsx|views-[a-z-]+\.jsx|Prototype\.html'` — must return zero matches outside the accepted exception set (HC-004, HC-005). PASS — only match is the accepted `docs/11-backlog.md` exception.
- [x] 6.3 Run Check C(a): `rg 'handoff/' .agents/skills/frontend-handoff-contract/` returns zero (HC-002, HC-003). PASS.
- [x] 6.4 Run Check C(b): confirm every File-column path in the rewritten `route-map.md` not marked `— not shipped —` resolves to an existing file on disk (HC-003). PASS — all 15 paths verified against `apps/web/app/**/page.tsx` glob output.
- [x] 6.5 Run Check D: confirm `DESIGN.md`'s brand reference points at `docs/assets/brand/lazy-lands-linkedin-card.png` and that file exists (HC-006). PASS.
- [x] 6.6 Dry-run the `frontend-handoff-contract` skill's Phase 1 for an existing shipped route (e.g. `/campaigns/:id/sessions/:sid`): confirm route lookup, shipped component source, shared-component reference, and design-token reference all resolve using only `apps/web/**`, `route-map.md`, and `DESIGN.md` (HC-008). PASS — route-map row -> `page.tsx` -> `GeneratedSessionView` -> shared components (Button, LoadingScribe, MarkdownBody, Notice, OriginBadge) all resolve.
- [x] 6.7 Confirm `docs/10-roadmap.md` Block 11 text and checkbox reflect the reframed, done state (HC-007); confirm `handoff/` is absent or empty on disk (HC-001). PASS — status: done, 0 files on disk (git rm'd, glob confirms empty).
