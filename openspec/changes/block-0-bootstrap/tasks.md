# Tasks: Block 0 — Lazy Lands Repository Bootstrap

## Review Workload Forecast

| Field | Value |
|---|---|
| Estimated changed lines | 1 800 – 2 400 (scaffold + config + tests) |
| 400-line budget risk | High |
| Chained PRs recommended | No |
| Suggested split | 6 work-unit commits direct to `main` (size:exception) |
| Delivery strategy | exception-ok |
| Chain strategy | size-exception |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: High

### Work-Unit Commits

| Unit | Slice | Goal |
|---|---|---|
| WU-1 | Monorepo root foundation | pnpm + turbo + quality tooling committed and working — **DONE (commit 1)** |
| WU-2 | Frontend (apps/web) | Next.js + Tailwind + shadcn + tests committed and green |
| WU-3 | Backend (services/api) | FastAPI skeleton + tests committed and green |
| WU-4 | Supabase scaffold | supabase/ folder + env docs committed |
| WU-5 | Infra: Docker + CI | Dockerfiles + docker-compose + ci.yml committed |
| WU-6a | Base docs | README + AGENTS.md + CLAUDE.md — **DONE (commit 1)** |
| WU-6b | DESIGN.md evolution | Promote design decisions from handoff/ into DESIGN.md — deferred to commit after WU-2 |

**Note:** Docker runtime (`supabase start`, `docker build`, compose up) is DEFERRED — needs WSL2 + Docker Desktop. See §Deferred Verification at the bottom.

---

## WU-1: Monorepo Root Foundation

Spec ref: "Monorepo tooling", "Quality tooling / Root"

### Scaffold tasks (non-TDD)

- [x] 1.1 Create `pnpm-workspace.yaml` declaring `apps/*` and `services/*` packages.
- [x] 1.2 Create root `package.json` with `name: "lazy-lands"`, `private: true`, exact scripts: `dev`, `build`, `lint`, `typecheck`, `test`, `format`, `format:check`, `prepare` (per spec §Monorepo tooling), and `devDependencies`: `turbo`, `prettier`, `husky`, `lint-staged`.
- [x] 1.3 Run `pnpm install` from repo root; verify lockfile (`pnpm-lock.yaml`) is created.
- [x] 1.4 Create `turbo.json` with pipeline entries for `dev`, `build`, `lint`, `typecheck`, `test` — `build` depends on `^build`; `dev` is persistent.
- [x] 1.5 Create `.editorconfig` (indent_style=space, indent_size=2, end_of_line=lf, charset=utf-8, trim_trailing_whitespace=true, insert_final_newline=true).
- [x] 1.6 Create `.prettierrc` (singleQuote: true, semi: false, tabWidth: 2, trailingComma: "es5") and `.prettierignore` (node_modules, .next, dist, __pycache__, *.py + handoff/, docs/, .atl/, openspec/).
- [x] 1.7 Create `.gitignore` covering: node_modules, .next, dist, .env*.local, __pycache__, .venv, *.pyc, .turbo, .DS_Store, coverage, .playwright, supabase branches/temp.
- [x] 1.8 Create `.env.example` with EXACTLY these keys (per spec §Supabase setup): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_API_URL=http://localhost:8000`, `APP_ENV=development`, `API_CORS_ORIGINS=http://localhost:3000`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`, `LLM_PROVIDER=fake`, `OPENROUTER_API_KEY`, `OPENROUTER_MODEL`.
- [x] 1.9 Create `.vscode/settings.json` (formatOnSave: true, defaultFormatter: esbenp.prettier-vscode, eslint.validate: [typescript, typescriptreact]) and `.vscode/extensions.json` recommending: esbenp.prettier-vscode, dbaeumer.vscode-eslint, ms-python.python, ms-python.ruff, charliermarsh.ruff.
- [x] 1.10 Initialize Husky: run `pnpm exec husky init`; confirm `.husky/pre-commit` stub is created.
- [x] 1.11 Configure `lint-staged` in root `package.json`: `*.{ts,tsx}` → `[prettier --write]`; `*.py` → documented stub (ruff arrives in WU-3); `*.{md,json,yaml,yml}` → `prettier --write`. Note: ESLint entries deferred — apps/web ESLint config arrives in WU-2.
- [x] 1.12 Update `.husky/pre-commit` to run `pnpm exec lint-staged`.
- [x] 1.13 Verify `pnpm format` runs Prettier across root; fix any formatting issues. `pnpm format:check` passes.

---

## WU-2: Frontend (apps/web)

Spec ref: "Frontend setup", "Frontend routes", "Frontend UI from design handoff", "Frontend tests", "Supabase Auth in Next.js"

### TDD — RED phase (write failing tests first)

- [ ] 2.1 [RED] Create `apps/web/tests/landing.test.tsx`: import `LandingPage` component (does not exist yet); assert it renders text "Lazy Lands", "Campaign Companion for Dungeon Masters", "Remember what happened. Prepare what comes next.", and links with text "Login" and "Register". Run `pnpm --filter web test` — MUST fail (component missing).
- [ ] 2.2 [RED] Create `apps/web/tests/button.test.tsx`: import `Button` from `@/components/ui/button`; assert it renders with children text; assert it accepts `variant` prop. Run — MUST fail.
- [ ] 2.3 [RED] Create `apps/web/tests/e2e/smoke.spec.ts` (Playwright): navigate to `/`; assert page title contains "Lazy Lands" OR body contains "Remember what happened". Run `pnpm --filter web test:e2e` — MUST fail (app not up).

### Scaffold tasks (non-TDD)

- [ ] 2.4 [SCAFFOLD] Bootstrap Next.js app: run `pnpm create next-app@latest apps/web --typescript --tailwind --eslint --app --no-src-dir --import-alias "@/*"` (Git Bash). Clean default boilerplate (remove page.tsx hero content, globals.css reset to minimal).
- [ ] 2.5 [SCAFFOLD] Add `apps/web/package.json` scripts: `dev: next dev`, `build: next build`, `lint: next lint`, `typecheck: tsc --noEmit`, `test: vitest`, `test:e2e: playwright test`.
- [ ] 2.6 [SCAFFOLD] Install frontend deps: `pnpm --filter web add @supabase/supabase-js @supabase/ssr zod react-hook-form @hookform/resolvers lucide-react class-variance-authority clsx tailwind-merge`.
- [ ] 2.7 [SCAFFOLD] Install dev deps: `pnpm --filter web add -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom @vitejs/plugin-react @playwright/test`.
- [ ] 2.8 [SCAFFOLD] Create `apps/web/vitest.config.ts` (environment: jsdom, setupFiles: ./tests/setup.ts, include: tests/**/*.test.tsx).
- [ ] 2.9 [SCAFFOLD] Create `apps/web/tests/setup.ts` importing `@testing-library/jest-dom`.
- [ ] 2.10 [SCAFFOLD] Create `apps/web/playwright.config.ts` (baseURL: http://localhost:3000, webServer: { command: 'pnpm dev', port: 3000, reuseExistingServer: true }).
- [ ] 2.11 [SCAFFOLD] Initialize shadcn/ui: run `pnpm dlx shadcn@latest init` in `apps/web` (style: default, base color: neutral, CSS variables: yes). Add components: `button`, `input`, `textarea`, `card`, `label` via `pnpm dlx shadcn@latest add button input textarea card label`.
- [ ] 2.12 [SCAFFOLD] Create Supabase client helpers: `apps/web/lib/supabase/client.ts` (createBrowserClient from @supabase/ssr), `apps/web/lib/supabase/server.ts` (createServerClient with cookies()), `apps/web/lib/supabase/middleware.ts` (updateSession helper using @supabase/ssr).
- [ ] 2.13 [SCAFFOLD] Create `apps/web/middleware.ts` at root of apps/web importing updateSession; configure matcher to exclude static/_next.
- [ ] 2.14 [SCAFFOLD] Create route files: `apps/web/app/page.tsx` (LandingPage), `apps/web/app/login/page.tsx` (placeholder), `apps/web/app/register/page.tsx` (placeholder), `apps/web/app/dashboard/page.tsx` (protected placeholder with TODO comment for auth guard).
- [ ] 2.15 [SCAFFOLD] Create `apps/web/app/layout.tsx` loading Google Fonts (Instrument Sans, Source Serif 4, JetBrains Mono) via next/font or `<link>` in metadata; set `<html lang="en">`.

### TDD — GREEN phase (implement to pass tests)

- [ ] 2.16 [GREEN] Create `apps/web/components/landing-page.tsx` (or `apps/web/app/_components/landing-page.tsx`): renders heading "Lazy Lands", subheading "Campaign Companion for Dungeon Masters", tagline "Remember what happened. Prepare what comes next.", Login `<Link>` href="/login", Register `<Link>` href="/register", short MVP explanation paragraph. Uses shadcn Button, TailwindCSS. Export as `LandingPage`. Run `pnpm --filter web test` — tests 2.1 and 2.2 MUST pass.
- [ ] 2.17 [GREEN] Wire `apps/web/app/page.tsx` to import and render `LandingPage`. Confirm `pnpm --filter web build` succeeds.
- [ ] 2.18 [GREEN] Start dev server and run Playwright smoke test (task 2.3) — MUST pass.

### Cleanup

- [ ] 2.19 Run `pnpm --filter web lint` and `pnpm --filter web typecheck`; fix all errors.
- [ ] 2.20 Run `pnpm --filter web test` — all unit tests green; commit WU-2.

---

## WU-3: Backend (services/api)

Spec ref: "Backend setup", "Backend endpoints", "Backend tests", "FastAPI Supabase Auth scaffold"

### TDD — RED phase

- [ ] 3.1 [RED] Create `services/api/tests/test_health.py`: import `TestClient` from fastapi.testclient, import `app` from `app.main` (does not exist). Assert `GET /health` returns 200 and JSON `{"status": "ok", "service": "lazy-lands-api"}`. Run `uv run pytest` from `services/api` — MUST fail.
- [ ] 3.2 [RED] Create `services/api/tests/test_config.py`: import `Settings` from `app.core.config`; set env vars `APP_ENV=test`, `SUPABASE_URL=http://test`, `SUPABASE_ANON_KEY=test-key`; assert Settings() loads without error and `settings.app_env == "test"`. Run — MUST fail.
- [ ] 3.3 [RED] Create `services/api/tests/test_fake_llm.py`: import `FakeLlmProvider` from `app.infrastructure.llm.fake`; assert it implements the `LlmProvider` port (has `complete` method); assert `complete("prompt")` returns a non-empty string synchronously or async. Run — MUST fail.

### Scaffold tasks (non-TDD)

- [ ] 3.4 [SCAFFOLD] Create `services/api/pyproject.toml`: `[project]` name="lazy-lands-api", `requires-python = ">=3.12,<3.13"`, dependencies: fastapi, uvicorn[standard], pydantic, pydantic-settings, httpx, python-dotenv, supabase. `[tool.uv]` section. `[tool.ruff]` lint + format config (line-length=88, target-version="py312"). `[tool.mypy]` (strict=false, ignore_missing_imports=true, non-blocking). `[tool.pytest.ini_options]` asyncio_mode="auto".
- [ ] 3.5 [SCAFFOLD] Run `uv sync` from `services/api` to generate `uv.lock`; install dev deps: `uv add --dev pytest pytest-asyncio ruff mypy`.
- [ ] 3.6 [SCAFFOLD] Create directory skeleton (empty `__init__.py` in each): `app/`, `app/core/`, `app/api/`, `app/api/routes/`, `app/application/campaigns/`, `app/application/sessions/`, `app/application/memory/`, `app/application/generation/`, `app/domain/models/`, `app/domain/ports/`, `app/infrastructure/supabase/`, `app/infrastructure/llm/`, `app/prompts/`, `tests/`.
- [ ] 3.7 [SCAFFOLD] Create `app/core/config.py`: `Settings(BaseSettings)` with fields: `app_env: str = "development"`, `api_cors_origins: list[str] = ["http://localhost:3000"]`, `supabase_url: str`, `supabase_anon_key: str`, `supabase_service_role_key: str = ""`, `supabase_jwt_secret: str = ""`, `llm_provider: str = "fake"`. `model_config = SettingsConfigDict(env_file=".env")`. Expose singleton `settings = Settings()`.
- [ ] 3.8 [SCAFFOLD] Create `app/core/errors.py`: define `AppError(Exception)` and `http_error_handler` returning JSONResponse with `{"error": str(exc)}`.
- [ ] 3.9 [SCAFFOLD] Create `app/core/logging.py`: configure stdlib logging, JSON-friendly format, export `get_logger(name)`.
- [ ] 3.10 [SCAFFOLD] Create `app/core/security.py`: `get_current_user(authorization: str = Header(None))` dependency — if missing, raise `HTTPException(401)`; add `# TODO: verify Supabase JWT` comment; return raw token string for now.
- [ ] 3.11 [SCAFFOLD] Create `app/api/dependencies.py`: re-export `get_current_user` from core.security; add `# TODO: add per-route dependencies`.
- [ ] 3.12 [SCAFFOLD] Create `app/api/routes/health.py`: `router = APIRouter()`; `GET /health` returns `{"status": "ok", "service": "lazy-lands-api"}`.
- [ ] 3.13 [SCAFFOLD] Create `app/domain/ports/__init__.py` and `app/domain/ports/llm.py`: define `LlmProvider` as `Protocol` with `async def complete(self, prompt: str) -> str`.
- [ ] 3.14 [SCAFFOLD] Create `app/infrastructure/llm/fake.py`: `FakeLlmProvider` implementing `LlmProvider`; `complete` returns `'{"fake": true}'`.

### TDD — GREEN phase

- [ ] 3.15 [GREEN] Create `app/main.py`: instantiate `FastAPI(title="lazy-lands-api")`; add CORS middleware with `allow_origins=settings.api_cors_origins`; include `health.router` with prefix=""; add error handler. Run `uv run pytest tests/test_health.py` — MUST pass.
- [ ] 3.16 [GREEN] Verify `tests/test_config.py` passes: Settings loads from env vars. Run `uv run pytest tests/test_config.py`.
- [ ] 3.17 [GREEN] Verify `tests/test_fake_llm.py` passes: FakeLlmProvider satisfies LlmProvider protocol and returns a string. Run `uv run pytest tests/test_fake_llm.py`.
- [ ] 3.18 [GREEN] Run full suite: `uv run pytest` — all 3 test files green.

### Cleanup

- [ ] 3.19 Run `uv run ruff check app/ tests/` and `uv run ruff format --check app/ tests/`; fix all issues.
- [ ] 3.20 Run `uv run mypy app/` — non-blocking; note any errors but do not block commit.
- [ ] 3.21 Create `services/api/README.md` documenting: how to run (`uv run uvicorn app.main:app --reload`), how to test (`uv run pytest`), env vars required.
- [ ] 3.22 Commit WU-3.

---

## WU-4: Supabase Scaffold

Spec ref: "Supabase setup", "Supabase Auth in Next.js"

### Scaffold tasks (non-TDD — config/docs only)

- [ ] 4.1 [SCAFFOLD] Add Supabase CLI as root dev dependency: `pnpm add -Dw supabase`. Verify `pnpm supabase --version` works.
- [ ] 4.2 [SCAFFOLD] Run `pnpm supabase init` from repo root to generate `supabase/config.toml`. Confirm file exists. (No Docker needed for init.)
- [ ] 4.3 [SCAFFOLD] Create `supabase/migrations/.gitkeep` (placeholder — first real migration comes in Block 1).
- [ ] 4.4 [SCAFFOLD] Create `supabase/seed.sql` with a header comment: "-- Seed data for local Supabase development. Populated in Block 1." and a single `-- TODO: add auth.users seed` comment.
- [ ] 4.5 [SCAFFOLD] Verify `.env.example` already has all Supabase-related keys from task 1.8 (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_JWT_SECRET, etc.); update if any are missing.
- [ ] 4.6 [SCAFFOLD] Document Supabase local dev in a `supabase/README.md`: install Supabase CLI via pnpm (already done), run `pnpm supabase start` (requires Docker — see deferred section), set env vars from `supabase status` output.
- [ ] 4.7 [SCAFFOLD] Commit WU-4.

---

## WU-5: Infra — Docker + CI

Spec ref: "Local Docker setup", "Deployment scaffold", "GitHub Actions CI"

### Scaffold tasks (non-TDD — all documented-not-verified)

- [ ] 5.1 [SCAFFOLD] Create `services/api/Dockerfile` (production-oriented): FROM python:3.12-slim, WORKDIR /app, COPY pyproject.toml uv.lock ./, RUN pip install uv && uv sync --frozen --no-dev, COPY app/ ./app/, EXPOSE 8000, CMD ["uv", "run", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]. Mark with comment: `# NOTE: documented-not-verified-locally — requires Docker`.
- [ ] 5.2 [SCAFFOLD] Create `apps/web/Dockerfile` (production-oriented): multi-stage — deps stage (pnpm install), builder stage (pnpm build), runner stage (node:22-alpine, copy .next/standalone). EXPOSE 3000. Mark with comment: `# NOTE: documented-not-verified-locally — requires Docker`.
- [ ] 5.3 [SCAFFOLD] Create `docker-compose.yml`: services `web` (build: apps/web, ports: 3000:3000, env_file: .env) and `api` (build: services/api, ports: 8000:8000, env_file: .env). Add comment: `# Supabase: run separately with 'pnpm supabase start' (requires Docker). NOTE: not verified locally — WSL2+Docker required.`
- [ ] 5.4 [SCAFFOLD] Create `.github/workflows/ci.yml` with trigger on `[push: branches: [main], pull_request: branches: [main]]`. Two jobs:
  - `frontend`: ubuntu-latest; setup pnpm (10.x); node (22); `pnpm install --frozen-lockfile`; `pnpm lint`; `pnpm typecheck`; `pnpm test`; `pnpm build`. Env: fake Supabase values (`NEXT_PUBLIC_SUPABASE_URL: http://localhost:54321`, `NEXT_PUBLIC_SUPABASE_ANON_KEY: fake-key`, `NEXT_PUBLIC_API_URL: http://localhost:8000`). Playwright step marked `continue-on-error: true`.
  - `backend`: ubuntu-latest; setup python 3.12; install uv (`pip install uv`); `uv sync` in `services/api`; `uv run ruff check app/ tests/`; `uv run ruff format --check app/ tests/`; `uv run mypy app/ --ignore-missing-imports`; `uv run pytest`. Env: `APP_ENV: test`, `SUPABASE_URL: http://localhost:54321`, `SUPABASE_ANON_KEY: fake-key`.
- [ ] 5.5 [SCAFFOLD] Commit WU-5.

---

## WU-6: Docs

Spec ref: "README.md requirements", "AGENTS.md requirements", "CLAUDE.md requirements", "Design documentation evolution"

**Split into WU-6a (done, commit 1) and WU-6b (deferred to after WU-2 when handoff/ prototypes can be properly referenced).**

### WU-6a — Base docs (DONE — commit 1)

- [x] 6.1 [SCAFFOLD] Create root `README.md` with FULL TFM-deliverable structure.
- [x] 6.2 [SCAFFOLD] Create `AGENTS.md` at repo root with all required rules from spec.
- [x] 6.3 [SCAFFOLD] Create `CLAUDE.md` at repo root containing EXACTLY one line: `@AGENTS.md`.

### WU-6b — DESIGN.md evolution (DEFERRED — after WU-2)

- [ ] 6.4 [SCAFFOLD] Update `DESIGN.md` — promote stable design decisions from `handoff/app/chronicle.css` and `handoff/Lazy Lands Prototype.html` into DESIGN.md. Add or extend sections (DO NOT remove existing content): design principles (radius-0, hard ink shadows, mono as system voice, serif for reading, one accent), design tokens (all CSS custom properties from §3 of current DESIGN.md, formatted as a Tailwind `@theme` mapping guide), typography implementation notes (font loading strategy for Next.js, Tailwind font-family config), component specification notes for shadcn/ui overrides (Button: radius-0, 3px border, press shadow; Input: rust focus ring; Card: 2px border + 6px ink shadow), interaction patterns (button press physics, stamp/strike animations gated by data-motion), a11y notes (prefers-reduced-motion: always respected; contrast verified per DESIGN.md §3), layout conventions (page widths, single 900px breakpoint, editorial two-column), motion guidelines (entrance = decorative; action feedback = communicative; data-motion values). Clarify that `handoff/` prototypes are temporary references; DESIGN.md is the durable source.
- [ ] 6.5 [SCAFFOLD] Final verification pass: confirm `PRODUCT.md`, existing `docs/`, and `handoff/` are NOT overwritten; only DESIGN.md updated and new files created.
- [ ] 6.6 [SCAFFOLD] Run `pnpm format` across repo; run `pnpm lint` and `pnpm typecheck` on apps/web; run `uv run ruff check` and `uv run pytest` on services/api. Fix any remaining issues.
- [ ] 6.7 [SCAFFOLD] Commit WU-6b. Block 0 complete.

---

## Deferred Verification (Needs WSL2 + Docker)

These items are hand-written and structurally correct but CANNOT be runtime-verified until WSL2 and Docker Desktop are installed. Flag them clearly in README.

| Task | Command | Blocker |
|---|---|---|
| Supabase local start | `pnpm supabase start` | Docker required |
| Frontend Docker build | `docker build -t lazy-lands-web apps/web` | Docker required |
| Backend Docker build | `docker build -t lazy-lands-api services/api` | Docker required |
| Docker Compose up | `docker compose up` | Docker required |
| Full E2E against compose | Playwright vs compose stack | Docker required |

---

## Dependency Order Between Slices

```
WU-1 (root foundation) → WU-2 (frontend) → WU-5 (CI frontend job)
                       → WU-3 (backend)  → WU-5 (CI backend job)
                       → WU-4 (supabase) → WU-5 (references supabase start)
WU-2 + WU-3 + WU-4 → WU-5 (Docker + CI)
WU-5 → WU-6 (Docs — README references all setup steps)
```

WU-2, WU-3, and WU-4 can be worked sequentially after WU-1. WU-5 and WU-6 require WU-2 + WU-3 + WU-4 to be complete.

---

## Strict TDD Summary

| Task | Type | Phase |
|---|---|---|
| 2.1 landing page renders | Vitest + RTL | RED before 2.16 |
| 2.2 Button component | Vitest + RTL | RED before 2.16 |
| 2.3 Playwright smoke `/` | Playwright | RED before 2.17 |
| 3.1 GET /health | pytest | RED before 3.15 |
| 3.2 config loading | pytest | RED before 3.15 |
| 3.3 FakeLlmProvider | pytest | RED before 3.14 |

All other tasks are scaffold/config — not TDD-applicable.
