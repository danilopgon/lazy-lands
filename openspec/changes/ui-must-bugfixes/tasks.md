# Tasks: UI MUST bugfixes (#40 + #63)

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Group A (#40) estimated changed lines | ~90-130 (repository select + normalize + tests, read model field, Zod schema field, `campaign-card.tsx` stat wiring, `page.test.tsx` assertion swap) |
| Group B (#63) estimated changed lines | ~180-260 (new `markdown_html.py` + its tests, `pdf_renderer.py` view-object wiring, template markup + scoped CSS, `pyproject.toml` deps, `test_pdf_export.py` additions) |
| Combined estimated changed lines | ~270-390 |
| 400-line budget risk | Medium (combined is close to the 400-line ceiling; each group alone is comfortably under it) |
| Chained PRs recommended | Yes |
| Suggested split | Two chained PRs — PR1 = Group A (#40 dashboard counts), PR2 = Group B (#63 PDF markdown) |
| Chain order | PR1 (#40) merges to `main` first; PR2 (#63) branches from post-PR1 `main`. No code dependency between them — order is chosen only to land the smaller, purely-additive read-model change first per `design.md`'s stated rollout order. |
| Delivery strategy | ask-on-risk |
| Chain strategy | stacked-to-main |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: Medium

Both `proposal.md` (Risks table) and `design.md` (Technical Approach, Migration/Rollout)
already commit to two chained PRs in this order (stacked-to-main: each PR merges to main
in order); this forecast confirms the estimate stays consistent with that prior decision
rather than introducing a new one requiring user input. Each group is independently
revertible (see proposal's Rollback Plan) and touches disjoint files, so splitting has no
cross-group merge risk.

### Parallel vs Sequential

- Within each group, RED tasks MUST precede GREEN tasks (strict TDD, sequential).
- Group A and Group B touch disjoint files and share no code — their *implementation work*
  can proceed fully in parallel (e.g. two engineers/sessions working simultaneously).
- Only *merge order* is chained: PR1 (#40) merges to `main` before PR2 (#63) branches from
  post-PR1 `main`, per the stacked-to-main chain strategy above. This is a merge-sequencing
  constraint, not an implementation-order constraint.

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| A | Dashboard Sessions/Memories live counts (#40) | PR 1 | `uv run pytest tests/campaigns/test_repository.py tests/campaigns/test_routes.py` (backend) + `pnpm --filter web test -- dashboard campaigns` (frontend, covers `dashboard/__tests__/page.test.tsx` + `tests/campaigns/api-reads.test.ts`/`schemas.test.ts`) | Vitest + RTL, pytest | `git revert` the single Group A commit/PR restores `'—'` placeholders and drops the two read-model/schema fields |
| B | PDF Markdown rendering with sanitization (#63) | PR 2 | `uv run pytest tests/sessions/test_markdown_html.py tests/sessions/test_pdf_export.py` | pytest + WeasyPrint | `git revert` the single Group B commit/PR restores plain-paragraph rendering and removes the new deps |

---

## Group A / PR1 — #40 Dashboard Sessions/Memories counts

Satisfies `campaign-view` spec: "List owned campaigns" (session_count/memory_count in
response) and "Dashboard campaign list screen" (live stat columns, order preserved, zero
as numeric `0`).

### A1. RED — failing tests first

- [x] A1.1 Backend: add a failing test asserting `SupabaseCampaignRepository.list_campaigns()` includes `session_count` (all sessions) and `memory_count` (active-only, excluding archived) per campaign, covering the "5 sessions, 3 active + 2 archived memory facts" scenario from `specs/campaign-view/spec.md`.
- [x] A1.2 Backend: add a failing test for `_normalize_campaign_summary` unwrapping the nested `session_count:sessions(count)` shape (list-of-dict → int, `None`/`[]` → `0`), mirroring existing npc/faction/arc normalization tests.
- [x] A1.3 Backend: add a failing test asserting the memory-count query is skipped entirely (never called with `.in_([])`) when the caller has zero campaigns.
- [x] A1.4 Frontend: in `apps/web/app/[locale]/dashboard/__tests__/page.test.tsx`, replace the `'renders Sessions and Memories as "—" placeholders'` test (lines 244-256) with a failing test asserting real `session_count`/`memory_count` values render in the correct stat order (Sessions, NPCs, Factions, Memories, Arcs), plus a zero-count case asserting `"0"` renders (not a dash). Add `session_count`/`memory_count` to the `buildCampaign` fixture defaults.
- [x] A1.5 Grep `apps/web` tests/mocks/handlers for `npc_count`/`faction_count`/`arc_count` fixtures and note every `CampaignSummary`-shaped mock that will need `session_count`/`memory_count` added once the Zod fields become required (informs A2.8). Found: `apps/web/tests/campaigns/api-reads.test.ts` (`VALID_SUMMARY`), `apps/web/app/[locale]/dashboard/__tests__/page.test.tsx` (`buildCampaign`). No MSW handlers or other `CampaignSummary`-shaped fixtures found.
- [x] A1.6 Confirm all new/modified tests fail for the right reason (missing fields / stale assertions) before writing implementation.

### A2. GREEN — implementation

- [x] A2.1 In `services/api/app/modules/campaigns/infrastructure/repository.py::list_campaigns`, add `"session_count:sessions(count)"` to the existing `select(...)` string alongside npc/faction/arc counts.
- [x] A2.2 In the same method, after fetching campaign rows, run a separate grouped query: `memory_facts` filtered by `.in_("campaign_id", campaign_ids).eq("status", "active")`, counted per campaign in Python. Skip this query entirely when `campaign_ids` is empty (never call `.in_([])`). Implemented as `_active_memory_counts`.
- [x] A2.3 Extend `SupabaseCampaignRepository._normalize_campaign_summary` to unwrap `session_count` the same way as the other three nested counts, and to merge in the separately-queried `memory_count` (default `0`).
- [x] A2.4 In `services/api/app/modules/campaigns/application/read_models/campaign.py`, add `session_count: int = 0` and `memory_count: int = 0` to `CampaignSummary`, so `CampaignSummary(**row)` picks up both fields via spread.
- [x] A2.5 In `apps/web/lib/campaigns/schemas/reads.ts`, add `session_count: z.number()` and `memory_count: z.number()` to `campaignSummarySchema`.
- [x] A2.6 In `apps/web/components/campaigns/campaign-card.tsx`, replace the two `'—'` stat entries with `campaign.session_count` and `campaign.memory_count`; remove the stale "until Block 7" comment; preserve stat order Sessions, NPCs, Factions, Memories, Arcs exactly.
- [x] A2.7 Update existing `list_campaigns` repository tests/mocks that only stub the `campaigns` table: add a `memory_facts` mock response so the new grouped query doesn't hit an unmocked call.
- [x] A2.8 Update every `CampaignSummary`-shaped fixture/mock found in A1.5 (frontend tests, MSW/api handlers, backend read-model/handler fixtures) to include `session_count`/`memory_count`, since both fields become required on the schema.
- [x] A2.9 Confirm any existing `GET /campaigns` endpoint/handler-level test asserting the response shape is updated to expect `session_count`/`memory_count` (spec scenario is phrased at the HTTP response level; repository-level coverage from A1.1-A1.3 must be mirrored here if such a test exists). Updated `test_routes.py` and `test_schema.py`.
- [x] A2.10 Run the Group A test suites (backend campaign repository/read-model/handler tests, frontend `dashboard/__tests__/page.test.tsx` and any other `CampaignSummary` consumers) and confirm all pass (GREEN), including the previously-passing NPC/faction/arc-count tests (no regression).

### A3. Verification

- [x] A3.1 `pnpm --filter web typecheck` and `pnpm --filter web lint` pass with no new errors.
- [x] A3.2 `uv run ruff check app/` (from `services/api/`) passes with no new errors.
- [x] A3.3 Manually confirm (via existing fixture/test data or a scratch check) that a campaign with 0 sessions and 0 active memories renders `"0"` in both stat columns, not a dash. Covered by the new `'renders zero Sessions and Memories counts as numeric "0", not a dash'` test in `page.test.tsx`, which passes.

---

## Group B / PR2 — #63 PDF Markdown rendering

Satisfies `pdf-export` spec: "Render section bodies as sanitized Markdown" (formatted
output, adversarial-injection neutralization, plain-text passthrough, export never fails).

### B1. RED — failing tests first

- [ ] B1.1 Create `services/api/tests/sessions/test_markdown_html.py` with failing unit tests for a new `markdown_to_safe_html(body: str) -> str` function covering: headings render as `<h1>`-`<h6>`; unordered/ordered lists render as `<ul>/<ol>/<li>`; `**bold**`/`*italic*` render as `<strong>/<em>`; `[text](https://...)` renders as `<a href="...">`; plain text with no markdown syntax renders unchanged as a single paragraph (byte-identical content, just wrapped).
- [ ] B1.2 In the same file, add failing adversarial-injection tests: `<script>alert('x')</script>` is stripped/neutralized (no `<script>` tag in output); `<img src=x onerror="alert(1)">` has its `onerror` attribute stripped; a raw `javascript:` URL in a markdown link is neutralized (href removed or scheme rejected); raw HTML injection mixed with ordinary markdown text still lets the surrounding markdown render formatted.
- [ ] B1.3 In `services/api/tests/sessions/test_pdf_export.py`, add a failing integration-level test asserting the rendered `session_export.html.jinja` output contains formatted HTML (e.g. `<h2>` or `<strong>`) for a section body with markdown syntax, and add a failing test for the full "Injection payload is neutralized and export still succeeds" scenario from `specs/pdf-export/spec.md` (valid non-empty PDF, no script/event-handler/`javascript:` in rendered HTML, surrounding text still formatted).
- [ ] B1.4 Add a failing test asserting a plain-text section body (no markdown syntax) renders as a plain paragraph identical to the source text (regression guard for existing behavior).
- [ ] B1.5 Add a failing test asserting only `section.html_body` is marked `safe` in the render — every other rendered field (title, label, origin) remains escaped (e.g. assert a `<`/`>` in a title/label renders as `&lt;`/`&gt;`, not raw markup).
- [ ] B1.6 Confirm all new tests fail for the right reason (missing module / stale template) before writing implementation.

### B2. GREEN — implementation

- [ ] B2.1 Add `markdown-it-py` and `nh3` to `services/api/pyproject.toml` dependencies; sync the lockfile.
- [ ] B2.2 Create `services/api/app/modules/sessions/infrastructure/markdown_html.py` with `markdown_to_safe_html(body: str) -> str`: convert via `markdown-it-py` (CommonMark), then sanitize via `nh3.clean` with an allowlist of `h1-h6, p, ul, ol, li, strong, em, a, blockquote, code, pre`, attribute allowlist limited to `href` on `a`, and URL schemes limited to `http, https, mailto` (blocks `javascript:` and event-handler attributes by omission from the allowlist).
- [ ] B2.3 In `services/api/app/modules/sessions/infrastructure/pdf_renderer.py`, build render-time view objects (not the frozen domain `ExportSection`) that carry the section's existing fields plus a new `html_body` computed via `markdown_to_safe_html(section.body)`; pass these view sections to the template context instead of raw domain sections.
- [ ] B2.4 In `session_export.html.jinja`, replace the `{% for paragraph in section.body.split('\n') %}<p>{{ paragraph }}</p>{% endfor %}` loop with `<div class="section-body">{{ section.html_body | safe }}</div>`. Confirm every other interpolated field (`document.title`, `section.label`, `section.origin`) is untouched and stays autoescaped.
- [ ] B2.5 Add scoped CSS in the template's `<style>` block for `.section-body h1..h6` (smaller sizes than the template's global `<h1>/<h2>` chrome, to avoid collision) plus `.section-body ul/ol/li`, `.section-body blockquote`, `.section-body code/pre` styling matching the existing document's visual polish. This is its own reviewable diff hunk, not folded into B2.4's markup change.
- [ ] B2.6 Run the Group B test suites (`test_markdown_html.py`, `test_pdf_export.py`) and confirm all pass (GREEN), including previously-passing PDF export tests (no regression).

### B3. Verification

- [ ] B3.1 `uv run ruff check app/` (from `services/api/`) passes with no new errors.
- [ ] B3.2 `uv run mypy` (if configured for this module) passes with no new errors.
- [ ] B3.3 Manually confirm a representative multi-section export (mixed markdown + plain-text sections) produces a valid PDF with no literal `#`/`-`/`**` syntax visible and no heading-size collision between template chrome and section-body headings.
- [ ] B3.4 Confirm ownership/RLS scoping on the export endpoint is unchanged (no new query paths touching ownership checks).
