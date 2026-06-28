# ADR-05 — Backend Architecture: Modular Monolith + Hexagonal/Clean

**Status:** Accepted — updated by ADR-06  
**Date:** 2026  
**Area:** Backend / Architecture

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
  `memory`, `generation`, `exports`. No module calls directly into the internals of another.
- **Ports & Adapters for external dependencies**: `LlmProvider` (ADR-03), and persistence
  repositories as an abstraction over Supabase/PostgREST.
- **Internal events or async tasks** as the inter-module communication mechanism when needed —
  for example, triggering `summarize` automatically when saving a session without the sessions
  module knowing about the generation module.

```
api/routers
application/use_cases
domain/models
domain/ports
infrastructure
core
prompts
```

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
