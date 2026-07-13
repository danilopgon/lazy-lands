# Proposal: UI MUST bugfixes (#40 + #63)

## Intent

Two shipped MVP screens display broken output today. On the campaign dashboard, every
`CampaignCard` hardcodes `'—'` for Sessions and Memories (a stale "until Block 7"
placeholder; Block 7 has shipped), so DMs never see real activity counts. In the PDF
export, section bodies containing Markdown render as literal syntax (`##`, `-`, `**`)
because Jinja `autoescape=True` neutralizes it — the exported chronicle looks unfinished.
Both are MUST-priority per the TFM MoSCoW. They are unrelated (dashboard read model vs.
PDF renderer) and share no code; bundled into one change per user choice, kept as two
separate workstreams throughout.

## Scope

### In Scope

**Workstream A — #40 dashboard Sessions/Memories counts**
- Backend: add `session_count:sessions(count)` (unfiltered nested count) to the existing
  PostgREST select in `campaigns/infrastructure/repository.py`; add a SEPARATE grouped
  `.eq("status","active")` count query for `memory_facts` (active only). Extend
  `CampaignSummary` read model + `_normalize_campaign_summary`.
- Frontend: add `session_count` + `memory_count` to `campaignSummarySchema` (Zod); wire
  into `CampaignCard`'s stat row replacing the two `'—'`, PRESERVING stat order (Sessions,
  NPCs, Factions, Memories, Arcs) and the shipped visual contract.

**Workstream B — #63 PDF markdown rendering**
- Add a Python-layer Markdown→HTML→sanitize step in
  `sessions/infrastructure/pdf_renderer.py` producing a sanitized `html_body`; template
  renders it via `{{ ... | safe }}` on that one field only, keeping `autoescape=True`
  elsewhere. Add markdown renderer + `nh3` sanitizer deps to `pyproject.toml`. Add
  WeasyPrint CSS for newly-allowed tags (headings/lists/blockquote/code).

### Out of Scope
- Persisting or counting memory suggestions (only active `memory_facts`).
- Redesigning the dashboard card or PDF layout beyond these fixes.
- Any change to ownership/RLS behavior (both endpoints already ownership-scoped).
- PostgREST embed-filter composition (exploration Approach 2, rejected as unverified).

## Capabilities

> `openspec/specs/` holds `campaign-view`, `entity-management`, `pdf-export`,
> `repository-bootstrap`. Both fixes modify observable behavior of existing capabilities.

### New Capabilities
- None.

### Modified Capabilities
- `campaign-view`: dashboard cards MUST show real active-session and active-memory counts
  instead of placeholders.
- `pdf-export`: exported section bodies MUST render Markdown as sanitized formatted HTML,
  not literal syntax.

## Approach

Two independent workstreams (exploration recommended approaches; not reopened):

**A (#40):** hybrid counting — nested unfiltered `session_count` alongside the existing
count aggregates, plus a separate grouped active-memory count across the caller's
campaigns (avoids N+1 and archived-row miscount). Frontend surfaces both via the Zod read
schema into the existing stat row.

**B (#63):** convert+sanitize Markdown in unit-testable Python (NOT a Jinja filter) so the
autoescape-bypass is a hard, isolated security boundary; only the sanitized `html_body` is
marked `safe`. Sanitization is mandatory per AGENTS.md (never execute AI/user content as
HTML). Tests cover representative markdown + adversarial-injection cases.

Strict TDD applies to both: failing tests first.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `campaigns/infrastructure/repository.py` | Modified | Nested session count + grouped active-memory count |
| `campaigns/application/read_models/campaign.py` | Modified | Add `session_count`, `memory_count` |
| `lib/campaigns/schemas/reads.ts` | Modified | Add both fields to `campaignSummarySchema` |
| `components/campaigns/campaign-card.tsx` | Modified | Wire counts into stat row; drop `'—'` |
| `dashboard/__tests__/page.test.tsx` | Modified | Replace two-`—` assertion |
| `sessions/infrastructure/pdf_renderer.py` | Modified | Markdown→HTML→sanitize step |
| `templates/session_export.html.jinja` | Modified | Render sanitized `html_body` via `| safe` |
| `domain/pdf_export.py` | Modified | Possibly extend `ExportSection` |
| `services/api/pyproject.toml` | Modified | Add markdown renderer + `nh3` |
| `tests/sessions/test_pdf_export.py` | Modified | Markdown + injection cases |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Combined diff approaches 400-line review budget | Medium | Ship as two chained/stacked PRs (one per workstream); tasks phase MUST produce a Review Workload Forecast to decide |
| Memory count includes archived rows | Low | Explicit `.eq("status","active")` grouped query; unfiltered count rejected |
| N+1 on memory count | Low | Group across caller's campaigns, not per-card |
| Sanitizer allowlist too loose (injection) or too strict (broken formatting) | Medium | Adversarial-injection tests + tuned allowlist for the supported tag set |
| Dashboard visual contract drifts | Low | Preserve stat order; shipped card + DESIGN.md are source of truth |

## Rollback Plan

Each workstream reverts independently (separate commits/PRs). Reverting A restores the
`'—'` placeholders and drops the read-model/schema fields; reverting B restores plain-text
paragraphs and removes the new deps. No schema migrations, no data changes — pure
read-path and render-path changes.

## Dependencies

- `sessions.campaign_id` and `memory_facts.campaign_id` FKs (present) enable nested embed.
- New Python deps: a Markdown renderer + `nh3` sanitizer (added to `pyproject.toml`).

## Success Criteria

- [ ] Dashboard cards show real Sessions (all) and Memories (active only) counts; stat
      order and visual contract preserved.
- [ ] `page.test.tsx` no longer asserts two `'—'`; asserts real counts.
- [ ] Backend correctly excludes archived `memory_facts` from the memory count.
- [ ] PDF renders Markdown as formatted HTML; adversarial-injection tests pass; only
      `html_body` bypasses autoescape.
- [ ] WeasyPrint CSS styles the newly-allowed tags to match existing polish.
- [ ] Ownership/RLS behavior unchanged on both endpoints.
- [ ] Tasks phase emits a Review Workload Forecast; delivery resolves to chained PRs if
      the forecast is high (ask-on-risk).
