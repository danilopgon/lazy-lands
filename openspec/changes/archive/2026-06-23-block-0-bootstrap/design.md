# Design: Block 0 Repository Bootstrap

## Technical Approach

Block 0 turns the docs-first repository into a runnable scaffold without product feature implementation. WU-1 and WU-6a are already present; remaining work adds `apps/web`, `services/api`, `supabase/`, Docker/CI, and focused `DESIGN.md` evolution. This follows `PRODUCT.md`, architecture/quality docs, and the repository-bootstrap spec: placeholders are allowed; campaign/session/memory behavior is deferred.

## Architecture Decisions

| Decision | Choice | Alternatives considered | Rationale |
|---|---|---|---|
| Strict TDD | RED tests before WU-2/WU-3 implementation. | Scaffold first. | `config.yaml` requires strict TDD; failing tests prove scaffold contracts. |
| Monorepo boundaries | `apps/web`, `services/api`, `supabase/`, root/docs. | Shared packages now. | Matches workspace/Turbo/docs; shared packages would be speculative. |
| Frontend shell | Next.js App Router, TS, Tailwind, shadcn/ui, Supabase SSR helpers. | Copy `handoff/`. | Prototypes are visual references; production must be rebuilt. |
| Backend shell | FastAPI Clean Architecture: `api -> application -> domain -> infrastructure`. | Flat FastAPI. | Keeps future AI/Supabase code behind ports. |
| Supabase readiness | CLI config, env docs, seed and migrations placeholders. | Schema/RLS now. | Leaves Auth/RLS ready without Block 0 product data. |
| LLM scaffold | `LlmProvider` port plus fake provider only. | OpenRouter/RAG. | Real LLM calls, RAG, and embeddings are out of scope. |
| Docker verification | Verify Docker/Supabase runtime when Docker Desktop is available; defer only when unavailable. | Always defer. | Current environment has Docker Desktop and Compose, so Block 0 should not carry a stale environment blocker. |

## Data Flow

Block 0 runtime flow is intentionally minimal:

```text
Browser -> Next.js /, /login, /register, /dashboard placeholders
        -> Supabase browser/server helpers (configured, not feature-complete)

TestClient -> FastAPI app -> health router -> JSON status
FastAPI future flow: api routes -> application use cases -> domain ports -> infrastructure
```

No AI generation flow is implemented; only a fake provider behind the domain port exists.

## File Changes

| File | Action | Description |
|---|---|---|
| `apps/web/package.json` | Create | Next.js scripts and dependencies. |
| `apps/web/app/{layout,page}.tsx` | Create | App shell, metadata, fonts, landing entry. |
| `apps/web/app/{login,register,dashboard}/page.tsx` | Create | Placeholder routes; dashboard has auth TODO. |
| `apps/web/components/landing-page.tsx` | Create | Smoke-testable landing and CTA links. |
| `apps/web/components/ui/*` | Create | shadcn Button, Input, Textarea, Card, Label. |
| `apps/web/lib/supabase/*.ts`, `apps/web/middleware.ts` | Create | Supabase helpers and session middleware. |
| `apps/web/tests/*`, `apps/web/playwright.config.ts` | Create | Vitest setup/tests and smoke E2E config. |
| `services/api/pyproject.toml` | Create | FastAPI, Pydantic, pytest, Ruff, mypy, uv config. |
| `services/api/app/**` | Create | Clean Architecture skeleton, health, settings, security TODO, LLM port/fake. |
| `services/api/tests/*`, `services/api/README.md` | Create | Backend tests and run/test/env guidance. |
| `supabase/config.toml`, `supabase/migrations/.gitkeep`, `supabase/seed.sql`, `supabase/README.md` | Create | Supabase scaffold and local runtime instructions. |
| `apps/web/Dockerfile`, `services/api/Dockerfile`, `docker-compose.yml` | Create | Production-oriented scaffold with Docker verification when dependencies exist. |
| `.github/workflows/ci.yml` | Create | Frontend/backend quality gates with fake env values. |
| `DESIGN.md` | Modify | Promote durable prototype decisions without removing existing content. |

## Interfaces / Contracts

- Frontend landing MUST render: `Lazy Lands`, `Campaign Companion for Dungeon Masters`, `Remember what happened. Prepare what comes next.`, `Login`, `Register`.
- Backend `GET /health` MUST return `200` and `{"status":"ok","service":"lazy-lands-api"}`.
- `Settings` MUST parse app, CORS, Supabase, and LLM env values with Pydantic.
- `LlmProvider.complete(prompt: str) -> str` is async; fake returns deterministic non-empty JSON text.

## Testing Strategy

| Layer | What to Test | Approach |
|---|---|---|
| Frontend unit | Landing and shadcn Button contract | Vitest + React Testing Library; RED before component creation. |
| Frontend E2E | `/` smoke page | Playwright with local Next dev server. |
| Frontend quality | Lint, typecheck, build | `pnpm --filter web lint`, `typecheck`, `build`. |
| Backend unit | Health route, settings, fake LLM provider | pytest via `uv run pytest` from `services/api`. |
| Backend quality | Ruff formatting/lint and mypy | `uv run ruff check`, `uv run ruff format --check`, mypy non-blocking per tasks. |
| CI | Root scaffold protection | GitHub Actions runs frontend and backend gates using fake secrets. |

## Migration / Rollout

No data migration required. Roll out as six work-unit commits; WU-2, WU-3, and WU-4 unblock WU-5; WU-6b finalizes docs/design. Docker, compose, and Supabase runtime verification should run in environments where Docker Desktop and Compose are available; defer only if a later environment lacks Docker.

## Open Questions

- [ ] None blocking.
