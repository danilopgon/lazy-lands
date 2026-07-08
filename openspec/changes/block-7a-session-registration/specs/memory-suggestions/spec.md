# Memory Suggestions Specification

## Purpose

Propose candidate memories from a just-registered session for later DM review (ADR-08).
Suggestions are transient — never persisted as a table row by this capability — and are
returned to the caller of `POST /campaigns/{campaign_id}/sessions` for the block-7b Memory
Review flow to consume. No 7a UI renders these suggestions.

## Requirements

### Requirement: Suggest memories from the new session

The system MUST run a `SuggestMemoriesUseCase` after the session insert (and after or
independent of summarization; ordering between summarize and suggest is an
implementation detail, not user-observable) using a DIRECT relational fetch by
`campaign_id` as input: `accumulated_summary`, `world_state`, NPCs, factions, open arcs,
the new session, and active memory facts. The system MUST NOT use RAG, embeddings, or any
vector/semantic search to build this input (explicit non-goal).

The use case's LLM output MUST be validated against a `MemorySuggestionsOutput` Pydantic
model containing 0–5 `MemorySuggestion` items (`content`, `type`, `importance`, `reason`,
`related` — max 20 entries) before being returned. Suggestions MUST NOT be written to any
persistent table by this capability.

`POST /campaigns/{campaign_id}/sessions` MUST include the resulting `memory_suggestions`
array (0–5 items) in its response.

#### Scenario: Session yields suggestions

- GIVEN a session is registered with a summary describing a new NPC encounter
- WHEN suggestion runs successfully
- THEN the response's `memory_suggestions` contains between 0 and 5 items, each Pydantic-valid

#### Scenario: No RAG/embeddings used

- GIVEN campaign `c1` has existing NPCs, factions, arcs, and memory facts
- WHEN the suggestion input is built
- THEN it is assembled via direct relational queries scoped to `campaign_id`, with no
  embedding generation or vector similarity search performed

#### Scenario: Suggestions are never persisted

- GIVEN suggestion runs successfully and returns 3 items
- WHEN the response is returned to the client
- THEN no `memory_facts` (or equivalent) row is created as a side effect of this endpoint

### Requirement: LLM output validation and failure handling

Every suggestion LLM call MUST have its output parsed and validated with
`MemorySuggestionsOutput` before being returned; raw, unvalidated LLM output MUST NEVER be
returned to the client. Invalid or malformed LLM JSON MUST be mapped to a retryable error
path without leaking the raw output.

If the suggestion step fails (LLM error or output that fails validation) AFTER the session
row was already persisted, the session registration response MUST still succeed for the
persisted session, with `memory_suggestions` degrading to an empty array. The session MUST
NOT be rolled back or deleted due to a suggestion failure.

#### Scenario: Invalid LLM output degrades to empty suggestions

- GIVEN a valid session is persisted
- WHEN the suggestion LLM call returns output that fails `MemorySuggestionsOutput`
  validation
- THEN the registration response returns `memory_suggestions: []`, the session remains
  persisted, and no raw LLM output is stored or returned

#### Scenario: LLM call fails outright

- GIVEN a valid session is persisted
- WHEN the suggestion LLM call raises a provider/network error
- THEN the registration response returns `memory_suggestions: []` and the session remains
  persisted
