# Spec: session-regeneration

**Change**: per-section-regeneration
**Capability**: `session-regeneration` (new)

---

## Overview

`POST /sessions/{id}/regenerate-section` lets the DM ask the Scribe to rewrite a single
one of the 7 canonical sections (see `session-generation` spec), replacing its body and
resetting its `origin` to `"scribe"`. Per PRODUCT.md P1, this is a proposal the Scribe
makes — it never overwrites content the DM already edited without the DM's explicit
regenerate action, and a failed regeneration MUST NOT alter existing content.

---

## Functional requirements

### SR-001: Endpoint contract — full session response

`POST /sessions/{id}/regenerate-section` MUST accept `{ "section_id": str }` (one of the
7 canonical ids) and, on success, return the full `SessionDetailResponse` — the same
shape as `PATCH /sessions/{id}` — so the frontend can replace its entire session-detail
state from one response.

#### Scenario: Valid regeneration returns the full session

- GIVEN an authenticated DM owns a session with generated content
- WHEN `POST /sessions/{id}/regenerate-section` is called with a valid `section_id`
- THEN the response is HTTP 200 with a body matching `SessionDetailResponse`, where the
  targeted section's `body` differs and `origin` is `"scribe"`

#### Scenario: Unknown section id is rejected

- GIVEN an authenticated DM
- WHEN `section_id` is not one of the 7 canonical ids
- THEN the response is HTTP 422 and no LLM call occurs

### SR-002: Ownership and RLS

The endpoint MUST resolve `session_id → campaign_id` and verify the requesting DM owns
that campaign through the per-user Supabase client (DI-scoped, RLS-enforced). No
service-role bypass MUST be used.

#### Scenario: Unauthenticated request is rejected

- GIVEN no valid Supabase JWT
- WHEN `POST /sessions/{id}/regenerate-section` is called
- THEN the response is HTTP 401 and no LLM call occurs

#### Scenario: Session owned by another DM is rejected

- GIVEN an authenticated DM who does not own the target session's campaign
- WHEN `POST /sessions/{id}/regenerate-section` is called
- THEN the response is HTTP 403/404 (ownership boundary) and no LLM call occurs

### SR-003: Per-section prompt templates

Each of the 7 sections MUST have its own regeneration prompt template
(`regenerate_<section_id>_v1.jinja`), sharing a common Jinja include/macro for campaign,
NPC, faction, arc, and accepted-memory context — the same context resolved for full
generation via the new `session_id → campaign_id` lookup.

#### Scenario: Regeneration context matches full-generation context

- GIVEN a session belonging to a campaign with NPCs, factions, arcs, and accepted memories
- WHEN a section is regenerated
- THEN the rendered prompt includes the same context categories the full-generation
  prompt would use for that campaign

### SR-004: Pydantic-validated regeneration output

The LLM's regeneration output MUST be validated against a Pydantic model
(`RegenerateSectionOutput` or equivalent single-section body model) via `parse_llm_json`
before it replaces the section. Raw LLM output MUST NEVER be trusted.

#### Scenario: Invalid regeneration output leaves the section unchanged

- GIVEN a session with an existing section body and `origin: "edited"`
- WHEN the LLM returns output that fails Pydantic validation
- THEN the response is a retryable error, the section's body and `origin` remain exactly
  as they were before the call, and nothing is persisted

### SR-005: Origin reset semantics

On a successful regeneration, the targeted section's `origin` MUST be reset to
`"scribe"`, regardless of its prior value (including `"edited"`). No other section's
body or `origin` MUST change.

#### Scenario: Regenerating an edited section resets its origin

- GIVEN a section with `origin: "edited"` (the DM previously hand-edited it)
- WHEN that section is successfully regenerated
- THEN its `origin` becomes `"scribe"` and its `body` is the new LLM output

#### Scenario: Regenerating one section leaves others untouched

- GIVEN a session with 7 sections in varying `origin` states
- WHEN one section is successfully regenerated
- THEN the other 6 sections' `body` and `origin` are unchanged in the response

---

## Non-functional requirements

### NFR-SR-1: Reuse of the existing LLM seam

Regeneration MUST call `complete_json` + `parse_llm_json` + `render_prompt` — no parallel
JSON-parsing or validation path.

### NFR-SR-2: Test isolation via `FakeLlmProvider`

Use-case tests MUST register fixtures via `FakeLlmProvider` and MUST NOT require network
access or a live LLM provider.

---

## Acceptance criteria

1. `POST /sessions/{id}/regenerate-section` accepts a `section_id` and returns the full
   `SessionDetailResponse` on success; unknown ids return HTTP 422. (SR-001)
2. Ownership is enforced via the per-user Supabase client with no service-role bypass;
   unauthenticated/unauthorized requests are rejected before any LLM call. (SR-002)
3. Each of the 7 sections has its own prompt template sharing a common context
   include; `session_id → campaign_id` resolution feeds that context. (SR-003)
4. Regeneration output is Pydantic-validated; invalid output leaves the section
   unchanged and persists nothing. (SR-004)
5. Successful regeneration replaces only the targeted section's body and resets its
   `origin` to `"scribe"`; all other sections are unaffected. (SR-005)
