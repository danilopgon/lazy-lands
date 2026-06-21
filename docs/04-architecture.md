# Architecture

## Overview

Lazy Lands uses a decoupled frontend/backend architecture.

The frontend handles user experience, authentication UI and campaign management screens.

The backend acts as an AI Application Layer. It validates user identity, builds generation context, calls the selected LLM provider, validates AI outputs and persists results.

Supabase provides authentication, PostgreSQL storage and Row Level Security.

## Stack

### Frontend

- Next.js
- React
- TailwindCSS
- shadcn/ui
- React Hook Form
- Zod
- Optional: TanStack Query

### Backend

- Python
- FastAPI
- Pydantic
- pytest
- Ruff
- mypy

### Database and Auth

- Supabase Auth
- Supabase PostgreSQL
- Supabase RLS

### AI

- LLM Provider abstraction
- OpenRouter or external LLM provider in production
- Optional Ollama provider for local development
- Jinja prompt templates
- Pydantic output validation

## High-level diagram

```text
Next.js App
  |
  | Supabase JWT
  v
FastAPI
  |
  | Supabase Python Client / PostgREST
  v
Supabase
  ├── Auth
  ├── campaigns
  ├── npcs
  ├── factions
  ├── arcs
  ├── sessions
  └── memory_facts

FastAPI
  |
  | prompt + schema
  v
LLM Provider
```

## Backend architecture style

The backend follows a modular Clean Architecture / Hexagonal Architecture approach.

FastAPI routers are thin. They receive HTTP requests and delegate to application use cases.

Use cases orchestrate domain logic and infrastructure ports.

Infrastructure implements external dependencies such as Supabase, LLM providers and PDF/export services.

## Backend layers

```text
api/
  routers/
  dependencies/

application/
  campaigns/
  sessions/
  memory/
  exports/

domain/
  models/
  ports/

infrastructure/
  supabase/
  llm/
  pdf/

prompts/
  templates/
  render.py

core/
  config.py
  security.py
  logging.py
  errors.py
```

## Suggested repository structure

```text
apps/
  web/
    app/
    components/
    features/
    lib/
    styles/

services/
  api/
    app/
      main.py
      core/
      domain/
      application/
      infrastructure/
      api/
      prompts/
      tests/

docs/
  README.md
  00-product-brief.md
  01-mvp-scope.md
  02-requirements-and-acceptance.md
  03-domain-model.md
  04-architecture.md
  05-ai-system.md
  06-api-contracts.md
  07-data-security-and-rls.md
  08-quality-strategy.md
  09-tfm-delivery.md
```

## Frontend responsibility

The frontend is responsible for:

- Landing page.
- Authentication screens.
- Campaign list.
- Campaign creation flow.
- Campaign detail view.
- Session registration.
- Memory suggestion review.
- Generated session rendering.
- Copy/export interactions.
- Loading, error and success states.

## Backend responsibility

The backend is responsible for:

- Validating Supabase JWTs.
- Enforcing ownership before operations.
- Extracting campaign data using AI.
- Registering sessions.
- Updating accumulated summaries.
- Suggesting memory candidates.
- Accepting/rejecting memory facts.
- Building generation context.
- Calling LLM providers.
- Validating generated JSON.
- Returning structured data.
- Optional PDF/export generation.

## Architecture decisions

Key decisions:

- Supabase is used for Auth and DB.
- FastAPI is used as the AI Application Layer.
- LLM integration is hidden behind an `LlmProvider` port.
- AI outputs are validated with Pydantic.
- Memory uses explicit DM approval instead of automatic canon.
- RAG and embeddings are out of MVP scope.
