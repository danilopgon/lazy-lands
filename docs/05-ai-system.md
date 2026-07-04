# AI System

## Purpose

The AI system helps the DM transform unstructured campaign notes into structured campaign data and generate coherent session proposals.

AI does not make final creative decisions.

The DM validates what becomes canon.

## AI responsibilities

The AI can:

- Extract NPCs, factions and initial world state from free text.
- Summarize campaign history into a rolling accumulated summary.
- Suggest important memories after a played session.
- Generate a structured proposal for the next session.

The AI cannot:

- Persist memory as canon without DM approval.
- Override manual edits.
- Access campaigns from other users.
- Store invalid or unvalidated outputs.

## LLM Provider abstraction

The backend uses a provider abstraction so the application is not coupled to a specific LLM.

Expected interface:

```python
from typing import Protocol, TypeVar
from pydantic import BaseModel

T = TypeVar("T", bound=BaseModel)

class LlmProvider(Protocol):
    async def complete_text(self, prompt: str) -> str:
        ...

    async def complete_json(self, prompt: str, schema: type[T]) -> T:
        ...
```

## Prompt templates

Prompt templates are versioned Jinja files. This document is the **prompt catalog**: it
describes each prompt's purpose, inputs, output and validation schema (the contract). The
executable template bodies live **per module**, next to the code that owns them, per ADR-05
(modular monolith / nested layers). Do not centralize prompt bodies in a shared directory —
each prompt belongs to its owning module.

Location convention: `services/api/app/modules/<module>/prompts/<name>_v<N>.jinja`

```text
services/api/app/modules/
  campaigns/prompts/extract_campaign_v1.jinja
  sessions/prompts/summarize_campaign_v1.jinja
  sessions/prompts/suggest_memory_facts_v1.jinja
  sessions/prompts/generate_session_v1.jinja
```

Bump the `_vN` suffix for any prompt change that affects output shape or behavior, and record
the active version in trace metadata (`prompt_version`). Block 5 introduces the first template
(`campaigns/prompts/extract_campaign_v1.jinja`) and a minimal shared Jinja render helper in
`services/api/app/shared/` that later modules reuse.

## Prompt: extract campaign

Purpose:

Convert free-text campaign notes into structured data.

Input:

- Raw campaign text from the DM.

Output:

- Campaign title.
- Campaign description.
- Initial world state.
- NPCs.
- Factions.
- Optional open arcs.

Validation schema:

- `ExtractCampaignOutput`

Rules:

- Do not invent unrelated entities.
- Preserve uncertainty when the source text is ambiguous.
- Return valid JSON only.
- Keep outputs editable by the DM.

## Prompt: summarize campaign

Purpose:

Update the rolling accumulated summary after a new session is registered.

Input:

- Previous accumulated summary.
- New session summary.
- New consequences.

Output:

- Updated accumulated summary.
- Summarized up to session number.

Validation schema:

- `CampaignSummaryOutput`

Rules:

- Preserve relevant long-term consequences.
- Remove irrelevant detail.
- Keep summary concise.
- Do not create new facts unsupported by the session.

## Prompt: suggest memory facts

Purpose:

Detect important facts after a played session.

Input:

- Session summary.
- Consequences.
- Existing campaign state.
- Existing memory facts.

Output:

- 0 to 5 memory suggestions.

Validation schema:

- `MemorySuggestionsOutput`

Rules:

- Suggestions are not canon.
- Prioritize consequences, secrets, relationships, promises and unresolved tensions.
- Avoid duplicates.
- Include a reason explaining why the memory matters.

## Prompt: generate next session

Purpose:

Generate a structured proposal for the next session.

Input:

- Campaign description.
- Current world state.
- Accumulated summary.
- Latest session.
- NPCs.
- Factions.
- Open arcs.
- Active MemoryFacts.

Output:

- Title.
- Synopsis.
- Main objective.
- Twist or complication.
- Encounters.
- Faction reactions.
- Arc progression.
- Continuity links.

Validation schema:

- `GeneratedSessionOutput`

Rules:

- Use existing context.
- Make continuity visible.
- Include faction reactions when relevant.
- Progress at least one open arc when possible.
- Do not contradict accepted MemoryFacts.
- Return valid JSON only.

## JSON validation

All AI JSON outputs must be validated with Pydantic before being shown or persisted.

Invalid outputs must:

- Be rejected.
- Be logged with request metadata.
- Not be persisted.
- Return a clear retryable error to the frontend.

## JSON guard

The backend should tolerate common LLM formatting issues:

- JSON wrapped in Markdown code fences.
- Extra text before or after JSON.
- Minor formatting issues if safely recoverable.

The guard must never silently accept semantically invalid data.

## Provider registry

The active provider is resolved from the `LLM_PROVIDER` environment variable via
`build_provider()`. Supported providers: Gemini (free tier), Groq (free tier). Each
requires its own API key (`GEMINI_API_KEY`, `GROQ_API_KEY`). The default is `fake`
(deterministic, no network).

## Dev-inference lane

An opt-in `@pytest.mark.dev_inference` marker allows prompt and JSON-contract validation
against real providers during development. These tests are excluded from CI by default
(`-m "not dev_inference"`) and auto-skip when the required API key is absent.

## Trace metadata

Each AI operation should create trace metadata.

Suggested fields:

- `operation`
- `prompt_version`
- `provider`
- `model`
- `request_id`
- `campaign_id`
- `user_id`
- `schema_version`
- `estimated_context_size`
- `duration_ms`
- `error_code`

Do not log full campaign prompts or private campaign content in production.
