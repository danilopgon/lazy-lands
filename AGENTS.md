# AGENTS.md

You are working on Lazy Lands, a Campaign Companion for Dungeon Masters.

Before implementing product features, read `PRODUCT.md`, `DESIGN.md` and `docs/README.md`.

For UI work, also inspect the pure HTML prototypes in `handoff/`.

---

## Project Summary

Lazy Lands helps a Dungeon Master capture campaign context, record what happened during sessions,
validate important memories, and generate coherent proposals for future sessions.

The AI is personified as "the Scribe" — a chronicler who _proposes_, never decides. Every AI
output is an editable proposal; the DM always has the last word.

---

## Stack

| Layer       | Technology                                                         |
| ----------- | ------------------------------------------------------------------ |
| Frontend    | Next.js 16 (App Router), React, TypeScript, TailwindCSS, shadcn/ui |
| Backend     | FastAPI, Python 3.12, Pydantic, uv                                 |
| Database    | Supabase (PostgreSQL + Auth + RLS)                                 |
| AI          | LLM Provider abstraction (OpenRouter in production, fake in dev)   |
| Monorepo    | pnpm + Turborepo                                                   |
| Frontend QA | Vitest, React Testing Library, Playwright                          |
| Backend QA  | pytest, Ruff, mypy                                                 |

---

## Monorepo Structure

```
lazy-lands/
├── apps/
│   └── web/          # Next.js frontend
├── services/
│   └── api/          # FastAPI backend
├── supabase/         # Supabase migrations, config, seed
├── docs/             # SDD technical documentation
├── handoff/          # Pure HTML prototypes (visual reference only)
├── PRODUCT.md        # Product source of truth
├── DESIGN.md         # Design system and tokens
├── AGENTS.md         # This file
└── CLAUDE.md         # Imports AGENTS.md
```

---

## Command Reference

| Command                       | What it does                                 |
| ----------------------------- | -------------------------------------------- |
| `pnpm install`                | Install all dependencies                     |
| `pnpm dev`                    | Start all dev servers (turbo)                |
| `pnpm build`                  | Build all packages (turbo)                   |
| `pnpm lint`                   | Lint all packages (turbo)                    |
| `pnpm typecheck`              | TypeScript typecheck all packages (turbo)    |
| `pnpm test`                   | Run all unit tests (turbo)                   |
| `pnpm format`                 | Format all files with Prettier               |
| `pnpm format:check`           | Check formatting without writing             |
| `pnpm supabase start`         | Start Supabase local stack (requires Docker) |
| `uv run pytest`               | Run backend tests (from `services/api/`)     |
| `uv run ruff check app/`      | Lint backend Python code                     |
| `uv run uvicorn app.main:app` | Start FastAPI dev server                     |

---

## Quality Expectations

- All TypeScript must pass `tsc --noEmit` without errors.
- All frontend code must pass ESLint with no errors.
- All Python code must pass `ruff check` with no errors.
- Prettier must be applied to all non-Python files before committing.
- Do not introduce any secrets, API keys, or credentials in committed files.
- Prefer small, focused commits — each commit should tell a clear story.

---

## Testing Expectations

- Frontend unit tests use Vitest + React Testing Library.
- Frontend E2E tests use Playwright.
- Backend tests use pytest (asyncio mode enabled).
- This project follows Strict TDD: write the failing test first, then implement.
- Do not commit code that breaks the test suite.
- CI runs all tests on push to main and on pull requests.

---

## Documentation Routing

Read based on what you are working on:

| Task                              | Read first                               |
| --------------------------------- | ---------------------------------------- |
| Product understanding             | `PRODUCT.md`, `docs/00-product-brief.md` |
| MVP scope and boundaries          | `docs/01-mvp-scope.md`                   |
| User stories, acceptance criteria | `docs/02-requirements-and-acceptance.md` |
| Domain model and entities         | `docs/03-domain-model.md`                |
| Frontend/backend architecture     | `docs/04-architecture.md`                |
| AI prompts, memory flow           | `docs/05-ai-system.md`                   |
| API contracts                     | `docs/06-api-contracts.md`               |
| Supabase, Auth, RLS               | `docs/07-data-security-and-rls.md`       |
| Testing strategy and CI           | `docs/08-quality-strategy.md`            |
| TFM delivery requirements         | `docs/09-tfm-delivery.md`                |
| Documentation and comments        | `docs/conventions/documentation.md`      |
| UI/UX visual direction            | `DESIGN.md`, then `handoff/`             |

---

## Rules

### PRODUCT.md is the main product source of truth

All product decisions, scope boundaries, entity model, user flows, and required states are
defined in `PRODUCT.md`. When in doubt about product behavior, read `PRODUCT.md` first.

### DESIGN.md and handoff/ are design references, not production implementation

`DESIGN.md` is the durable design system specification (tokens, typography, components,
motion). `handoff/` contains pure HTML prototypes generated by Claude Design. Use them as
visual and interaction references. Do not copy prototype HTML or CSS directly into the
production app. Rebuild using React components, TailwindCSS, and shadcn/ui.

### Do not implement features outside the current spec

Only implement what is explicitly described in the current Block specification and `PRODUCT.md`
MVP scope. Do not add features speculatively or because they seem useful.

### Do not introduce RAG, embeddings, billing, or multi-user collaboration in Block 0

These are explicitly out of MVP scope. RAG and embeddings are post-MVP. Billing and multi-user
collaboration are not planned at all. Do not scaffold or stub these either.

### Do not commit secrets

Never commit API keys, JWT secrets, database passwords, or any credentials. Use `.env.example`
for documenting required variables. Real values go in `.env` (gitignored). CI uses fake values.

### AI outputs must be validated with Pydantic when AI features are implemented

All LLM outputs must be parsed and validated with a Pydantic model before being stored or
returned to the frontend. Never trust raw LLM output directly. This is a hard architectural rule.

### Supabase ownership and RLS matter for private campaign data

All campaign data (campaigns, sessions, memories, NPCs, factions, arcs) belongs to a specific
user. Row Level Security must be enforced so users can only access their own data. Every backend
operation must verify ownership before reading or writing. Never bypass RLS.

### Prefer small, reviewable changes

Each commit should represent a single deliverable unit of work. Keep PRs focused. Avoid mixing
unrelated changes. A reviewer should understand the purpose of a commit from its diff alone.

### Prefer self-documenting code over inline comments

Use clear names, small functions, typed boundaries, and focused tests before adding comments.
Inline comments are acceptable when they explain non-obvious why, tradeoffs, invariants,
security constraints, external framework behavior, or compatibility requirements. Do not add
comments that restate the code, duplicate a test name, or narrate routine steps. Remove stale,
misleading, decorative, or noisy comments when touching nearby code.
