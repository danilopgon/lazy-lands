# ADR-09 — AI Output Validation with Pydantic

**Status:** Accepted  
**Date:** 2026  
**Area:** Backend / AI / Data Quality

## Context and problem

All LLM calls in Lazy Lands return JSON that must be structured, complete and semantically
valid before being stored or shown to the DM. Raw LLM output cannot be trusted: models may
include extra text, wrap JSON in markdown fences, omit required fields, or return hallucinated
structures.

## Decision

All LLM JSON outputs must be parsed and validated with a Pydantic model before being persisted
or returned to the frontend. No raw LLM output reaches the database.

### Validation schemas

| Operation | Schema |
|---|---|
| Campaign extraction | `ExtractCampaignOutput` |
| Session summarization | `CampaignSummaryOutput` |
| Memory suggestions | `MemorySuggestionsOutput` |
| Next-session generation | `GeneratedSessionOutput` |

### JSON guard

The backend tolerates common LLM formatting issues:

- JSON wrapped in Markdown code fences (`` ```json ... ``` ``).
- Extra text before or after JSON.
- Minor recoverable formatting issues.

The guard must never silently accept semantically invalid data.

### On validation failure

Invalid outputs must:

- Be rejected (not persisted, not returned to the frontend).
- Be logged with request metadata (`operation`, `provider`, `model`, `campaign_id`,
  `prompt_version`, `error_code`).
- Return a clear retryable error to the frontend.

## Consequences

**Positive:**

- The domain is never polluted by malformed AI output.
- Validation errors surface immediately and are logged with enough context to debug.
- Pydantic models serve as living documentation of what the AI is expected to return.
- Tests can verify validation independently of the LLM provider.

**Negative / trade-offs:**

- Strict validation may reject output that is "good enough" due to minor schema differences.
- Each new AI operation requires defining and maintaining a Pydantic schema.

## Invariant

This is a hard architectural rule. Bypassing Pydantic validation — even temporarily or for
debugging — is not allowed on any branch that targets main.
