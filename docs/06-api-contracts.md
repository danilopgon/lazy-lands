# API Contracts

This document defines the expected FastAPI endpoints for the Lazy Lands MVP.

Base path:

```text
/
```

The FastAPI app mounts MVP routers directly at their resource paths (for example,
`/campaigns`). Do not add an `/api` prefix unless the application routing changes.

Authentication:

All protected endpoints require a valid Supabase JWT.

The frontend sends the token using:

```http
Authorization: Bearer <supabase_jwt>
```

## Auth dependency

### `get_current_user`

Responsibilities:

- Read Authorization header.
- Validate Supabase JWT.
- Extract user id.
- Reject missing or invalid tokens.
- Provide current user to use cases.

## Campaigns

### `GET /campaigns`

Returns the authenticated user's campaigns.

Response:

```json
[
  {
    "id": "uuid",
    "title": "string",
    "description": "string",
    "updated_at": "datetime"
  }
]
```

### `POST /campaigns/extract`

Analyzes free-text campaign input and returns structured extracted data.

Request:

```json
{
  "raw_text": "string"
}
```

Response:

```json
{
  "title": "string",
  "description": "string",
  "world_state": "string",
  "npcs": [
    {
      "name": "string",
      "description": "string",
      "current_state": "string",
      "motivation": "string",
      "content_source": "llm"
    }
  ],
  "factions": [
    {
      "name": "string",
      "description": "string",
      "current_stance": "string",
      "goals": "string",
      "content_source": "llm"
    }
  ],
  "arcs": [
    {
      "title": "string",
      "description": "string",
      "priority": "medium",
      "content_source": "llm"
    }
  ]
}
```

Notes:

- This endpoint does not persist data.
- It returns data for DM review.
- Every NPC, faction, and arc carries a `content_source` field: `llm` (Scribe-authored,
  untouched), `edited` (DM-modified), or `manual` (DM-added). The provenance badges on
  the frontend derive from this field.

### `POST /campaigns`

Persists a reviewed campaign.

Request:

```json
{
  "title": "string",
  "description": "string",
  "world_state": "string",
  "npcs": [
    {
      "name": "string",
      "description": "string",
      "current_state": "string",
      "motivation": "string",
      "content_source": "edited"
    }
  ],
  "factions": [
    {
      "name": "string",
      "description": "string",
      "current_stance": "string",
      "goals": "string",
      "content_source": "edited"
    }
  ],
  "arcs": [
    {
      "title": "string",
      "description": "string",
      "priority": "medium",
      "content_source": "manual"
    }
  ]
}
```

Response:

```json
{
  "id": "uuid"
}
```

### `GET /campaigns/{campaign_id}`

Returns campaign detail. Malformed non-UUID ids return the same uniform 404 as unknown
or non-owned campaigns before applying a Supabase uuid equality filter.

Response includes:

- Campaign fields including `system` and `tone`.
- NPCs.
- Factions.
- Arcs.
- Recent sessions and active MemoryFacts are Block 7 and are not part of the Block 6 response.

### `PATCH /campaigns/{campaign_id}`

Updates campaign fields.

Request:

```json
{
  "world_state": "string",
  "system": "string",
  "tone": "string"
}
```

The body is partial but must include at least one supported field. Supplied strings must be
non-empty after trimming.

## NPCs

### `POST /npcs`

Creates a manual NPC under a caller-owned campaign.

Request:

```json
{
  "campaign_id": "uuid",
  "name": "string",
  "description": "string",
  "current_state": "string",
  "motivation": "string"
}
```

Only `campaign_id` and `name` are required. Blank optional add-mode fields are treated as
omitted. The server assigns `content_source = "manual"`.

### `PATCH /npcs/{npc_id}`

Partially updates NPC fields. Edits do not restamp `content_source` in Block 6.

### `DELETE /npcs/{npc_id}`

Deletes an NPC owned through the caller's campaign; returns 204 on success and 404 on RLS miss.

## Factions

### `POST /factions`

Creates a manual faction under a caller-owned campaign.

Request:

```json
{
  "campaign_id": "uuid",
  "name": "string",
  "description": "string",
  "current_stance": "string",
  "goals": "string"
}
```

Only `campaign_id` and `name` are required. Blank optional add-mode fields are treated as
omitted. The server assigns `content_source = "manual"`.

### `PATCH /factions/{faction_id}`

Partially updates faction fields. Edits do not restamp `content_source` in Block 6.

### `DELETE /factions/{faction_id}`

Deletes a faction owned through the caller's campaign; returns 204 on success and 404 on RLS miss.

## Arcs

### `POST /arcs`

Creates a manual arc under a caller-owned campaign.

Request:

```json
{
  "campaign_id": "uuid",
  "title": "string",
  "description": "string",
  "priority": "medium",
  "status": "active"
}
```

Only `campaign_id` and `title` are required. Blank optional `description` is treated as
omitted; `priority`/`status` default according to the backend schema. The server assigns
`content_source = "manual"`.

### `PATCH /arcs/{arc_id}`

Updates an arc.

Request:

```json
{
  "title": "string",
  "description": "string",
  "status": "resolved",
  "priority": "high"
}
```

## Sessions

### `POST /campaigns/{campaign_id}/sessions`

Registers a played session.

Request:

```json
{
  "summary": "string",
  "consequences": "string"
}
```

Response:

```json
{
  "session_id": "uuid",
  "session_number": 3,
  "memory_suggestions": [
    {
      "content": "string",
      "type": "consequence",
      "importance": "high",
      "reason": "string"
    }
  ]
}
```

Responsibilities:

- Persist the session.
- Update accumulated campaign summary.
- Generate memory suggestions.
- Do not persist suggestions as active memory automatically.

### `GET /campaigns/{campaign_id}/sessions`

Returns sessions for a campaign.

## Memory

### `POST /campaigns/{campaign_id}/memory-facts`

Accepts a DM-reviewed memory suggestion, or edited suggestion content, as active memory. The
endpoint validates campaign ownership before write and does not auto-persist raw Scribe
suggestions.

Request:

```json
{
  "source_session_id": "uuid",
  "content": "string",
  "type": "consequence",
  "importance": "high"
}
```

Response:

```json
{
  "id": "uuid",
  "campaign_id": "uuid",
  "source_session_id": "uuid",
  "content": "string",
  "type": "consequence",
  "importance": "high",
  "status": "active",
  "created_at": "datetime",
  "updated_at": "datetime"
}
```

### `GET /campaigns/{campaign_id}/memory-facts`

Returns MemoryFacts for a campaign. Use `?status=active` for active memories on the Memory
Review and campaign detail screens. Malformed, unknown, or non-owned campaign ids return 404.

Response:

```json
[
  {
    "id": "uuid",
    "campaign_id": "uuid",
    "source_session_id": "uuid",
    "content": "string",
    "type": "consequence",
    "importance": "high",
    "status": "active",
    "created_at": "datetime",
    "updated_at": "datetime"
  }
]
```

### `PATCH /memory-facts/{memory_fact_id}`

Updates a MemoryFact's content or retires it by setting `status` to `archived`. Empty patch bodies
are rejected; non-owned or unknown ids return 404.

Request:

```json
{
  "content": "string",
  "status": "archived"
}
```

Response (content-only patches keep the fact active; retire patches return the archived fact):

```json
{
  "id": "uuid",
  "campaign_id": "uuid",
  "source_session_id": "uuid",
  "content": "string",
  "type": "consequence",
  "importance": "high",
  "status": "archived"
}
```

## Generation

Sections-only contract: the Scribe always emits exactly 7 canonical sections,
fixed order — `synopsis`, `goal`, `opening`, `beats`, `encounters`,
`factions`, `arcs`. There is no flat `main_objective`/`twist`/`encounters`/
`faction_reactions`/`arc_progression` shape any more; `twist` is folded into
`beats`/`opening` by the prompt instead of being a standalone field.

### `POST /campaigns/{campaign_id}/generate-session`

Generates a structured proposal for the next session.

Request:

```json
{
  "tone": "classic fantasy",
  "additional_instructions": "string"
}
```

Response:

```json
{
  "id": "uuid",
  "session_number": 8,
  "title": "string",
  "sections": [
    { "id": "synopsis", "label": "Synopsis", "body": "string", "origin": "scribe" },
    { "id": "goal", "label": "Session goal", "body": "string", "origin": "scribe" },
    { "id": "opening", "label": "Opening scene", "body": "string", "origin": "scribe" },
    { "id": "beats", "label": "Main beats", "body": "string", "origin": "scribe" },
    { "id": "encounters", "label": "Encounters", "body": "string", "origin": "scribe" },
    { "id": "factions", "label": "Faction reactions", "body": "string", "origin": "scribe" },
    { "id": "arcs", "label": "Arc progression", "body": "string", "origin": "scribe" }
  ],
  "continuity_links": [],
  "trace_id": "string"
}
```

Responsibilities:

- Validate campaign ownership.
- Build generation context.
- Include active MemoryFacts.
- Include open arcs.
- Validate AI output with Pydantic (`GeneratedSessionOutput`, `extra="forbid"`).
- Return structured output; persist all 7 sections in `sessions.generated_content`.

### `GET /sessions/{session_id}`

Returns the full session row, including the generated draft.

Response:

```json
{
  "id": "uuid",
  "campaign_id": "uuid",
  "session_number": 8,
  "summary": "string",
  "consequences": "string",
  "generated_content": {
    "title": "string",
    "sections": [
      { "id": "synopsis", "label": "Synopsis", "body": "string", "origin": "scribe" }
    ],
    "continuity_links": [{ "memory_fact_id": "uuid", "relevance": "string" }]
  },
  "trace_json": {},
  "created_at": "timestamp",
  "updated_at": "timestamp"
}
```

### `PATCH /sessions/{session_id}`

Persists DM edits to the generated content as-is (no server-side section diffing).

Request (any subset of these fields):

```json
{
  "generated_content": { "title": "string", "sections": [] },
  "summary": "string",
  "consequences": "string"
}
```

Response: same shape as `GET /sessions/{session_id}`.

### `POST /sessions/{session_id}/regenerate-section`

Rewrites exactly one section via a fresh LLM call. Pure — no steering/direction
input is accepted; the DM can only pick which section to regenerate.

Request:

```json
{ "section_id": "goal" }
```

`section_id` must be one of the 7 canonical ids; any other value is rejected
with `422` before any LLM call is made.

Response: the full `SessionDetailResponse` (same shape as `GET
/sessions/{session_id}`), with the targeted section's `body` replaced and its
`origin` reset to `"scribe"` — even if it had previously been `"edited"`. All
other 6 sections are returned untouched. On LLM validation failure, nothing is
persisted and the draft is unchanged; the response is a retryable `422` that
never leaks raw LLM output.

Responsibilities:

- Validate session ownership (per-user Supabase client, RLS) — unauthenticated
  is `401`; a forged/foreign/unknown session id is a uniform `404` (never
  `403`, matching the existing cross-tenant convention for `GET`/`PATCH
  /sessions/{id}`); an unknown `section_id` is `422`.
- Rebuild the same generation context categories used for full generation
  (campaign, NPCs, factions, arcs, accepted memories).
- Render a per-section Jinja prompt template and validate the LLM output with
  Pydantic (`RegeneratedSectionOutput`).
- Replace only the targeted section in `generated_content` and persist.

## Export

### `GET /sessions/{session_id}/export.pdf`

Optional for MVP.

Returns a PDF version of the generated session.

Response:

```http
Content-Type: application/pdf
```

If PDF export is not implemented, the frontend must provide copy and/or print-friendly fallback.
