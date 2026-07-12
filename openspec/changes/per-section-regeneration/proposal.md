# Proposal: Per-section regeneration (contract alignment + regenerate-section)

## Intent

Affects the **Generate** step (Login → Campaign → Session → Memory → **Generate**) and is a prerequisite for Block 9 PDF export. Two coupled problems, per `docs/10-roadmap.md`:

- **Contract drift:** generation persists only 3 sections (`synopsis`, `main_objective`, `twist`); `encounters`/`faction_reactions`/`arc_progression` are dropped after reload (PR #51 gap). The handoff, editable UI, and Block 9 PDF (`handoff/app/views-export.jsx`) all consume the 7 canonical text sections only.
- **Missing capability:** the DM cannot regenerate an individual section — the handoff "Regenerate" control is wired to a disabled "Coming later" button.

## Scope

### In Scope
- **Part A — Contract alignment (prerequisite):** adopt a sections-only contract. `GeneratedSessionOutput` becomes `{title, sections: 7 required canonical ids}` = `synopsis, goal, opening, beats, encounters, factions, arcs` (ids/labels from `handoff/app/data.js`). `main_objective`→`goal`; any narrative twist is folded into `beats`/`opening` (no standalone `twist`). Flat `Encounter`/`FactionReaction`/`ArcProgression` objects retired. 7-id + `origin`/`ContentSource` provenance flows through prompt → Pydantic contract → `generated_content` persistence → session-detail read model → frontend `section-label.ts`/`schemas.ts` allowlist → editable draft UI.
- **Part B — Regeneration:** `POST /sessions/{id}/regenerate-section` returning the full `SessionDetailResponse` (matches PATCH pattern), per-user Supabase client (RLS/DI, no service-role). Per-section Jinja templates sharing a common-context macro/include. New `session_id → campaign_id` lookup for `get_generation_context`. Regeneration REPLACES the section body and RESETS `origin` to `"scribe"`. Wire the button in `generated-session-view.tsx` with per-section loading ("The Scribe is rewriting") + success toast.
- **Docs:** update `docs/10-roadmap.md` (mark Block 8 SHIPPED — PRs #49/#51 merged; cross off Generation/Editing; Per-section items become this change). Flag for spec/design: `docs/06-api-contracts.md` (add generation + session-detail + new endpoint — none documented today), `docs/05-ai-system.md`, `docs/03-domain-model.md`, `docs/11-backlog.md`.

### Out of Scope
- Legacy 3-id read-compat shim (only throwaway dev test data exists; contract rewritten cleanly — only constraint: do not break local dev / Supabase seed startup).
- RAG/embeddings, billing, multi-user, Block 9 PDF export.

## Capabilities

> Note: `openspec/specs/` currently holds only `repository-bootstrap`, `campaign-view`,
> `entity-management`. Block 8 capabilities were never materialized to `spec.md` files, so the
> generation/editing/read/UI behavior below has NO existing spec to delta — sdd-spec creates these
> as new spec files.

### New Capabilities
- `session-generation`: sections-only 7-id output contract; prompt emits all 7; twist folded into `beats`/`opening`; Pydantic validation.
- `session-regeneration`: `regenerate-section` endpoint, per-section prompt templates, session→campaign lookup, origin-reset semantics, wired UI control.
- `generated-session-ui`: 7-id allowlist/labels; persist+reload all 7 sections (fix PR #51 drop); origin provenance; regenerate control replaces "Coming later".

### Modified Capabilities
- None (no existing `spec.md` covers generated-session behavior; see note above).

## Approach

Sections-only contract (exploration Approach 1, PDF-export-confirmed: no consumer needs structured objects). Regenerate endpoint hosted in `sessions/` module, reusing the PATCH "return full session" pattern; regeneration output MUST be Pydantic-validated (per-section model) before persist — raw LLM output never trusted. Per-template-per-section (one-purpose-per-template convention) with a shared Jinja context include. Authoritative visual source is `handoff/app/views-prepare.jsx` `GeneratedSession` — NOT `views-sessions.jsx` (`route-map.md` entry is stale; call this out in design/apply).

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `generation/application/contracts.py` | Modified | `GeneratedSessionOutput`/`content_for_persistence()` → 7-id sections-only |
| `generation/prompts/generate_session_v1.jinja` | Modified | Emit all 7 sections; fold twist into beats/opening |
| `generation/prompts/regenerate_<section>.jinja` (x7) | New | Per-section templates + shared context include |
| `generation/infrastructure/repository.py` | Modified | `session_id → campaign_id` lookup for context |
| `sessions/application/.../regenerate_section.py` | New | Use case + Pydantic-validated regen output |
| `sessions/api/routes.py` | Modified | `POST /sessions/{id}/regenerate-section` |
| `sessions/application/read_models/session_detail.py` | Modified | Validated 7-section read model |
| `apps/web/lib/sessions/{schemas,section-label,api}.ts` | Modified | 7-id allowlist, regen client call |
| `apps/web/components/sessions/generated-session-view.tsx` | Modified | Wire button, per-section loading, origin reset |
| `apps/web/messages/{en,es}.json` | Modified | Regenerate copy |
| `docs/{10-roadmap,06-api-contracts,05-ai-system,03-domain-model,11-backlog}.md` | Modified | Contract + roadmap reconciliation |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Sections-only rewrite breaks local dev / Supabase seed startup | Medium | Verify seed produces 7-id content; no legacy shim but keep dev/seed green |
| Regen LLM output fails validation | Medium | Pydantic-validate per-section model; retryable 422; section unchanged on failure |
| `route-map.md` stale entry misleads design/apply | Medium | Explicit callout: use `views-prepare.jsx` `GeneratedSession` |
| Unwired regenerate control → non-trivial UI diff | Medium | Scope as its own PR slice from contract-alignment slice |

## Rollback Plan

Revert the sections-only contract commits (restore prior `GeneratedSessionOutput`/prompt/frontend allowlist) and remove the `regenerate-section` route/use case/templates and the UI wiring. No schema migration involved (`generated_content` stays jsonb). Throwaway dev drafts can be re-seeded.

## Dependencies

- Existing `LlmProvider` + `complete_json` + `parse_llm_json` + `render_prompt`; no new LLM infra.
- Handoff: `handoff/app/views-prepare.jsx` `GeneratedSession`, `handoff/app/data.js` (7 canonical ids), `handoff/app/ui.jsx` (`OriginBadge`, `Loading`, toast).
- `frontend-handoff-contract` skill governs the UI slice.

## Success Criteria

- [ ] `generated_content` persists and reloads all 7 canonical sections (PR #51 drop fixed).
- [ ] Prompt emits 7 sections; twist folded into `beats`/`opening`; `main_objective` mapped to `goal`.
- [ ] `POST /sessions/{id}/regenerate-section` validates ownership via per-user Supabase client, Pydantic-validates output, replaces body, resets `origin` to `"scribe"`, returns full `SessionDetailResponse`.
- [ ] Frontend regenerate button wired with per-section loading + toast; 7-id allowlist matches handoff.
- [ ] Local dev / Supabase seed startup unaffected.
- [ ] Docs updated (roadmap Block 8 SHIPPED; api-contracts adds generation/session-detail/regenerate).
- [ ] Suite green; new tests cover regen use case (`FakeLlmProvider`), validation failure, ownership guard, 7-section round-trip.
