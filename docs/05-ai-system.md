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

Prompt templates should be versioned.

Suggested templates:

```text
prompts/templates/
  extract_campaign_v1.jinja
  summarize_campaign_v1.jinja
  suggest_memory_facts_v1.jinja
  generate_session_v1.jinja
```

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
