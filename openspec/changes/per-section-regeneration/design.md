# Design: Per-section regeneration (contract alignment + regenerate-section)

## Technical Approach

Two coupled parts. **Part A** collapses the generation contract to sections-only (7 canonical
ids: `synopsis, goal, opening, beats, encounters, factions, arcs`), fixing the PR #51 drop by
persisting all 7 sections. **Part B** adds `POST /sessions/{id}/regenerate-section` that rewrites
one section via a fresh LLM call, resets its origin to `scribe`, and returns the full
`SessionDetailResponse`. Layer arrows stay inward: `api → application → domain`,
`infrastructure → domain` (ADR-05).

## Architecture Decisions

### Decision 1 — Regenerate use case lives in `sessions/`; AI behind a port `generation/` implements

**Choice**: `RegenerateSectionUseCase` in `sessions/application/commands/`. It declares a driven
port `SectionRegenerator` (`sessions/domain/ports.py`); `generation/` provides the concrete
adapter. DI wires the adapter in `sessions/api/dependencies.py` (composition root only).

| Option | Tradeoff | Verdict |
|---|---|---|
| Use case in `sessions/`, AI via port | Endpoint contract (`SessionDetailResponse`) + persistence (`get_session`→`update_session`) are sessions-owned; only "compute new body for section X" is delegated | **Chosen** |
| Use case in `generation/` | Would import sessions' application read model (ADR-05 violation) or duplicate it | Rejected |
| Shared regeneration service in `shared/` | ADR-05 rule 3 reserves `shared/` for 2+-module transversal concerns; only sessions consumes this | Rejected |

**Rationale**: The endpoint operates on a session and reuses the exact PATCH pattern. `session_id →
campaign_id` already exists — `SessionRepository.get_session(session_id)` returns the row with
`campaign_id`; **no new lookup infra** (retires a proposal risk). No dependency cycle: compile-time
edge is `generation → sessions` (adapter implements the port); `sessions` never imports `generation`
at module level — only the DI root assembles the adapter.

### Decision 2 — Port speaks plain dicts; Pydantic validation inside the generation adapter

`SectionRegenerator.regenerate_section(campaign_id, section_id, current_sections) -> dict`
returns `{id, label, body, origin:"scribe", trace_json}`. The adapter renders the per-section
prompt, calls `LlmProvider.complete_json`, and validates against its own
`RegeneratedSectionOutput(BaseModel)` before returning. This honours the mandatory
Pydantic-LLM-output rule and the repository "dict-at-boundary, never HTTP DTOs" precedent, so
`sessions` imports no generation contract. `current_sections` is passed so the rewrite stays
coherent with the preserved draft, not only campaign context.

### Decision 3 — Per-section templates with a shared include; globally-unique names

`render_prompt` loads bare filenames across all `modules/*/prompts/` (first match wins on
`{% include %}`). Names must be globally unique: `_regenerate_context.jinja` (shared macro) +
`regenerate_section_{id}_v1.jinja` (×7). `PROMPT_VERSION` per call = `regenerate_{section_id}_v1`.
Part A bumps the generate template to `generate_session_v2.jinja` (emits all 7, twist folded into
`beats`/`opening`, `main_objective → goal`).

## Data Flow (regenerate — AI sequence)

    Route POST /sessions/{id}/regenerate-section {section_id}
      │  RegenerateSectionRequest (SectionId enum, 7 ids)
      ▼
    RegenerateSectionUseCase (sessions/application)
      │ 1. get_session(id) ── RLS ── row{campaign_id, generated_content}  (404 if None)
      │    guard: section_id ∈ current sections
      ▼
    SectionRegenerator port ──► generation adapter
      │ 2. get_generation_context(campaign_id)
      │ 3. render regenerate_section_{id}_v1.jinja (+ current_sections)
      │ 4. LlmProvider.complete_json → RegeneratedSectionOutput  (Pydantic)
      │    invalid → LlmOutputValidationError (retryable) ─┐
      ▼                                                     │ draft untouched
    5. replace section.body, origin="scribe"               │ (no update_session)
    6. update_session(id, {generated_content, trace_json}) │→ 422 retryable
      ▼
    SessionDetailResponse (full session)

## File Changes

| File | Action | Description |
|---|---|---|
| `generation/application/contracts.py` | Modify | `GeneratedSessionOutput` → `{title, sections:[7 ids]}` + 7-id validator; retire `Encounter/FactionReaction/ArcProgression/main_objective/twist` + derive branch; add `RegeneratedSectionOutput` |
| `generation/prompts/generate_session_v2.jinja` | Create | Emits all 7 sections |
| `generation/prompts/_regenerate_context.jinja` + `regenerate_section_{id}_v1.jinja` ×7 | Create | Shared macro + per-section templates |
| `generation/application/regenerate_section_service.py` | Create | `SectionRegenerator` adapter (context→prompt→LLM→Pydantic→dict+trace) |
| `sessions/domain/ports.py` | Modify | Add `SectionRegenerator` Protocol |
| `sessions/application/commands/regenerate_section.py` | Create | Use case (read→delegate→replace→persist→return full session) |
| `sessions/api/routes.py` + `schemas/session/requests.py` + `api/dependencies.py` | Modify | `POST /sessions/{id}/regenerate-section`, `SectionId` enum, DI wiring |
| `apps/web/lib/sessions/{schemas,section-label,api}.ts` | Modify | 7-id allowlist; retire stale flat schema; `regenerateSection` client |
| `apps/web/components/sessions/generated-session-view.tsx` | Modify | Replace global disabled button with per-section Regenerate |
| `messages/{en,es}.json` | Modify | Rewriting/toast/error copy |

## Interfaces / Contracts

```python
class SectionId(str, Enum): synopsis=...; goal=...; opening=...; beats=...; encounters=...; factions=...; arcs=...
class RegenerateSectionRequest(BaseModel): section_id: SectionId
class RegeneratedSectionOutput(BaseModel):  # generation, Pydantic-validated LLM output
    id: str; label: str; body: str = Field(min_length=1); origin: Literal["scribe"]="scribe"
class SectionRegenerator(Protocol):
    def regenerate_section(self, campaign_id: str, section_id: str, current_sections: list[dict]) -> dict: ...
```
`generated_content` jsonb = `{title, sections:[7×{id,label,body,origin}], continuity_links}`.

## Frontend architecture

Container/presentational + atomic design preserved. Per-section Regenerate links (handoff
`views-prepare.jsx` is authoritative — `route-map.md` stale) with per-section spinner ("The Scribe
is rewriting") + toast. **State-sync trap**: local `sections` useState shadows the query; on success
call BOTH `setSections(updated.sections)` AND `queryClient.invalidateQueries(['session', sessionId])`
or stale local state clobbers the refetch. Origin badge flips to `scribe`. 422 → inline error, draft
unchanged.

## Testing Strategy

| Layer | What | How |
|---|---|---|
| Unit (be) | Use case: read→delegate→replace→persist; section-not-found; validation failure leaves draft intact | pytest, fake port + fake repo |
| Unit (be) | Adapter Pydantic-validates; 7-id contract round-trip (fixes PR #51) | pytest, fake LLM |
| Integration (be) | `POST regenerate-section` 200/404/422; RLS ownership via per-user client | pytest httpx |
| Unit (fe) | `regenerateSection` client; per-section loading; origin reset; query invalidation | Vitest + RTL |

## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or
process-integration boundary. The new endpoint is an authenticated RLS-scoped HTTP handler.

## Migration / Rollout

No DB migration (`generated_content` stays jsonb). No legacy read-compat shim — only throwaway dev
data; verify Supabase seed produces 7-id content so local dev/seed startup is unaffected.

## Rollback

Revert sections-only contract commits; remove regenerate route/use case/port/adapter/templates and
the frontend per-section control; re-seed throwaway dev drafts.

## Open Questions

- [ ] Confirm `_regenerate_context.jinja` include resolves under `render_prompt`'s first-match loader
  before relying on shared-macro reuse (validated in apply via a render test).
