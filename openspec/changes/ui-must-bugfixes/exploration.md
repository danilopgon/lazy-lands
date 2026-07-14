# Exploration — UI MUST bugfixes (#40 + #63)

> Artifact store: hybrid. Mirror of Engram topic `sdd/ui-must-bugfixes/explore`.
> Two independent MUST-priority bug fixes, bundled per user request but kept as
> separate workstreams (different modules, files, and risk profiles). They should
> remain distinct task groups / commits in the later phases.

## Issue #40 — Sessions/Memories counts on campaign dashboard cards

### Current state
- `apps/web/app/[locale]/dashboard/page.tsx` fetches `getCampaigns()` and renders `<CampaignList>`.
- `apps/web/components/campaigns/campaign-card.tsx` (lines 26–35) hardcodes `'—'` for
  Sessions and Memories in a 5-column stat array. **Visual contract to preserve — stat
  order: Sessions, NPCs, Factions, Memories, Arcs.** A comment says data is missing "until
  Block 7"; that block has shipped, so the placeholder is now stale.
- `apps/web/lib/campaigns/schemas/reads.ts` `campaignSummarySchema` has only
  `npc_count` / `faction_count` / `arc_count` (no session/memory fields).
- Backend `services/api/app/modules/campaigns/infrastructure/repository.py`
  `list_campaigns()` uses one PostgREST nested-count select
  (`npc_count:npcs(count)`, …) with `_normalize_campaign_summary()` unwrapping
  `[{"count": N}]` → `N`.
- `services/api/app/modules/campaigns/application/read_models/campaign.py`
  `CampaignSummary` mirrors the same three count fields.
- `supabase/migrations/20260628101707_initial_schema.sql`: both `sessions.campaign_id`
  and `memory_facts.campaign_id` have real FKs to `campaigns(id)` — nested embedding is
  mechanically available like the existing three counts.
- `memory_facts.status` (`services/api/app/modules/memory/domain/enums.py`) is
  `active`/`archived`. The correct "Memories" count is **active only**; an unfiltered
  `memory_facts(count)` would wrongly include archived rows.
- Test to update: `apps/web/app/[locale]/dashboard/__tests__/page.test.tsx:244–255`
  asserts `getAllByText('—')).toHaveLength(2)`.

### Approaches
1. **Unfiltered nested-count for both** — low effort, but miscounts Memories (includes
   archived). Rejected for the memory metric.
2. **Nested select + PostgREST embed-filter for memory status** — unverified whether
   supabase-py composes a per-embed filter alongside multiple count aggregates in one
   select; risky to rely on without direct verification.
3. **Hybrid (recommended): nested `session_count:sessions(count)` (safe, unfiltered) + a
   separate grouped `.eq("status","active")` count query for `memory_facts`.** Correctness
   is explicit and testable; avoids N+1 by grouping across the caller's campaigns rather
   than per-card.

### Files affected
`campaign-card.tsx`, `lib/campaigns/schemas/reads.ts`, `dashboard/__tests__/page.test.tsx`,
`campaigns/application/read_models/campaign.py`, `campaigns/infrastructure/repository.py`,
plus backend test fixtures.

## Issue #63 — PDF export renders raw Markdown

### Current state
- `services/api/app/modules/sessions/infrastructure/pdf_renderer.py` uses Jinja2 with
  `autoescape=True`.
- `templates/session_export.html.jinja` splits `section.body` on `\n` into bare
  `<p>{{ paragraph }}</p>` — autoescape neutralizes Markdown syntax, printing it
  literally. This is the exact bug.
- `domain/pdf_export.py` `ExportSection.body: str` is plain text, no HTML/markdown
  distinction.
- No markdown or sanitizer dependency exists yet (`pyproject.toml` has only `jinja2`,
  `weasyprint`).
- **Security pivot:** rendering Markdown requires converting to HTML and marking it `safe`
  — deliberately bypassing autoescape for that value. That makes sanitization mandatory,
  not optional, per AGENTS.md's "never execute AI/user content as HTML." Conversion +
  sanitize must live in a Python-layer step (not a bare Jinja filter) so the guarantee is
  unit-testable in isolation.

### Approaches
1. **(recommended)** `markdown` / `markdown-it-py` + `nh3` (Rust-backed, actively
   maintained sanitizer): convert + sanitize in Python before templating; the template
   does `{{ section.html_body | safe }}` on that one sanitized field only.
2. Same but with `bleach` — rejected; `bleach` is effectively unmaintained upstream,
   weaker long-term posture for a hard security rule.
3. Sanitize-in-Jinja-filter — rejected; couples the safety-critical step to the template
   layer where a future edit can bypass it.

### Files affected
`pdf_renderer.py`, `templates/session_export.html.jinja`, `domain/pdf_export.py` (possibly
extend `ExportSection`), `pyproject.toml` (new deps), `tests/sessions/test_pdf_export.py`
(new markdown + adversarial-injection cases).

## Risks
- **#40**: unverified PostgREST/supabase-py embed-filter composition if approach 2 is
  attempted; N+1 risk if the memory count is not grouped across campaigns.
- **#63**: sanitizer allowlist tuning (too loose = injection, too strict = broken
  formatting); new dependency footprint; WeasyPrint CSS needed for newly-allowed tags
  (headings/lists/blockquote/code) to match existing visual polish.

## Ready for proposal
Yes for both. Independent workstreams — keep them as distinct task groups / commits in
proposal and tasks, mindful of the 400-line review budget guard.
