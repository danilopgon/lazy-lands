# API Contracts

This document defines the expected FastAPI endpoints for the Lazy Lands MVP.

Base path:

```text
/api
```

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

Returns campaign detail.

Response includes:

- Campaign fields.
- NPCs.
- Factions.
- Open arcs.
- Recent sessions.
- Active MemoryFacts.

### `PATCH /campaigns/{campaign_id}`

Updates campaign fields.

Request:

```json
{
  "world_state": "string"
}
```

## Arcs

### `POST /campaigns/{campaign_id}/arcs`

Creates an open arc.

Request:

```json
{
  "title": "string",
  "description": "string",
  "priority": "medium",
  "content_source": "manual"
}
```

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

Accepts a memory suggestion as active memory.

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
  "status": "active"
}
```

### `PATCH /memory-facts/{memory_fact_id}`

Updates or archives a MemoryFact.

Request:

```json
{
  "content": "string",
  "status": "archived"
}
```

## Generation

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
  "title": "string",
  "synopsis": "string",
  "main_objective": "string",
  "twist": "string",
  "encounters": [],
  "faction_reactions": [],
  "arc_progression": [],
  "continuity_links": [],
  "trace_id": "string"
}
```

Responsibilities:

- Validate campaign ownership.
- Build generation context.
- Include active MemoryFacts.
- Include open arcs.
- Validate AI output with Pydantic.
- Return structured output.

## Export

### `GET /sessions/{session_id}/export.pdf`

Optional for MVP.

Returns a PDF version of the generated session.

Response:

```http
Content-Type: application/pdf
```

If PDF export is not implemented, the frontend must provide copy and/or print-friendly fallback.
