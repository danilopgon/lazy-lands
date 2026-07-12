# Context Builder Specification

## Purpose

The context builder is a utility within the `GenerateNextSessionUseCase` that assembles the generation prompt input from campaign data using direct relational fetches (no RAG, no embeddings, no vector search — a hard non-goal per PRODUCT.md and the Block 8 proposal). It renders that context through the Jinja prompt template, estimates token count for trace logging, warns when the estimate exceeds the budget, and excludes data that should never reach the Scribe. It does not hard-compress or truncate the prompt to 2,000 tokens.

## Requirements

### Requirement: Context Assembly

The context builder MUST assemble generation context from five relational fetches under a single campaign: campaign record (with `accumulated_summary`), active NPCs, active factions, open arcs (status=`active`), and active MemoryFacts (status=`active`).

#### Scenario: Full context assembled

- GIVEN a campaign with NPCs, factions, open arcs, and active MemoryFacts
- WHEN `GenerationRepository.get_generation_context(campaign_id)` is called
- THEN it MUST return campaign fields (`id`, `title`, `description`, `world_state`, `accumulated_summary`, `summarized_up_to_session`), plus arrays for NPCs, factions, arcs, and memory_facts
- AND every entity MUST be fetched by direct SELECT (no JOIN-based aggregation beyond what Supabase client does per table)

#### Scenario: No active MemoryFacts

- GIVEN a campaign with zero active MemoryFacts
- WHEN context is assembled
- THEN `memory_facts` SHALL be an empty list (not null)
- AND the prompt SHALL still render without error

#### Scenario: No open arcs

- GIVEN all arcs are resolved or discarded
- WHEN context is assembled
- THEN `arcs` SHALL be an empty list
- AND the prompt SHALL still render (the Scribe may note no open threads)

### Requirement: Token Estimation

The context builder MUST estimate the rendered prompt's token count using a `len(text) // 4` heuristic before calling the LLM. The estimate SHALL be used for trace metadata only — no hard truncation occurs.

#### Scenario: Token estimate logged in trace

- GIVEN the prompt is rendered
- WHEN `estimated_context_size` is calculated
- THEN it SHALL use the heuristic `len(rendered_prompt_text) // 4`
- AND the result SHALL be stored in `trace_json.estimated_context_size`

#### Scenario: Oversized context warning

- GIVEN the estimated token count exceeds `MAX_GENERATION_TOKENS` (default 2,000)
- WHEN the use case logs the estimate
- THEN a warning SHALL be logged (e.g., `logger.warning`)
- AND the prompt SHALL still be sent to the LLM (the DM's full context is valuable)

### Requirement: Context Trimming Exclusion List

The following data MUST be excluded from the generation context (never passed to the prompt template):

#### Scenario: Dismissed memory suggestions excluded

- GIVEN a campaign has dismissed memory suggestions (status != `active`)
- WHEN context is assembled
- THEN ONLY memory_facts with `status="active"` SHALL be included
- AND suggestions that were never accepted SHALL NOT appear

#### Scenario: Private DM notes excluded

- GIVEN the campaign or sessions have private DM notes (frontend-only data)
- WHEN context is assembled
- THEN private notes SHALL NOT be fetched or passed to the prompt
- (This is enforced by the schema: no `private_notes` column exists on `sessions` — they are frontend state only)

#### Scenario: Resolved arcs excluded

- GIVEN arcs with `status!="active"` (resolved, discarded, dormant)
- WHEN context is assembled
- THEN only open arcs (`status="active"`) SHALL be fetched
- AND resolved/discarded arcs SHALL NOT appear

#### Scenario: Past session details beyond summary excluded

- GIVEN the campaign has past played sessions
- WHEN context is assembled
- THEN individual session bodies/consequences SHALL NOT be fetched
- AND the `accumulated_summary` field on the campaign row SHALL be the sole representation of past events
- (The summary is maintained by the summarize-campaign use case from Block 7 — this spec does not change that responsibility)

### Requirement: Data Contracts for Context Assembly

The context builder SHALL use the `GenerationRepository` port with a single `get_generation_context(campaign_id) -> dict` method returning:

```python
{
    "campaign": {
        "id": "uuid",
        "title": "str",
        "description": "str | None",
        "world_state": "str | None",
        "accumulated_summary": "str | None",
        "summarized_up_to_session": "int | None"
    },
    "npcs": [
        {"id": "uuid", "name": "str", "description": "str | None",
         "current_state": "str | None", "motivation": "str | None"}
    ],
    "factions": [
        {"id": "uuid", "name": "str", "description": "str | None",
         "current_stance": "str | None", "goals": "str | None"}
    ],
    "arcs": [
        {"id": "uuid", "title": "str", "description": "str | None",
         "priority": "str", "status": "str"}
    ],
    "memory_facts": [
        {"id": "uuid", "content": "str", "type": "str", "importance": "str"}
    ]
}
```

### Requirement: Excluded from Context — Protocol Check

The context builder MUST never include dismissed memory suggestions. This is a hard architectural rule per PRODUCT.md P3: "Only accepted memories feed future generation."

#### Scenario: Unaccepted suggestions never fetched

- GIVEN the campaign has memory_suggestions (unaccepted) created during session registration
- WHEN context is assembled for generation
- THEN these suggestions MUST NOT appear in the context
- AND the `memory_facts` query SHALL filter `status="active"` at the database level
