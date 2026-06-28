# ADR-06 — Backend MVP: FastAPI as AI Application Layer

**Status:** Accepted  
**Date:** 2026  
**Area:** Backend / Architecture / LLM Integration

## Context and problem

Lazy Lands has evolved from a one-shot generator to a Campaign Companion for Dungeon Masters.

The core of the product is no longer classic CRUD or procedural generation, but **AI
orchestration with campaign narrative memory**:

- Initial extraction of NPCs, factions and world state
- Rolling accumulated campaign summary
- Contextualized next-session generation
- Strict validation of LLM-generated JSON
- Generation traceability
- Session export

The previous backend decision (.NET) was coherent when the differentiating value was around
domain, modularity and PDF export.

Now the technical center of gravity is AI, prompts and structured validation.

## Alternatives evaluated

| Option | Pros | Cons |
|---|---|---|
| .NET (C#) | Solid backend, strong typing, enterprise architecture | Friction with AI, less natural SDKs, more boilerplate |
| NestJS (TypeScript) | Homogeneous stack, good DX | Lower AI maturity, risk of coupling front/back |
| **FastAPI (Python)** ✅ | Top AI ecosystem, Pydantic, direct SDKs, high presence in examples and documentation used by LLMs | Two languages, less "enterprise look", discipline required |

## Decision

Python + FastAPI as the primary backend for the MVP.

FastAPI acts as the **AI Application Layer**:

```
Next.js App
   ├── Supabase Auth
   └── API client
        |
        | Supabase JWT
        v
FastAPI
   |
   ├── Auth (JWT validation)
   ├── Use cases (campaign, session, memory, generation)
   ├── Repositories (Supabase)
   ├── LLM providers (OpenRouter / Ollama)
   ├── Prompt builders
   ├── Pydantic schemas
   ├── Trace builder
   └── PDF exporter
        |
        v
Supabase (Auth + DB + RLS)
```

Supabase remains auth + DB + RLS. FastAPI orchestrates logic, AI and validation.

## Impact on previous ADRs

- **ADR-02 (.NET vs NestJS)** → superseded
- **ADR-03 (LlmProvider)** → retained, adapted to Python Protocol
- **ADR-05 (Hexagonal)** → retained, implementation changes

## Success criteria

- Use cases decoupled from the AI provider.
- Pydantic validation of all outputs before persisting.
- Tests with `FakeLlmProvider`.
- Supabase as single source of truth.
- Complete generation traceability.

## Consequences

**Positive:**

- Full alignment with AI as the product core.
- Strong validation with Pydantic.
- Much more natural AI SDKs.
- Stack favorable for LLM-assisted development.
- Perfect base for evolving toward real AI Engineering.

**Negative / trade-offs:**

- Two languages in the monorepo.
- Lose "classic enterprise stack" look.
- Python can become spaghetti without discipline.
- PDF generation more artisanal (WeasyPrint / Playwright).
