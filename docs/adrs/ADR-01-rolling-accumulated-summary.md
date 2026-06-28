# ADR-01 — Context Compression: Rolling Accumulated Summary

**Status:** Accepted  
**Date:** 2026  
**Area:** Backend / LLM Integration

## Context and problem

The session generation prompt needs context from the full campaign history to maintain narrative
coherence. Without control, the history grows session by session — a 10-session campaign with
summaries and consequences can easily exceed 8,000–12,000 tokens. This causes two problems:

- With smaller models (quantized Mistral 7B on Ollama) the context window saturates and
  coherence degrades.
- With external API models (GPT-4o-mini, Claude Haiku) the per-call cost grows with every
  new session.

## Alternatives evaluated

| Option | Pros | Cons |
|---|---|---|
| Full history | Complete context, maximum fidelity | Grows unbounded, high cost, coherence degrades with small models |
| Last N sessions | Simple to implement | Loses facts from more than N sessions ago — breaks continuity |
| **Rolling accumulated summary** ✅ | Always controlled context, minimal cost, narrative fidelity preserved | Requires an extra summarize step after each session |
| Embeddings by relevance | Precise semantic selection | High complexity, dependency on additional infrastructure (vector DB) |

## Decision

Rolling accumulated summary for the MVP.

A field `accumulated_summary` is added to `Campaign`. It is regenerated as part of
`POST /campaigns/{campaign_id}/sessions` (the session save endpoint). The LLM takes the
previous accumulated summary plus the new session N and produces an updated summary of
approximately 300–400 tokens. After this step `summarized_up_to_session = N`.

The generation prompt for session N+1 receives:

- `accumulated_summary` — all campaign history up to and including session N, compressed
  (~300–400 tokens, bounded regardless of session count)
- NPCs, factions and open arcs — current world state
- Active `MemoryFacts` — DM-approved narrative anchors

Total context stays below ~2,000 tokens regardless of the number of sessions.

**Note on the "last full session verbatim" pattern:** providing session N both inside the
compressed summary and again verbatim would double-count it and inflate the context. Because
the summary is regenerated immediately after each session save (including the new session), the
generation context does not need a separate verbatim copy of the last session. If higher
fidelity for the most recent session is needed post-MVP, the summary step can be made lazy
(lag by one session), providing session N verbatim and only summarizing sessions 1..N-1.
That is a future trade-off, not the MVP design.

## Consequences

**Positive:**

- Predictable and low per-call cost from session 1 to session 50.
- Compatible with small local models (Ollama + Mistral 7B).
- The `summarized_up_to_session` field allows detecting a stale summary and re-triggering if a
  previous call failed.

**Negative / trade-offs:**

- A very specific event from an old session may be lost during compression if it was not marked
  as relevant.
- The summarize step adds latency to the session save flow (mitigable: async background call).

**Post-MVP:** Replaceable by an embeddings strategy (future ADR) without changing the prompt
builder interface — the `accumulated_summary` contract remains stable.
