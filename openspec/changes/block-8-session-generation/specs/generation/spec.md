# Session Generation Specification

## Purpose

The system MUST generate a structured next-session proposal (draft) using the Scribe (LLM) from the campaign's accumulated context. The DM provides optional direction parameters; the system assembles context, calls the LLM, validates the output against a Pydantic model, persists the draft as a session row, and returns it to the caller. The Prepare page (`/campaigns/[id]/prepare`) is the frontend entry point for this flow and MUST match the `PrepareSession` component in `handoff/app/views-prepare.jsx`.

## Requirements

### Requirement: POST /campaigns/{campaign_id}/generate-session

The system MUST expose `POST /campaigns/{campaign_id}/generate-session` protected by `get_current_user` auth dependency (Supabase JWT). It SHALL validate campaign ownership (RLS-miss → 404), assemble generation context, call the LLM, validate output, persist the draft session, and return the generated session.

#### Scenario: Happy path — generate session with default direction

- GIVEN an authenticated user owns a campaign with active NPCs, factions, open arcs, and accepted MemoryFacts
- WHEN they send `POST /campaigns/{campaign_id}/generate-session` with an empty body (all direction defaults)
- THEN the endpoint MUST return 200 with a session object containing `id`, `title`, `synopsis`, `main_objective`, `twist`, `encounters[]`, `faction_reactions[]`, `arc_progression[]`, `continuity_links[]`, `session_number`, `trace_id`
- AND the session MUST be persisted with `generated_content` (jsonb) and `trace_json` (jsonb) populated
- AND the generated `summary` field SHALL be auto-filled from the synopsis

#### Scenario: Campaign not found

- GIVEN a non-existent or non-owned campaign_id
- WHEN the endpoint is called
- THEN it MUST return 404 (uniform with other RLS-miss endpoints)

#### Scenario: LLM output fails Pydantic validation

- GIVEN the LLM returns structurally invalid JSON or fields that fail `GeneratedSessionOutput` validation
- WHEN the endpoint processes the response
- THEN it MUST raise `LlmOutputValidationError` (→ 422 retryable)
- AND NO session row SHALL be persisted
- AND the error SHALL be logged with `trace_json` including `error_code` and `duration_ms`

#### Scenario: Generation context exceeds token budget

- GIVEN the assembled context exceeds ~2,000 estimated tokens
- WHEN the use case estimates the token count
- THEN it SHALL log a warning in trace metadata via `estimated_context_size`
- AND the prompt SHALL still be sent (no hard truncation — the DM's full context is valuable)

#### Scenario: Session insert race condition

- GIVEN a race on `session_number` between concurrent inserts for the same campaign
- WHEN `insert_session_with_next_number` detects a unique-constraint conflict
- THEN it SHALL retry up to 5 attempts (reusing the existing hardening pattern)
- AND if all attempts fail, return 409 with a retryable error

### Requirement: Direction Parameters

The `POST /campaigns/{campaign_id}/generate-session` request body MUST accept all direction parameters as optional. Defaults are applied server-side when omitted.

#### Scenario: All direction fields are optional

- GIVEN a request body of `{}`
- WHEN the endpoint processes it
- THEN the use case SHALL apply defaults: tone=`"Keep current, low-magic intrigue"`, pace=`"Balanced"`, difficulty=`"Standard"`, goal=null, additional_instructions=null

#### Scenario: Partial direction overrides

- GIVEN a request body with only `goal` and `tone` set
- WHEN the endpoint processes it
- THEN the specified parameters SHALL override defaults, unspecified ones stay default

### Requirement: Request Schema

```json
{
  "goal": "string | null",
  "tone": "string",
  "pace": "string",
  "difficulty": "string",
  "additional_instructions": "string | null"
}
```

All string fields MUST be trimmed before processing. Empty trimmed strings SHALL be treated as null.

### Requirement: Response Schema

```json
{
  "id": "uuid",
  "session_number": "integer",
  "title": "string",
  "synopsis": "string",
  "main_objective": "string",
  "twist": "string",
  "encounters": [
    {"name": "string", "description": "string", "type": "string"}
  ],
  "faction_reactions": [
    {"faction_name": "string", "reaction": "string"}
  ],
  "arc_progression": [
    {"arc_title": "string", "progression": "string"}
  ],
  "continuity_links": [
    {"memory_fact_id": "uuid", "relevance": "string"}
  ],
  "trace_id": "uuid"
}
```

### Requirement: Trace Persistence

Every generation SHALL persist a `trace_json` object on the session row containing at minimum: `provider`, `model`, `prompt_version`, `estimated_context_size`, `duration_ms`, `error_code` (null on success).

#### Scenario: Trace metadata recorded

- GIVEN a successful generation
- WHEN the session row is persisted
- THEN `trace_json` MUST contain non-null values for `provider`, `model`, `prompt_version`, `estimated_context_size`, `duration_ms`, and `error_code` = null

#### Scenario: Trace metadata on failure

- GIVEN a failed LLM validation
- WHEN the error is caught
- THEN `error_code` in trace metadata SHALL be populated with the error identifier
- AND the session is NOT persisted (trace is logged, not stored)

### Requirement: Prompt Template

The generation prompt MUST reside at `services/api/app/modules/generation/prompts/generate_session_v1.jinja`. It SHALL accept: campaign description, world state, accumulated summary, NPCs, factions, open arcs, active MemoryFacts, and optional direction parameters (goal, tone, pace, difficulty, additional_instructions).

#### Scenario: Prompt rendered with context

- GIVEN the use case has assembled context
- WHEN `render_prompt("generate_session_v1.jinja", context)` is called
- THEN all context fields MUST be passed to the template
- AND direction parameters SHALL be rendered with their defaults when omitted

### Requirement: Handoff — PrepareSession (form state)

The Prepare page (`/campaigns/[id]/prepare`) MUST match the `PrepareSession` component from `handoff/app/views-prepare.jsx` in all states.

#### Scenario: Form state renders all fields

- GIVEN the DM navigates to `/campaigns/[id]/prepare`
- WHEN the page loads (not loading, not error)
- THEN it MUST render: breadcrumb (`Campaigns / {title} / Prepare next session`), kicker (`Before the next table`), h1 (`Prepare Session {number}`), subtitle explaining the Scribe drafts a proposal
- AND a "What the Scribe will read" context panel with rows for Campaign summary, Last session, World state, Active NPCs, Factions, Open arcs, Accepted memories — each with a mono `Included` flag
- AND a "Your direction" panel with fields: `goal` (textarea, optional), `tone` (select with 5 options), `pace` (select with 3 options), `difficulty` (select with 3 options), `extra` (textarea, optional)
- AND a privacy note: "Only **accepted** memories are read. Dismissed suggestions and private notes never reach the Scribe."
- AND an accent button: "Prepare session proposal →"

#### Scenario: Form state shared components

- GIVEN the form state is rendered
- THEN it MUST use shared components: `Shell` (with route and campaignId), `Kicker`, `Field` (with `optional` prop for goal and extra), `Link` for breadcrumbs
- AND use proper design tokens: mono breadcrumb, Source Serif h1, hard card borders + ink shadow on context panel

#### Scenario: Loading state

- GIVEN the DM clicks "Prepare session proposal →"
- WHEN the generation is in progress
- THEN the page MUST show a full loading takeover: `Loading` component with `title="Drafting Session {number}"` and a dynamic `sub` describing what the Scribe is weaving (arcs, memories, sessions)
- AND the loading SHALL use the animated quill (`.ll-quill` scribble keyframe) per DESIGN.md §7

#### Scenario: Error state with retry

- GIVEN the generation fails (LLM validation error, timeout, etc.)
- WHEN the response is an error
- THEN the page MUST show `ErrorNotice` with the message: "The Scribe's draft came back malformed and was discarded. No context was lost. Try generating again."
- AND a `retryLabel="Try again"` button that re-triggers generation
- AND the direction form SHALL preserve the DM's typed inputs (PRODUCT.md principle: never lose typed input)

### Requirement: Direction Form Default Values

The direction form defaults MUST match the handoff prototype:
- `tone` default: `"Keep current, low-magic intrigue"`
- `pace` default: `"Balanced"`
- `difficulty` default: `"Standard"`
- `goal` and `extra`: empty textarea
- `tone` options: `["Keep current, low-magic intrigue", "Darker", "Lighter", "More action", "More roleplay"]`
- `pace` options: `["Balanced", "Slow burn", "Breakneck"]`
- `difficulty` options: `["Standard", "Forgiving", "Deadly"]`

### Requirement: Generation Redirect

On successful generation, the frontend MUST redirect to `/campaigns/[id]/sessions/{session_id}` (the Generated Session view).

#### Scenario: Successful generation redirects

- GIVEN the generation endpoint returns 200 with a session_id
- WHEN the frontend receives the response
- THEN it MUST navigate to `/campaigns/{id}/sessions/{session_id}` (the `GeneratedSession` screen)
