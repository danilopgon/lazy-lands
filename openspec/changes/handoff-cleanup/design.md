# Design: Handoff cleanup (Block 11)

## Technical Approach

Exploration Approach 3 (user-confirmed): delete `handoff/` in its entirety and repoint its
durable reference value onto the shipped `apps/web/` app + `DESIGN.md`, as ONE change. There is
**no runtime product code** in scope — only docs, one skill, one skill reference file, and one
relocated brand asset. The `frontend-handoff-contract` *process* is retained; only its input
substrate changes from prototype JSX (`handoff/app/*.jsx`, `chronicle.css`, `ui.jsx`) to the
shipped screens under `apps/web/app/[locale]/**` plus `DESIGN.md`.

The single hard dependency: **the skill + route-map rewrite must ship in the same change as the
deletion.** If deletion lands without the substrate swap, `frontend-handoff-contract` hard-stops
on the next frontend task (Phase 1 reads a directory that no longer exists). This coupling is the
central architectural constraint and drives the operation ordering below.

## Architecture Decisions

### Decision 1 — `route-map.md`: repoint the File column onto shipped routes (do NOT drop it)

**Choice**: Keep the Route → File → Component table and repoint the File column from
`handoff/app/*.jsx` to the shipped `apps/web/app/[locale]/**/page.tsx` entry for each route. Rename
the columns to **Route → Shipped screen → Presentational component(s)** and add a **Notes** column
to carry the mapping exceptions surfaced below.

| Option | Tradeoff | Verdict |
|---|---|---|
| Repoint File column to shipped `apps/web/app/[locale]/**` | Preserves the one piece of non-derivable value: which physical file implements each logical route, including the cases where logical route ≠ shipped path | **Chosen** |
| Drop the File column ("Next.js routing is self-locating") | False economy: the app prefixes every route with a `[locale]` segment and two logical routes do NOT map 1:1 to a `page.tsx` (see below). Dropping loses the ability to encode those exceptions and forces re-derivation on every skill run | Rejected |

**Rationale — the column is load-bearing precisely because the mapping is not mechanical.** The
filesystem check during design exposed staleness beyond the two known entries:

- **Path divergence**: logical `/campaigns` (Dashboard) ships at
  `apps/web/app/[locale]/dashboard/page.tsx`, not `campaigns/page.tsx`.
- **No shipped route**: `/campaigns/:id/settings` (`SettingsView`, which shared `views-detail.jsx`
  with `CampaignDetail`) has **no** `page.tsx` — it is not shipped as a standalone route.
- **The two known-stale entries** (`MemoryReview`, `GeneratedSession`) pointed at the wrong handoff
  file; repointing them at their real shipped routes resolves the staleness as a side effect.

**Policy (the load-bearing design output, not the individual rows)** — the rewritten column
represents each route by one of three explicit forms:

1. **Direct** — route maps 1:1 to a shipped `page.tsx`: cite that path + its presentational
   component under `apps/web/components/**`.
2. **Path-diverged** — logical route ships at a different path: cite the real path and add a Notes
   entry stating the divergence (e.g. "list view ships at `/dashboard`").
3. **Not shipped** — no route exists yet (settings): mark `— not shipped —` and Notes
   "build from `DESIGN.md` + `PRODUCT.md` (no shipped precedent)". Never invent a path.

Sample rewritten rows (representative — full table is a tasks-phase edit):

| Route | Shipped screen | Component(s) | Notes |
| --- | --- | --- | --- |
| `/campaigns` | `apps/web/app/[locale]/dashboard/page.tsx` | `components/campaigns/…` | List view ships at `/dashboard` |
| `/campaigns/:id/memory/review` | `apps/web/app/[locale]/campaigns/[id]/memory/review/page.tsx` | `components/…/memory-review-view` | Was stale (→ `views-sessions.jsx`) |
| `/campaigns/:id/sessions/:sid` | `apps/web/app/[locale]/campaigns/[id]/sessions/[sessionId]/page.tsx` | `components/sessions/generated-session-view` | Was stale (→ `views-sessions.jsx`) |
| `/campaigns/:id/settings` | — not shipped — | — | Build from `DESIGN.md` + `PRODUCT.md` |

The **Shared Components** catalog (currently "handoff/app/ui.jsx") is repointed to the production
primitives under `apps/web/components/**` (Field, Modal, Notice, LoadingScribe, etc.); the
**Design System Quick Reference** block is already `DESIGN.md`-derived and JSX-independent — it
stays verbatim.

### Decision 2 — `SKILL.md`: swap the reference substrate, preserve the adversarial discipline

**Choice**: Redefine the source of truth as `DESIGN.md` + the shipped `apps/web/` screen; keep
Phase 3 (adversarial self-review, per-line state enumeration, PASS/FAIL verdict) structurally
untouched. Only *what the compliance report compares against* changes.

| Option | Tradeoff | Verdict |
|---|---|---|
| Substrate swap, process intact | Retains the skill's durable value (states/copy/motion parity discipline) while removing the dead JSX dependency | **Chosen** |
| Retire the skill | Loses the independent-value review process; rejected in exploration | Rejected |
| Slim to catalog-only | Too narrow — a genuinely new screen (Block 12+) with no shipped precedent would have no contract at all | Rejected |

**The crux — what does the compliance report compare against when there is no prototype?** The old
model assumed a per-view JSX existed for every screen. Post-deletion there are two cases, and the
rewrite must name both:

- **Shipped screen (regression/parity work)** — compare against the shipped
  `apps/web/app/[locale]/**` screen + `DESIGN.md` tokens/motion. The shipped screen is now the
  visual baseline.
- **New screen, no precedent (new features)** — the visual spec is `DESIGN.md` (design system) +
  `PRODUCT.md` (copy, states, entity semantics) + the SDD spec's handoff checklist + the nearest
  shipped sibling screen as pattern reference. No hard-stop for "prototype not found".

Sections that change (representative wording, exact edits in tasks phase):

- **Frontmatter `description`**: "read prototype" → "read the shipped screen + `DESIGN.md`".
- **Hard Rule 1** — new wording: *"`DESIGN.md` + the shipped `apps/web/` screen define what to
  build. For a screen with no shipped precedent, `DESIGN.md` + `PRODUCT.md` + the spec's handoff
  checklist are authoritative. If the spec contradicts the design system, flag the conflict — do
  not silently deviate."*
- **Phase 1 steps 2–4**: step 2 route-map lookup now yields the shipped screen file; step 3 reads
  the shipped `page.tsx` + its presentational components (skip if new screen with no precedent);
  step 4 reads shared production primitives under `apps/web/components/**` (not `ui.jsx`).
- **Phase 2 bullet**: "shared component from `ui.jsx`" → "shared production primitive under
  `apps/web/components/**`; if it does not exist, build it first."
- **Phase 3 step 1**: "re-read the handoff component" → "re-read the reference substrate (shipped
  sibling/precedent screen + `DESIGN.md`)". Steps 3–7 (report, per-line states, verdict) unchanged.
- **Decision Gates**: "Handoff file not found → Stop, ask which handoff file" becomes "No shipped
  precedent (new screen) → build from `DESIGN.md` + `PRODUCT.md` + spec checklist; do not
  hard-stop". "Unsure about a detail → check `DESIGN.md`, then `handoff/app/chronicle.css`" becomes
  "check `DESIGN.md`, then `route-map.md` quick-reference, then a shipped sibling screen".
- **References**: drop the two `handoff/app/*` bullets; keep `route-map.md`, `DESIGN.md`,
  `PRODUCT.md`; add `apps/web/components/**` (shared primitives) and `apps/web/app/[locale]/**`
  (shipped screens).

### Decision 3 — AGENTS.md orchestrator rule is a structural rewrite, coupled to Decision 2

**Choice**: Treat the "Orchestrator: frontend tasks require handoff context in SDD phases" rule as
a *substrate swap*, not a passing mention. It carries the identical prototype-JSX dependency as
SKILL.md Phase 1 (read route-map → read handoff component → read `ui.jsx` → extract checklist) and
is the *mechanism* that authors the handoff checklist which becomes the visual spec for a new
screen. It must be rewritten in lockstep with Decision 2.

Post-deletion the rule's checklist-authoring steps read: route-map → shipped screen source (or,
for a new screen, `DESIGN.md` + `PRODUCT.md` + nearest shipped sibling) → shared primitives under
`apps/web/components/**` → extract the field/copy/**states**/layout/tokens/**shared
components**/**motion** checklist. The checklist remains mandatory SDD context; only its inputs
change. The other two AGENTS.md handoff rules (design-reference, mandatory-contract) are true
mention edits and belong to the doc sweep (Decision 5).

### Decision 4 — Brand PNG: relocate to `docs/assets/brand/` with a hyphen-only filename

**Choice**: `git mv handoff/Lazy Lands - LinkedIn Card.png` →
`docs/assets/brand/lazy-lands-linkedin-card.png` (lowercase, hyphen-only, no spaces), and fix the
pre-existing broken `DESIGN.md` reference (line 209 uses an em-dash `Lazy Lands — LinkedIn
Card.png` that never matched the real hyphen filename) to point at the new path.

| Option | Tradeoff | Verdict |
|---|---|---|
| Relocate to `docs/assets/brand/` + fix DESIGN.md ref | Preserves the only identity asset in a durable, discoverable home; opportunistically fixes a live broken link | **Chosen** |
| Drop it (git-recoverable) | Acceptable per adjustable sub-decision, but discards the sole brand identity artifact for ~630K of one-time weight; recoverable but not discoverable | Rejected (noted as fallback) |

The move is a `git mv` (not delete+add) to preserve file history. Filename hyphen-only avoids
shell-quoting and URL-encoding fragility that the spaced+em-dash original invited.

### Decision 5 — Verification by link-integrity grep gate, not a test runner

**Choice**: Because there is no runtime code, replace test-runner verification with two grep gates
plus a skill-resolves check and a brand-link check. Deterministic, CI-reproducible.

| Option | Tradeoff | Verdict |
|---|---|---|
| Grep gates + resolves/link checks | Directly proves the change's actual goal ("no dangling reference; skill still resolves") | **Chosen** |
| Run existing test suite | Proves nothing — no product code changed; green suite is not evidence of link integrity | Rejected |

See **Verification Design** for the exact commands and exception set.

## Ordered Operation Sequence

Two ordering constraints are **hard**; the middle is a wash within one atomic commit.

1. **Relocate the brand PNG first** (`git mv`). HARD — must precede deletion, or the bulk
   `handoff/` removal destroys the working-tree copy (history-recoverable, but the move preserves
   history cleanly and keeps the tree consistent).
2. **Rewrite the substrate** — `SKILL.md` (Decision 2), `route-map.md` (Decision 1), AGENTS.md
   orchestrator rule (Decision 3). Repointing references *before* deletion keeps every intermediate
   commit self-consistent if the change is later split.
3. **Update doc mentions** — AGENTS.md (other 2 rules), `README.md`, `docs/README.md`, `DESIGN.md`
   (lines 7, 209, 215, 314–316), `PRODUCT.md`, `.prettierignore`, `docs/conventions/*`,
   `docs/11-backlog.md`, `docs/10-roadmap.md` (reframe + mark Block 11 done).
4. **Delete `handoff/`** — the irreversible-looking step, done once every reference is repointed.
5. **Run the verification gate** last (Decision 5) — it validates the union of all prior steps, so
   it must run after both the rewrites and the deletion.

Within one commit the tree is identical regardless of step 2-vs-4 order; the recommended order
(repoint → delete) matters only for commit-by-commit reviewability.

## Verification Design (replaces Testing Strategy)

**Gate A — path-prefix dangling references.** Repo-wide, must return zero hits:

```
rg -n --hidden -g '!.git' -g '!openspec/specs/**' -g '!openspec/changes/**' 'handoff/'
```

Exception set = `openspec/specs/**` (accepted dangling risk; live specs not edited) +
`openspec/changes/**` (archive + historical change docs + this change's own
proposal/design/tasks/spec, all of which legitimately cite `handoff/`). Excluding
`openspec/changes/**` wholesale is deliberate: the gate must not false-fail on its own artifacts.
Note: the skill directory name `frontend-handoff-contract` and filenames like `handoff-deviations`
do NOT contain the `handoff/` path prefix, so they never match.

**Gate B — prefix-less basename dangling references.** A prose ref like `chronicle.css` or `ui.jsx`
without the `handoff/` prefix survives Gate A and dangles after deletion. Same exception set:

```
rg -n --hidden -g '!.git' -g '!openspec/specs/**' -g '!openspec/changes/**' \
  'chronicle\.css|ui\.jsx|views-[a-z-]+\.jsx|Prototype\.html'
```

The design-phase scan confirmed live hits in non-excepted files (`AGENTS.md`, `DESIGN.md`,
`SKILL.md`, `route-map.md`, `docs/11-backlog.md`) — this gate is load-bearing, not defensive.

**Check C — skill still resolves.** (a) `rg 'handoff/' .agents/skills/frontend-handoff-contract/`
returns zero. (b) Every File-column path in the rewritten `route-map.md` that is not marked
`— not shipped —` resolves to an existing file on disk.

**Check D — brand link resolves.** The `DESIGN.md` brand reference points at
`docs/assets/brand/lazy-lands-linkedin-card.png` and that file exists.

## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or
process-integration boundary. Doc/skill/asset text changes and one file move only.

## Migration / Rollout

No DB, schema, config, or runtime change. No compat shim. The only "migration" is the brand-asset
move + its single reference update, both landed atomically in this change.

## Rollback

Single-change `git revert` restores `handoff/`, the original `SKILL.md` / `route-map.md` /
AGENTS.md, all doc wording, and the brand asset's original location. All deleted content remains
independently recoverable from git history regardless of revert.

## Open Questions

- [ ] Confirm in the tasks/apply phase whether `SettingsView` should stay `— not shipped —` or be
  represented as a sub-view of `campaigns/[id]/page.tsx` (it shared `views-detail.jsx` with
  `CampaignDetail`). Design default: `— not shipped —` until a settings route ships.
