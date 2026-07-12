# Spec: session-generation

**Change**: per-section-regeneration
**Capability**: `session-generation` (new)

---

## Overview

`POST /campaigns/{id}/sessions/{session_id}/generate` (existing endpoint) MUST emit and
persist exactly the 7 canonical handoff sections instead of the current 3
(`synopsis`, `main_objective`, `twist`). This fixes the PR #51 contract drift where
`encounters`, `faction_reactions`, and `arc_progression` are computed but dropped from
`generated_content` on reload. Per PRODUCT.md P1, every generated section remains an
editable proposal (`origin: "scribe"`) until the DM edits it.

---

## Functional requirements

### SG-001: Canonical 7-section contract

`GeneratedSessionOutput` MUST be rewritten to a sections-only shape. `content_for_persistence()`
MUST always emit exactly these 7 ids, in this order:

| id | label |
|----|-------|
| `synopsis` | Synopsis |
| `goal` | Session goal |
| `opening` | Opening scene |
| `beats` | Main beats |
| `encounters` | Encounters |
| `factions` | Faction reactions |
| `arcs` | Arc progression |

`main_objective` is renamed `goal`. There is no standalone `twist` field; narrative twists
MUST be folded by the prompt into `beats` and/or `opening`. The flat `Encounter`,
`FactionReaction`, and `ArcProgression` models MUST be retired — `encounters`, `factions`,
`arcs` are free-text section bodies like the others. Each section MUST validate
`origin: "scribe"` on first generation (`GeneratedDraftSection`/`GeneratedSection`, unchanged).

#### Scenario: Generation persists all 7 sections

- GIVEN an authenticated DM triggers generation for a campaign with valid context
- WHEN the LLM returns a valid 7-section payload
- THEN `sessions.generated_content.sections` contains exactly the 7 ids above, in order,
  each with `origin: "scribe"`

#### Scenario: Twist content has no standalone field

- GIVEN a generated payload
- WHEN it is validated against `GeneratedSessionOutput`
- THEN there is no `twist` key anywhere in the validated model or the persisted content

### SG-002: Prompt emits all 7 sections

`generate_session_v1.jinja` MUST instruct the LLM to emit all 7 sections listed in SG-001,
with explicit guidance to weave any narrative twist into `beats` or `opening` rather than
returning a separate field.

#### Scenario: Prompt output matches the 7-id schema

- GIVEN the rendered prompt is sent to the LLM
- WHEN the LLM follows the prompt's JSON schema
- THEN the raw JSON contains `title` and 7 section bodies keyed by the SG-001 ids, with no
  `main_objective` or `twist` key

### SG-003: LLM output validation (mandatory Pydantic gate)

Raw LLM JSON output MUST be parsed and validated against `GeneratedSessionOutput` via
`parse_llm_json` before any persistence. Per AGENTS.md's hard rule, raw LLM output MUST
NEVER be trusted or returned to the client unvalidated.

#### Scenario: Malformed generation output is rejected

- GIVEN the LLM returns JSON missing one of the 7 required sections
- WHEN `parse_llm_json` validates it against `GeneratedSessionOutput`
- THEN validation fails, nothing is persisted, and the endpoint returns a retryable
  error without leaking raw LLM output

### SG-004: Session-detail read model exposes all 7 sections

`GET /campaigns/{id}/sessions/{session_id}` (and the `SessionDetailResponse` used by the
`PATCH` endpoint) MUST return `generated_content.sections` with all 7 persisted sections,
including `encounters`, `factions`, and `arcs`, after a page reload.

#### Scenario: Reload preserves all 7 sections

- GIVEN a session with generated content containing all 7 sections
- WHEN the DM reloads `GET /campaigns/{id}/sessions/{session_id}`
- THEN the response includes all 7 sections with their current `origin` values (no drop)

---

## Non-functional requirements

### NFR-SG-1: No legacy read-compat shim

The rewrite MUST NOT add a compatibility path for the old 3/6-id shape. Only throwaway
dev/test fixtures reference the old ids; they MUST be updated, not shimmed.

### NFR-SG-2: Local dev / seed startup stays green

Supabase local seed and dev startup MUST continue to succeed after the contract rewrite.

---

## Acceptance criteria

1. `GeneratedSessionOutput`/`GeneratedContent` persist exactly 7 canonical sections in the
   SG-001 order; `Encounter`/`FactionReaction`/`ArcProgression` models are removed. (SG-001)
2. `generate_session_v1.jinja` emits all 7 sections; twist is folded into `beats`/`opening`. (SG-002)
3. Generation output is Pydantic-validated before persistence; invalid output persists
   nothing and never leaks raw LLM text. (SG-003)
4. `GET` session-detail and the `PATCH` response both expose all 7 sections after reload,
   fixing the PR #51 drop. (SG-004)
5. Local dev/Supabase seed startup remains unaffected. (NFR-SG-2)
