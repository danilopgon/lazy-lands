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

A field `accumulated_summary` is added to `Campaign`. It is regenerated automatically when a
session is saved via `POST /campaigns/{id}/summarize`. The LLM takes the previous summary plus
the new session and produces an updated summary of approximately 300–400 tokens.

The generation prompt receives:

- `accumulated_summary` — full campaign history up to session N-1, compressed
- Last full session — maximum fidelity for the most recent events
- NPCs, factions and open arcs — current world state

Total context stays below ~2,000 tokens regardless of the number of sessions.

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
