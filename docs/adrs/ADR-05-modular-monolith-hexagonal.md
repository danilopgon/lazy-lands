# ADR-05 — Backend Architecture: Modular Monolith + Hexagonal/Clean

**Status:** Accepted
**Date:** 2026
**Area:** Backend / Architecture
**Refined:** 2026-06-28 — Nested layer structure within modules
**Refined:** 2026-06-29 — Feature modules grouped under `app/modules/` to separate domain modules from the shared kernel
**Refined:** 2026-07-05 — WU1.5 (Block 6), pass 1: `campaigns/` split flat `routes.py`/`schemas.py`
into `api/` (`routes.py`, `dependencies.py` for `Depends`-injected handlers,
`schemas/{entity}/{requests,responses}.py`), split `application/` into `queries/`/`commands/`,
and moved LLM-extraction contract models into `application/contracts.py`. This is the pattern
other modules should follow once they outgrow the flat single-file layout described below; the
example trees in this ADR are left as originally written for historical context — see
`docs/04-architecture.md` for the current `campaigns/` tree.
**Refined:** 2026-07-05 — WU1.5 (Block 6), pass 2 (owner-approved follow-up, same-day): the pass 1
move had preserved rather than fixed a dependency-rule violation (`domain/ports.py` and
`application/{queries,commands}` importing HTTP DTOs from `api/schemas/`). Fixed by making the
`CampaignRepository` port speak domain entities/scalars only (`NPC`, `Faction`, a new
creation-time domain type `NewArc`, plain `str` scalars) and moving the query read models
(`CampaignSummary`, `CampaignDetailResponse`, `NpcResponse`, `FactionResponse`, `ArcResponse`) out
of `api/schemas/*/responses.py` into `application/read_models/` — the layer that produces them.
Also split module-root `errors.py` (which mixed exception classes with FastAPI handlers) into
`application/errors.py` (classes) and `api/exception_handlers.py` (handlers); the module root no
longer holds any layer-specific code. **Binding dependency-direction rule going forward for every
module, not just `campaigns`:** the allowed arrows point inward only — `api -> application ->
domain`, `infrastructure -> domain` — and `domain`/`application` must never import from `api`
(no HTTP DTOs, no `fastapi`/`JSONResponse` types). See `docs/04-architecture.md` and
`openspec/changes/block-6-campaign-view/design.md` §Decision 4 for the full worked example and
the acceptance-check grep.

## Context and problem

Lazy Lands needs an architectural style for the FastAPI backend that balances development speed
(single developer, TFM deadline) with the ability to evolve toward post-MVP SaaS. Available
styles are not mutually exclusive, but choosing poorly means either unnecessary complexity or
hard-to-pay technical debt.

## Alternatives evaluated

| Style | Pros | Cons | Applies to MVP? |
|---|---|---|---|
| Microservices | Team autonomy, independent scaling | High operational complexity, requires parallel teams | ❌ No team, no justification |
| Event-driven | Decoupling, reactivity | Complex debugging, additional infrastructure | ❌ Synchronous flow, no real-time analytics |
| Monolith without modularity | Maximum initial speed | Big ball of mud — unpayable debt | ❌ Unacceptable risk for portfolio |
| **Modular Monolith + Hexagonal/Clean** ✅ | Deploy simplicity + protected domain + swappable adapters | Extra discipline required to maintain boundaries | ✅ Perfect fit for the context |

## Decision

Modular Monolith as macro deployment structure. Hexagonal/Clean as internal design.

This means:

- **Single FastAPI process** — no operational overhead of microservices for a solo developer.
- **Modules with explicit boundaries** by functional domain: `campaigns`, `sessions`,
  `memory`, `generation`, `exports`, all grouped under `app/modules/`. No module calls
  directly into the internals of another.
- **Nested layer structure within each module** — each feature module contains its own
  `domain/`, `application/`, `infrastructure/`, `routes.py`, `schemas.py`, and `prompts/`
  subdirectories. This combines the cohesion of feature-based organization with the discipline
  of layered architecture.
- **Shared kernel** (`shared/`) for transversal concerns: config, security, errors, logging,
  Supabase client, LLM provider port + adapters.
- **Ports & Adapters for external dependencies**: `LlmProvider` (ADR-03), and persistence
  repositories as an abstraction over Supabase/PostgREST.
- **Internal events or async tasks** as the inter-module communication mechanism when needed —
  for example, triggering `summarize` automatically when saving a session without the sessions
  module knowing about the generation module.

```text
app/
  shared/                    # Transversal: config, security, errors, Supabase client, LLM port+adapters
  modules/                   # All domain feature modules (separate from the shared kernel)
    campaigns/
      domain/
        models.py              # Campaign, NPC, Faction, Arc
        ports.py               # CampaignRepository Protocol
      application/
        extract_campaign.py
        create_campaign.py
        get_campaign.py
      infrastructure/
        repository.py          # SupabaseCampaignRepository
      routes.py
      schemas.py
      prompts/
        extract_campaign_v1.jinja
    sessions/
      domain/
        models.py
        ports.py
      application/
        register_session.py
      infrastructure/
        repository.py
      routes.py
      schemas.py
    memory/
      domain/
        models.py
        ports.py
      application/
        accept_memory.py
      infrastructure/
        repository.py
      routes.py
      schemas.py
      prompts/
        suggest_memory_facts_v1.jinja
    generation/
      domain/
        models.py
      application/
        generate_session.py
      routes.py
      schemas.py
      prompts/
        generate_session_v1.jinja
    health/
      routes.py
```

### Module structure rules

1. **A module does NOT import `application/` or `infrastructure/` from another module.** If
   campaigns needs something from sessions, it does so via a port in
   `modules/campaigns/domain/ports.py` or via the shared kernel.

2. **Shared entities live in the module that "owns" them.** `Campaign` lives in
   `modules/campaigns/domain/models.py`. Sessions, memory, and generation import Campaign
   from there. This is acceptable in a monolith — not microservices.

3. **Genuinely transversal concerns live in `shared/`.** Config, security, Supabase client,
   LLM port + adapters, errors, logging. If something is used by 2+ modules and none "owns" it,
   it goes to shared.

4. **Trivial features don't need the full structure.** `modules/health/` is just `routes.py`.
   Don't create empty `domain/` and `application/` just to comply.

## Evolution roadmap

1. **MVP TFM** → Modular Monolith + Hexagonal on FastAPI. One process, well-bounded modules,
   ports for LLM and persistence.
2. **Post-MVP** → Formalized internal events (pub/sub) to decouple modules without changing
   the deployment.
3. **If it scales** → Extract critical modules (e.g. `generation`) as independent
   microservices. Existing ports act as natural separation contracts.

## Explicit error this ADR avoids

**Hexagonal as label**: having `LlmProvider` as a port but use cases calling the Supabase
client directly. If persistence has no abstraction, the application is coupled to infrastructure
even if the LLM is not. The validation test: can I call business logic (prompt builder,
campaign validation) without launching Supabase?

## Consequences

**Positive:**

- Simple deploy: one FastAPI container, no complex orchestration.
- Testable domain in isolation — the prompt builder and business rules do not depend on
  infrastructure.
- Planned evolution: today's module boundaries are tomorrow's microservice contracts if needed.

**Negative / trade-offs:**

- Requires active discipline to not break module boundaries — the architecture does not
  enforce this on its own.
- Internal events add an indirection layer that may be over-engineering for small modules —
  evaluate case by case.
