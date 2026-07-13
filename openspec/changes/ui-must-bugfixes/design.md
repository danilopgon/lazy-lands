# Design: UI MUST bugfixes (#40 + #63)

## Technical Approach

Two independent workstreams shipped as **two chained PRs** (PR1 = #40 dashboard
counts, PR2 = #63 PDF markdown). They share no code; each stays well inside the
400-line review budget. Both are pure read/render-path changes — no migrations,
RLS/ownership unchanged. Strict TDD: RED tests first in each workstream.

## Architecture Decisions

| # | Decision | Choice | Rejected | Rationale |
|---|----------|--------|----------|-----------|
| A1 | Session count | Nested unfiltered `session_count:sessions(count)` in the existing select | Separate query | Sessions have no status filter; nested count is free and mirrors existing three counts |
| A2 | Memory count | Separate grouped query: `memory_facts` `.eq("status","active")` across caller campaign ids, counted in Python | Unfiltered nested count; per-embed filter | Unfiltered miscounts archived rows; per-embed filter composition is unverified (exploration Approach 2). One extra query avoids N+1 |
| A3 | Mapping | Add both keys in `_normalize_campaign_summary`; `CampaignSummary(**row)` spreads them | Explicit field construction | Query handler uses `**row` spread — new Pydantic fields flow through with defaults |
| B1 | Markdown lib | `markdown-it-py` + `nh3` | `python-markdown`; `bleach` | CommonMark-compliant, actively maintained; `nh3` is Rust-backed and maintained (`bleach` unmaintained) |
| B2 | Boundary location | Isolated `markdown_to_safe_html(body) -> str` in new infra module `markdown_html.py`; renderer builds render-time view objects | Extend frozen domain `ExportSection`; Jinja filter | Keeps domain pure (no lib/security leak); autoescape-bypass is one unit-testable function, not template-coupled |
| B3 | Template bypass | Only `{{ section.html_body \| safe }}` bypasses autoescape; title/label/origin stay escaped | Mark whole context safe | Minimal blast radius for the `safe` marker |

## Data Flow

### Workstream A (#40)
```
list_campaigns() ─ select(+session_count) ─┐
                                           ├─ _normalize → {…, session_count, memory_count}
memory_facts(status=active,in ids) ─ count─┘        │
                                                    ▼
                    CampaignSummary(**row) → GET /campaigns → Zod → CampaignCard stat row
```
Empty campaign list ⇒ skip the memory query (no `.in_([])`).

### Workstream B (#63)
```
ExportSection.body (markdown) → markdown_to_safe_html() → nh3 allowlist → html_body
   → render-time view section → template {{ html_body | safe }} → WeasyPrint (scoped CSS)
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `campaigns/infrastructure/repository.py` | Modify | Add `session_count:sessions(count)` to select; add grouped active-`memory_facts` count; extend `_normalize_campaign_summary` (both keys, list-unwrap + zero default) |
| `campaigns/application/read_models/campaign.py` | Modify | Add `session_count: int = 0`, `memory_count: int = 0` |
| `lib/campaigns/schemas/reads.ts` | Modify | Add `session_count`, `memory_count` to `campaignSummarySchema` |
| `components/campaigns/campaign-card.tsx` | Modify | Replace two `'—'` with `campaign.session_count` / `campaign.memory_count`; preserve order Sessions, NPCs, Factions, Memories, Arcs; drop stale comment |
| `dashboard/__tests__/page.test.tsx` | Modify | Replace two-`—` assertion with real-count assertions |
| `sessions/infrastructure/markdown_html.py` | Create | `markdown_to_safe_html(body)` — convert + `nh3.clean` |
| `sessions/infrastructure/pdf_renderer.py` | Modify | Build render-time view sections carrying `html_body` |
| `templates/session_export.html.jinja` | Modify | Replace `<p>{{ paragraph }}</p>` loop with `<div class="section-body">{{ section.html_body \| safe }}</div>`; add scoped CSS |
| `services/api/pyproject.toml` | Modify | Add `markdown-it-py`, `nh3` |
| `tests/sessions/test_pdf_export.py` + `tests/sessions/test_markdown_html.py` | Modify/Create | Markdown-render + adversarial-injection cases |

## Interfaces / Contracts

- **nh3 allowlist** (security boundary): tags `h1–h6, p, ul, ol, li, strong, em,
  a, blockquote, code, pre`; attributes only `href` on `a`; URL schemes limited to
  `http, https, mailto`. Blocks `<script>`, event handlers (`on*`), and
  `javascript:` URLs by omission. This allowlist IS the injection boundary.
- **Heading-collision CSS**: `html_body` is wrapped in `.section-body`; template
  `<h1>/<h2>` chrome keeps global sizes, while `.section-body h1..h6` get smaller
  scoped sizes plus `ul/ol/li, blockquote, code, pre` styling to match polish.

## Testing Strategy

| Layer | What | Approach |
|-------|------|----------|
| Unit (B) | `markdown_to_safe_html`: headings/lists/bold/links render; `<script>`, `on*`, `javascript:` stripped | RED unit tests on the isolated function (primary security seam) |
| Unit (B) | Template renders `html_body` via `safe`; other fields still escaped | `render_html` assertions |
| Unit (A) | `_normalize_campaign_summary` unwraps `session_count`; active-only memory count excludes archived | Backend RED test on repository/normalize seam |
| Component (A) | Card shows real Sessions/Memories counts, order preserved, zero shown like existing three | `page.test.tsx` |

## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable-file
classification, or process-integration boundary. (HTML-injection risk is handled
by the nh3 allowlist above, not a process boundary.)

## Migration / Rollout

No migration. Two chained PRs, recommended order PR1 (#40) then PR2 (#63); each
reverts independently.

## Open Questions

- None blocking.
