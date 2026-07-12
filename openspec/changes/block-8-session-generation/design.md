# Design: Block 8 — Session Generation and Editing

## Technical Approach

Two modules collaborate: a new `generation/` module (domain: AI proposal generation) and extensions to the existing `sessions/` module (domain: session persistence and retrieval). The generation flow builds context via direct relational fetch, calls the LLM via `complete_json`, validates against `GeneratedSessionOutput` (Pydantic), and persists a draft session with `generated_content` + `trace_json`. The editing flow uses full-object PATCH where the frontend tracks per-section origin.

## Architecture Decisions

| Decision | Options | Trade-off | Chosen |
|----------|---------|-----------|--------|
| Module placement | New `generation/` vs put in `sessions/` | Generation is a separate domain (AI proposals) from sessions (registration/retrieval). ADR-05 rule 1 prohibits cross-module `application/` imports, so collocating would break bounded-context separation. | `generation/` — owns prompt, output model, context builder. `sessions/` owns read/update endpoints for persisted sessions. |
| Origin values in `generated_content` | Reuse `ContentSource` (has `llm`/`edited`/`manual`) vs string literals | `ContentSource` lacks `scribe`. Adding it would couple campaign's domain enum to generation's concern. | String literals `"scribe"` \| `"edited"` in `GeneratedSessionOutput` Pydantic model. No enum change. |
| PATCH strategy | Full-object `generated_content` vs delta patches | Deltas require server-side merge logic and diffing, adding complexity. Full-object is simpler — frontend already has the complete state. | Full-object PATCH — backend stores `generated_content` as-is. |
| Token estimation | `len(text)//4` heuristic vs tiktoken | tiktoken is exact but adds a dependency for a warning-only guard. Heuristic is O(1), good enough for trace logging. | `len(text)//4` — only used for trace metadata; prompt is always sent. |
| Per-section regeneration | Real LLM call vs UI placeholder | Real LLM needs prompt slicing + context re-assembly per section. The handoff shows the UI, but genuine regeneration requires non-trivial prompt engineering. | UI placeholder (quill loading + simulated result). Deferred per proposal non-goal. |
| Sessions flat routes | Same router vs separate router | Existing router prefix is `/campaigns/{campaign_id}/sessions`. `GET /sessions/{id}` and `PATCH /sessions/{id}` are resource-scoped, not campaign-scoped. | Second router in `sessions/api/routes.py` with prefix `/sessions` — matches campaigns module's multi-router pattern (`npcs_router`, etc.). |

## Data Flow

```
GENERATION FLOW:
  Frontend (PrepareSessionView)
    │ POST /campaigns/{id}/generate-session {goal, tone, pace, difficulty, additional_instructions}
    ▼
  generation/api/routes.py
    │ → generation/application/generate_session.py (GenerateNextSessionUseCase)
    │   → GenerationRepository.get_generation_context(campaign_id)
    │     (sequential direct SELECTs through the synchronous Supabase client:
    │      campaign, NPCs, factions, arcs, memory_facts)
    │   → context_builder.py (assemble + estimate tokens)
    │   → render_prompt("generate_session_v1.jinja", context)
    │   → LlmProvider.complete_json(prompt, GeneratedSessionOutput)
    │   → Pydantic validation (→ 422 on failure, no persist)
    │   → GenerationRepository.create_generated_session(…)
    │     (inserts session with generated_content, trace_json, auto-fills summary)
    ▼
  Returns session with id → frontend redirects to /campaigns/{id}/sessions/{session_id}

EDITING FLOW:
  Frontend (GeneratedSessionView) — user edits section body
    │ PATCH /sessions/{id} {generated_content: {sections: [{id, label, body, origin: "edited"}, …]}}
    ▼
  sessions/api/routes.py (detail_router)
    │ → UpdateSessionUseCase
    │   → SessionRepository.update_session(session_id, {generated_content, summary?, consequences?})
    ▼
  Returns updated session → frontend updates local state + flips OriginBadge

VIEW FLOW:
  Frontend (GeneratedSessionView)
    │ GET /sessions/{id}
    ▼
  sessions/api/routes.py (detail_router)
    │ → GetSessionUseCase
    │   → SessionRepository.get_session(session_id)
    ▼
  Returns full session with generated_content, trace_json → frontend renders sections
```

## File Changes

### New files — generation module
| File | Description |
|------|-------------|
| `generation/domain/ports.py` | `GenerationRepository` protocol: `get_generation_context()`, `create_generated_session()`, `get_generated_session()`, `update_generated_session()` |
| `generation/application/contracts.py` | `GeneratedSessionOutput`, `GeneratedSection` (origin as `"scribe"\|"edited"`), `Encounters`, `FactionReactions`, `ArcProgression`, `ContinuityLinks` |
| `generation/application/errors.py` | `GenerationNotFoundError` (→404) |
| `generation/application/context_builder.py` | Assemble context dict from repo fetch, estimate tokens, build prompt kwargs |
| `generation/application/generate_session.py` | `GenerateNextSessionUseCase` — orchestrates context → LLM → validate → persist |
| `generation/infrastructure/repository.py` | `SupabaseGenerationRepository` — sequential direct Supabase SELECTs through the synchronous client |
| `generation/api/routes.py` | `POST /campaigns/{campaign_id}/generate-session` |
| `generation/api/dependencies.py` | DI wiring for `GenerateNextSessionUseCase` |
| `generation/api/schemas.py` | `GenerateSessionRequest` (direction params), `GenerateSessionResponse` |
| `generation/api/exception_handlers.py` | Map `GenerationNotFoundError` → 404 |
| `generation/prompts/generate_session_v1.jinja` | Jinja prompt template (StrictUndefined, versioned) |

### Modified files — sessions module
| File | Change |
|------|--------|
| `sessions/domain/ports.py` | Add `get_session(session_id) -> dict\|None`, `update_session(session_id, data) -> dict` |
| `sessions/infrastructure/repository.py` | Implement `get_session()` (SELECT with `generated_content`, `trace_json`), `update_session()` (PATCH jsonb) |
| `sessions/application/commands/update_session.py` | New — `UpdateSessionUseCase` with ownership check |
| `sessions/application/queries/get_session.py` | New — `GetSessionUseCase` with ownership check |
| `sessions/application/read_models/session_detail.py` | New — `SessionDetailResponse` with `generated_content`, `trace_json` |
| `sessions/api/schemas/session/requests.py` | Add `UpdateSessionRequest` (all fields optional, at-least-one validation) |
| `sessions/api/routes.py` | Add `detail_router` (`/sessions/{session_id}`) with GET + PATCH |
| `sessions/api/dependencies.py` | Add providers for `GetSessionUseCase` and `UpdateSessionUseCase` |

### Modified — shared
| File | Change |
|------|--------|
| `app/main.py` | Import and mount `generation/api/routes.py` router, register `detail_router` from sessions |

### New files — frontend
| File | Description |
|------|-------------|
| `apps/web/app/[locale]/campaigns/[id]/prepare/page.tsx` | Server component → `PrepareSessionView` |
| `apps/web/app/[locale]/campaigns/[id]/sessions/[sessionId]/page.tsx` | Server component → `GeneratedSessionView` |
| `apps/web/components/sessions/prepare-session-form.tsx` | Direction form + context panel + generate/loading/error states |
| `apps/web/components/sessions/generated-session-view.tsx` | Section list, inline editing, memories sidebar, private notes, toast |

### Modified files — frontend
| File | Change |
|------|--------|
| `apps/web/lib/sessions/api.ts` | Add `generateSession()`, `getSession()`, `updateSessionContent()` |
| `apps/web/lib/sessions/schemas.ts` | Add Zod schemas for session detail, generated content, update request |
| `apps/web/messages/*.json` | i18n for prepare page, generated session view, error messages |

## Interfaces / Contracts

```python
# generation/application/contracts.py
from pydantic import BaseModel, Field
from typing import Literal

class GeneratedSection(BaseModel):
    id: str
    label: str
    body: str = Field(min_length=1)
    origin: Literal["scribe", "edited"]

class GeneratedContent(BaseModel):
    sections: list[GeneratedSection] = Field(min_length=1)

class GeneratedSessionOutput(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    synopsis: str = Field(min_length=1, max_length=2000)
    main_objective: str = Field(min_length=1, max_length=500)
    twist: str = Field(min_length=1, max_length=500)
    encounters: list[Encounter]
    faction_reactions: list[FactionReaction]
    arc_progression: list[ArcProgression]
    continuity_links: list[ContinuityLink]
```

```python
# generation/domain/ports.py
class GenerationRepository(Protocol):
    def get_generation_context(self, campaign_id: str) -> GenerationContext: ...
    def create_generated_session(self, campaign_id: str, session_data: dict) -> dict: ...
```

```python
# sessions/application/commands/update_session.py
@dataclass
class UpdateSessionCommand:
    generated_content: dict | None = None
    summary: str | None = None
    consequences: str | None = None

class UpdateSession:
    async def execute(self, session_id: str, user_id: str, command: UpdateSessionCommand) -> dict: ...
```

## Testing Strategy

| Layer | What | How |
|-------|------|-----|
| Unit | `GenerateNextSessionUseCase` with `FakeLlmProvider` | Inject fake that returns valid/invalid JSON; assert correct persist/422 paths. Test context builder token estimation with edge sizes. |
| Unit | `UpdateSessionUseCase` | Inject fake repository; assert serialized origin strings (`"scribe"`, `"edited"`), partial update semantics, and empty-body rejection. |
| Unit | `GeneratedSessionOutput` Pydantic model | Test valid full payload, missing fields, wrong origin values, and persistence content with `continuity_links`. |
| API-style unit | `POST /campaigns/{id}/generate-session` | FastAPI `TestClient` with fake Supabase chains + `FakeLlmProvider` — assert RLS-miss mapping, context assembly, persistence, trace metadata, and retryable error mapping. |
| API-style unit | `PATCH /sessions/{id}` | FastAPI `TestClient` with fake Supabase chains — assert ownership guard, full-object persistence, timestamp/update behavior. |
| API-style unit | `GET /sessions/{id}` | FastAPI `TestClient` with fake Supabase chains — assert `generated_content` (including `continuity_links`) and `trace_json` in response. |
| E2E | Prepare → generate → view → edit → save | Playwright: fill form, click generate, verify redirect, edit section, save, verify badge flips. |

## Migration / Rollout

No schema migration (columns exist). Unmount generation router + flat session routes to roll back. Any orphan draft sessions remain harmless — they have `generated_content` populated but no impact on existing flows.

## Open Questions

None — all decisions are scoped per proposal and specs.
