# Apply Progress: Handoff cleanup (Block 11)

## Phase 1: Brand Asset Relocation
- [x] 1.1 `git mv` PNG to `docs/assets/brand/lazy-lands-linkedin-card.png` — done.
- [x] 1.2 DESIGN.md brand ref + full handoff/chronicle.css/ui.jsx sweep of DESIGN.md (lines 1-10, 129, 179, 206-208, 214-215, 313-316) — done. Verified zero Gate A/B matches in DESIGN.md.

## Phase 2: Substrate Rewrite
- [x] 2.1 route-map.md rewrite — repointed all 16 routes to shipped `apps/web/app/[locale]/**`, Direct/Path-diverged/Not-shipped policy applied, MemoryReview + GeneratedSession stale entries fixed.
- [x] 2.2 route-map.md shared components section — repointed to `apps/web/components/**` primitives with Source column.
- [x] 2.3 SKILL.md rewrite — frontmatter, Hard Rule 1, Phase 1 steps 2-4, Phase 2 bullet, Phase 3 step 1, Decision Gates rows, References section. Verified zero Gate A/B matches.
- [x] 2.4 AGENTS.md orchestrator rule rewrite — route-map -> shipped screen source -> shared primitives under apps/web/components/**.

## Phase 3: Doc Mention Sweep
- [x] 3.1 AGENTS.md other 2 rules (design-reference, mandatory-handoff-contract) + lines 7/45/112 reworded.
- [x] 3.2 README.md (lines 86, 380-381) + docs/README.md (already clean) fixed.
- [x] 3.3 DESIGN.md swept (done earlier as part of 1.2: lines 1-10, 129, 179, 206-208, 214-215, 313-316).
- [x] 3.4 PRODUCT.md line 142 (handoff/app/data.js ref) reworded.
- [x] 3.5 .prettierignore handoff/ entry removed.
- [x] 3.6 docs/conventions/handoff-deviations.md rewritten (Decision Rule, Localization Rule, Required Process, Block 7a historical section); docs/conventions/README.md table row reworded.

## Phase 4: Roadmap Reframe
- [x] 4.1 docs/10-roadmap.md Block 11 reworded to "pruned to zero physical files, reference value preserved" and status marked done.

## Phase 5: Delete handoff/
- [x] 5.1 `git rm -r handoff/` — 17 files deleted (PNG already relocated in Phase 1). `handoff/` confirmed 0 files on disk via Glob.

## Phase 6: Verification — ALL GATES PASS
- [x] 6.1 Gate A (`handoff/` repo-wide) — PASS, only accepted exception `docs/11-backlog.md` matches.
- [x] 6.2 Gate B (chronicle.css/ui.jsx/views-*.jsx/Prototype.html) — PASS, only accepted exception `docs/11-backlog.md` matches. (Also found + fixed 2 stale `views-sessions.jsx` mentions in route-map.md before this final run.)
- [x] 6.3 Check C(a) skill dir clean — PASS.
- [x] 6.4 Check C(b) route-map file paths resolve — PASS, all 15 non-"not shipped" paths verified against `apps/web/app/**/page.tsx`.
- [x] 6.5 Check D brand link resolves — PASS.
- [x] 6.6 Skill Phase-1 dry-run for `/campaigns/:id/sessions/:sid` — PASS.
- [x] 6.7 Roadmap Block 11 reframed + done, handoff/ empty — PASS.

## STATUS: ALL 21 TASKS COMPLETE. All Phase 6 gates PASS. Working tree not committed per orchestrator instructions.
