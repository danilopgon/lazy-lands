# ADR-08 — MVP Memory Layer: DM-Approved Suggestions to MemoryFacts

**Status:** Accepted  
**Date:** 2026  
**Area:** Backend / Product / AI

## Context and problem

Lazy Lands needs to transmit real narrative continuity without introducing a heavy RAG,
embeddings or graph architecture during the MVP.

The rolling accumulated summary keeps context under control, but may lose important concrete
details: public humiliations, revealed secrets, personal relationships, social consequences, or
facts that should resurface several sessions later.

## Alternatives evaluated

| Option | Pros | Cons |
|---|---|---|
| Only rolling summary | Very simple, cheap, sufficient for basic MVP | May lose concrete narrative details |
| RAG + embeddings | Flexible semantic retrieval | Too much complexity for the timeline |
| Full relationship graph | Very powerful narratively | High modeling, UI and persistence cost |
| **Memory Suggestions + DM acceptance** ✅ | Low cost, visible, human control, reinforces continuity | Requires one extra screen and a simple model |

## Decision

Add a minimal memory layer based on:

- `MemorySuggestion`: temporary output proposed by the AI after registering a session. Not
  persisted in the database. Returned by the API as a transient list for DM review.
- `MemoryFact`: memory accepted by the DM and persisted as active campaign memory.

The AI may suggest facts, consequences, relationships or secrets, but does not convert them to
canon automatically.

### Key invariant

**A `MemorySuggestion` must never be written to the `memory_facts` table without explicit DM
acceptance.** The API endpoint for accepting a suggestion (`POST /campaigns/{id}/memory-facts`)
only fires when the DM takes an explicit action (accept or accept-with-edit). Rejection is a
no-op that returns 204.

### Flow

```
POST /campaigns/{campaign_id}/sessions
     │  1. Persists session with sequential number
     │  2. SummarizeCampaignUseCase → updates accumulated_summary (includes session N)
     │  3. SuggestMemoriesUseCase → returns 0–5 MemorySuggestion objects (NOT persisted)
     ↓
Response: { session_id, session_number, memory_suggestions: [...] }
     ↓
DM reviews suggestions in UI
     ↓
Accept → POST /campaigns/{campaign_id}/memory-facts  (creates MemoryFact status=active)
Reject → no request sent (suggestion is discarded)
Edit + Accept → POST /campaigns/{campaign_id}/memory-facts with edited content
```

### Generation uses only active MemoryFacts

`GenerateNextSessionUseCase` includes `memory_facts WHERE status = 'active'` in the prompt
context. Unaccepted suggestions are never included in the generation context.

## Consequences

**Positive:**

- Reinforces the differentiating value: the world remembers.
- Keeps the DM as the final authority.
- Does not require embeddings or vector DB.
- Easy to explain in demo and defense.
- Evolves naturally toward WorldFacts, Relationships and RAG post-MVP.

**Negative / trade-offs:**

- Adds one small extra step after session registration.
- Requires one additional table and minimal endpoints.
- If the DM ignores suggestions, active memory loses value.

## Out of MVP scope

- Embeddings.
- Vector DB.
- Obsidian sync.
- Complex typed relationships.
- Visual timeline.
- Advanced memory compiler.

## Related tests required

- `MemorySuggestion` is not auto-saved as `MemoryFact`.
- Accept suggestion → creates active `MemoryFact`.
- Reject suggestion → no `MemoryFact` created.
- Edit suggestion before accept → saves edited version as `MemoryFact`.
- Generation includes active `MemoryFacts` and excludes unaccepted suggestions.
