# Lazy Lands

**Campaign Companion for Dungeon Masters**

> Your campaign, without the amnesia.
> Persistent, reviewable memory for NPCs, factions and consequences.

---

## Problem

Campaign preparation becomes harder as context accumulates. A DM must track NPCs, factions,
consequences, open arcs, and forgotten details while preparing a coherent next session.
There is no good tool that connects what happened to what comes next.

---

## Solution

Lazy Lands helps a DM:

1. Capture campaign context from free text.
2. Record what happened after each session.
3. Review and validate AI-suggested memories.
4. Generate a coherent next-session proposal using only accepted memories.

The AI is the Scribe. It proposes, never decides. The DM always has the last word.

---

## Main MVP Flow

Full flow: [PRODUCT.md](./PRODUCT.md) section 4.

1. The DM signs up or logs in.
2. Creates a campaign from free text.
3. Reviews AI-extracted NPCs, factions and world state before saving.
4. Records what happened after a played session.
5. Reviews and accepts/edits/dismisses AI-suggested memories.
6. Asks Lazy Lands to prepare the next session.
7. Reviews and copies or exports the generated session proposal.

---

## Tech Stack

| Layer       | Technology                                                 |
| ----------- | ---------------------------------------------------------- |
| Frontend    | Next.js 15 (App Router), React, TypeScript, TailwindCSS    |
| UI          | shadcn/ui, Lucide, React Hook Form, Zod                    |
| Backend     | FastAPI, Python 3.12, Pydantic, pydantic-settings          |
| Package mgr | uv (backend), pnpm + Turborepo (monorepo)                  |
| Database    | Supabase (PostgreSQL + Auth + Row Level Security)          |
| AI          | LLM Provider abstraction (OpenRouter in prod, fake in dev) |
| Testing     | Vitest + React Testing Library, Playwright, pytest         |
| Quality     | ESLint, Prettier, Ruff, mypy, Husky, lint-staged           |
| Deployment  | Vercel (frontend), Railway (backend)                       |

---

## Architecture Overview

Backend follows a Modular Monolith with nested Clean/Hexagonal layers per module (see ADR-05). Feature modules live under `services/api/app/modules/` and encapsulate their own `domain/`, `application/`, `infrastructure/`, routes, schemas, and prompts. Transversal concerns live in the `shared/` kernel.

Full architecture reference: [docs/04-architecture.md](./docs/04-architecture.md).

---

## Repository Structure

```
lazy-lands/
|-- apps/web/                # Next.js frontend (App Router)
|   |-- app/                # Routes and layouts
|   |-- components/         # Shared UI components
|   |-- lib/                # Utilities (Supabase, etc.)
|   |-- tests/              # Vitest unit tests + Playwright E2E
|-- services/api/           # FastAPI backend
|   |-- app/main.py
|   |-- app/shared/         # Config, security, errors, logging, dependencies, shared adapters
|   |-- app/shared/llm/     # LLM provider port and fake implementation
|   |-- app/modules/        # Health + feature modules (campaigns, sessions, memory, generation)
|   |-- tests/              # pytest test suite
|-- supabase/               # Migrations, config, seed
|-- docs/                   # SDD technical documentation
|-- handoff/                # HTML prototypes (visual reference only)
|-- .github/workflows/      # CI pipeline
|-- PRODUCT.md              # Product source of truth
|-- DESIGN.md               # Design system and tokens
|-- AGENTS.md               # AI agent instructions
```

---

## Local Setup

### Prerequisites

- Node.js 20+ and pnpm 10+
- Python 3.12 and uv
- Docker Desktop + WSL2 (required for supabase start)

### 1. Clone and install

```bash
git clone https://github.com/danilopgon/lazy-lands.git
cd lazy-lands
pnpm install
```

### 2. Configure environment

```bash
cp .env.example .env
# Fill in the values from your Supabase project dashboard
```

### 3. Start Supabase (requires Docker)

```bash
pnpm supabase start
# Outputs local URLs and keys -- copy them into .env
```

Note: Supabase requires Docker Desktop with WSL2 on Windows.
Alternative: connect to a remote Supabase project.

### 4. Start the frontend

```bash
pnpm --filter web dev
# http://localhost:3000
```

### 5. Start the backend

```bash
cd services/api
uv run uvicorn app.main:app --reload
# http://localhost:8000
```

### 6. Start everything (Turborepo)

```bash
pnpm dev
```

---

## Environment Variables

Copy .env.example to .env and fill in your values.

| Variable                      | Description                      | Default               |
| ----------------------------- | -------------------------------- | --------------------- |
| NEXT_PUBLIC_SUPABASE_URL      | Supabase project URL             |                       |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | Supabase anon/public key         |                       |
| NEXT_PUBLIC_API_URL           | Backend API URL                  | http://localhost:8000 |
| APP_ENV                       | Backend environment              | development           |
| API_CORS_ORIGINS              | Allowed CORS origins             | http://localhost:3000 |
| SUPABASE_URL                  | Supabase URL (backend)           |                       |
| SUPABASE_ANON_KEY             | Supabase anon key (backend)      |                       |
| SUPABASE_SERVICE_ROLE_KEY     | Supabase service role key        |                       |
| SUPABASE_JWT_SECRET           | JWT secret (for verification)    |                       |
| LLM_PROVIDER                  | LLM provider: fake or openrouter | fake                  |
| OPENROUTER_API_KEY            | OpenRouter API key (production)  |                       |
| OPENROUTER_MODEL              | OpenRouter model string          |                       |

---

## Supabase Local Setup

```bash
# Start local Supabase stack (requires Docker Desktop + WSL2)
pnpm supabase start

# Copy output into .env:
# API URL      -> NEXT_PUBLIC_SUPABASE_URL and SUPABASE_URL
# anon key     -> NEXT_PUBLIC_SUPABASE_ANON_KEY and SUPABASE_ANON_KEY
# service_role -> SUPABASE_SERVICE_ROLE_KEY
# JWT secret   -> SUPABASE_JWT_SECRET
```

Note: supabase start not verified locally. WSL2 + Docker Desktop required.

See [supabase/README.md](./supabase/README.md) for full setup instructions.

---

## How to Run the Frontend

```bash
pnpm --filter web dev      # development server
pnpm --filter web build    # production build
pnpm --filter web start    # serve production build
```

---

## How to Run the Backend

```bash
cd services/api
uv sync
uv run uvicorn app.main:app --reload         # dev server (port 8000)
uv run uvicorn app.main:app --host 0.0.0.0  # production
```

Health check: GET http://localhost:8000/health

See [services/api/README.md](./services/api/README.md) for backend docs.

---

## How to Run with Docker Compose

Note: Not verified locally -- WSL2 + Docker Desktop required.

```bash
cp .env.example .env
pnpm supabase start     # Supabase separately
docker compose up       # web (3000) + api (8000)
```

---

## Available Scripts

### Root (Turborepo)

| Script       | Command           | Description                    |
| ------------ | ----------------- | ------------------------------ |
| dev          | pnpm dev          | Start all dev servers          |
| build        | pnpm build        | Build all packages             |
| lint         | pnpm lint         | Lint all packages              |
| typecheck    | pnpm typecheck    | TypeScript check all packages  |
| test         | pnpm test         | Run all unit tests             |
| format       | pnpm format       | Format all files with Prettier |
| format:check | pnpm format:check | Check formatting               |

### Frontend (apps/web)

| Script    | Command                     | Description          |
| --------- | --------------------------- | -------------------- |
| dev       | pnpm --filter web dev       | Start dev server     |
| build     | pnpm --filter web build     | Build for production |
| lint      | pnpm --filter web lint      | ESLint               |
| typecheck | pnpm --filter web typecheck | TypeScript check     |
| test      | pnpm --filter web test      | Vitest unit tests    |
| test:e2e  | pnpm --filter web test:e2e  | Playwright E2E       |

### Backend (services/api)

| Script     | Command                         | Description         |
| ---------- | ------------------------------- | ------------------- |
| Run        | uv run uvicorn app.main:app     | FastAPI dev server  |
| Test       | uv run pytest                   | pytest suite        |
| Lint       | uv run ruff check app/ tests/   | Ruff linter         |
| Format     | uv run ruff format --check app/ | Ruff formatter      |
| Type check | uv run mypy app/                | mypy (non-blocking) |

---

## Testing

```bash
# Frontend unit tests (Vitest)
pnpm --filter web test

# Frontend E2E (Playwright -- requires dev server)
pnpm --filter web test:e2e

# Backend tests (pytest)
cd services/api && uv run pytest
```

---

## Quality Checks

```bash
pnpm format:check
pnpm lint
pnpm typecheck
cd services/api && uv run ruff check app/ tests/
cd services/api && uv run mypy app/
```

Pre-commit hooks (Husky + lint-staged) run Prettier on staged files automatically.

---

## Deployment Notes

### Frontend -- Vercel

1. Connect the GitHub repository to Vercel.
2. Set apps/web as root directory.
3. Add all NEXT*PUBLIC*\* environment variables.
4. Set NEXT_PUBLIC_API_URL to the production backend URL.

Deployment URL: _Pending_

### Backend -- Railway

1. Build with services/api/Dockerfile.
2. Set backend env vars (APP_ENV=production, Supabase keys, LLM keys).
3. Set API_CORS_ORIGINS to the Vercel frontend URL.
4. Health check: GET /health.

Note: Dockerfiles are structurally correct but not verified locally (WSL2 + Docker required).

---

## AI Usage

- The backend abstracts the LLM behind an LlmProvider port.
- In dev/test: FakeLlmProvider returns deterministic JSON without API calls.
- In production: OpenRouterProvider calls the configured model.
- All LLM outputs are validated with Pydantic before storage or return.
- Prompts are versioned inside their owning feature module when implemented.

---

## Demo User

Demo user: _Pending_
Demo password: _Pending_

---

## Project URLs

| Resource   | URL       |
| ---------- | --------- |
| Deployment | _Pending_ |
| Slides     | _Pending_ |
| Video      | _Pending_ |

---

## Documentation

| Document                           | Purpose                                      |
| ---------------------------------- | -------------------------------------------- |
| [PRODUCT.md](./PRODUCT.md)         | Product principles, flow, entity model       |
| [DESIGN.md](./DESIGN.md)           | Design system, tokens, components, motion    |
| [docs/README.md](./docs/README.md) | Documentation index and reading guide        |
| [handoff/](./handoff/)             | Pure HTML prototypes (visual reference only) |
| [AGENTS.md](./AGENTS.md)           | Instructions for AI coding agents            |

---

## Post-MVP Roadmap

Features explicitly deferred after the TFM MVP:

- PDF export with privacy controls.
- Billing and free/premium plans.
- Advanced filtering: NPC/faction/arc filters, timeline view.
- RAG / vector search across campaign history.
- Multi-user collaboration and shared campaigns.
- Mobile app (native or PWA).
- Obsidian sync (two-way markdown export).
- Advanced relationship graph.
