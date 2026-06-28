# Proposal: Block 4 — Auth + Backend Structure Migration

## Intent

Implement end-to-end authentication (Supabase JWT validation, login/register UI, route protection) and migrate the backend from layer-first to modular monolith (ADR-05). Auth is the first block where frontend calls FastAPI, requiring real JWT enforcement and a dev environment that launches both services via `pnpm dev`.

## Scope

### In Scope

- **Backend structure migration**: Move `core/` → `shared/`, `infrastructure/llm/` → `shared/llm/`, `domain/ports/llm.py` → `shared/llm/`, `api/routes/health.py` → `health/routes.py`. Create empty feature module shells (`campaigns/`, `sessions/`, `memory/`, `generation/`) with `domain/`, `application/`, `infrastructure/` subdirs. Remove old directories. Update all imports.
- **Dev environment**: Add `services/api/package.json` with `dev` script (`uv run uvicorn`). `pnpm dev` launches Next.js + FastAPI via Turborepo.
- **Backend JWT validation**: Replace `get_current_user` stub with real PyJWT HS256 validation against `SUPABASE_JWT_SECRET`. Add `shared/database.py` Supabase client factory. Add `pyjwt[crypto]` dependency.
- **Frontend auth UI**: Replace login/register placeholders with real forms (react-hook-form + zod). Supabase email auth via `@supabase/supabase-js`.
- **Frontend middleware**: Create `apps/web/middleware.ts` — session refresh via `updateSession()`, route protection matcher for `/dashboard` and future protected routes.
- **HTTP client**: Create `apps/web/lib/api.ts` — fetch wrapper injecting JWT from Supabase browser client into `Authorization: Bearer` header.
- **Tests**: Protected route tests in FastAPI (valid/invalid/missing JWT). Form validation tests. Middleware unit tests.
- **Production smoke test**: End-of-block verification against deployed environment (Vercel frontend + Railway backend + hosted Supabase). Real user flow: register → login → logout → login again. Validates JWT validation works with hosted Supabase JWT secret, CORS is configured correctly, and redirects work in production.

### Out of Scope

- Feature module business logic (campaigns, sessions, memory, generation) — filled in by their respective blocks.
- Supabase schema changes — migration already exists from `supabase-setup` block.
- Real LLM calls — fake provider stays.
- RAG, embeddings, billing, multi-user collaboration — post-MVP.
- Email confirmation flow — disabled in local `config.toml`.

## Capabilities

### New Capabilities

- `jwt-auth`: Backend JWT validation via PyJWT, `get_current_user` dependency, protected route enforcement with 401 responses.
- `auth-ui`: Login and registration forms with client-side validation (zod), Supabase email auth, error handling, redirects.
- `session-management`: Next.js middleware for Supabase session refresh (cookie handling) and route protection (redirect unauthenticated users to `/login`).

### Modified Capabilities

- `repository-bootstrap`: Backend structure changes from layer-first (`core/`, `api/`, `domain/`, `infrastructure/`) to modular monolith (`shared/`, `health/`, feature shells). `services/api/package.json` added for Turborepo integration.

## Approach

### Phase 1: Backend structure migration

1. Create `shared/` with `config.py`, `security.py`, `errors.py`, `logging.py` (from `core/`), plus `database.py` (new), `llm/` (from `infrastructure/llm/` + `domain/ports/llm.py`).
2. Create `health/routes.py` (from `api/routes/health.py`).
3. Create empty feature shells: `campaigns/`, `sessions/`, `memory/`, `generation/` — each with `__init__.py` and appropriate empty subdirs per ADR-05.
4. Update `main.py` imports: `app.core.*` → `app.shared.*`, `app.api.routes.health` → `app.health.routes`.
5. Move `api/dependencies.py` re-export → `shared/dependencies.py`.
6. Update all test imports (`test_config.py`, `test_fake_llm.py`).
7. Delete old directories: `core/`, `api/`, `application/`, `domain/`, `infrastructure/`, `prompts/`.
8. Run `pytest` + `ruff check` — all must pass before proceeding.

### Phase 2: Auth implementation

1. Add `pyjwt[crypto]` to `pyproject.toml`.
2. Implement JWT validation in `shared/security.py` — decode HS256 with `supabase_jwt_secret`, extract `sub` as user ID.
3. Create `shared/database.py` — Supabase client factory using `supabase_service_role_key`.
4. Create `services/api/package.json` with `dev` script.
5. Create `apps/web/middleware.ts` — import `updateSession`, matcher for protected routes.
6. Replace `apps/web/app/login/page.tsx` — form with email/password, `supabase.auth.signInWithPassword`, redirect to `/dashboard` on success.
7. Replace `apps/web/app/register/page.tsx` — form with email/password, `supabase.auth.signUp`, redirect after registration.
8. Create `apps/web/lib/api.ts` — authenticated fetch wrapper.
9. Add protected route test in FastAPI: test valid JWT, expired JWT, missing header.

### Phase 3: Production smoke test

1. Deploy backend to Railway with production env vars (hosted Supabase URL, keys, JWT secret).
2. Deploy frontend to Vercel with production env vars (hosted Supabase URL, anon key, backend API URL).
3. Run smoke test manually: register a new user, login, verify redirect to `/dashboard`, logout, login again.
4. Verify JWT validation works against hosted Supabase JWT secret (not just local).
5. Verify CORS allows Vercel origin in production backend.
6. Document any issues found and fix before closing Block 4.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `services/api/app/shared/` | New | Transversal kernel: config, security, errors, logging, database, llm |
| `services/api/app/health/` | New | Health routes (moved from `api/routes/`) |
| `services/api/app/{campaigns,sessions,memory,generation}/` | New | Empty feature module shells per ADR-05 |
| `services/api/app/{core,api,application,domain,infrastructure,prompts}/` | Removed | Old layer-first structure |
| `services/api/app/main.py` | Modified | Import paths updated |
| `services/api/pyproject.toml` | Modified | Add `pyjwt[crypto]` |
| `services/api/package.json` | New | Turborepo dev script |
| `services/api/tests/` | Modified | Import paths updated, new auth tests |
| `apps/web/middleware.ts` | New | Next.js middleware for session + route protection |
| `apps/web/app/login/page.tsx` | Modified | Placeholder → real form |
| `apps/web/app/register/page.tsx` | Modified | Placeholder → real form |
| `apps/web/lib/api.ts` | New | Authenticated HTTP client |
| Production deployment | Verified | Smoke test against Vercel + Railway + hosted Supabase |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Import breakage during migration | Medium | Run `pytest` + `ruff` after each move. Migration is mechanical — grep confirms all `app.core.*` references updated. |
| PyJWT HS256 secret mismatch with Supabase | Low | Local secret from `supabase status`. `config.toml` defines JWT algorithm. Verify with a real token in integration test. |
| Middleware matcher too broad/narrow | Low | Start with explicit `/dashboard` path. Expand as blocks add protected routes. |
| Mixed structural + feature changes hard to review | Medium | Two clear phases: migration first (mechanical, tests pass), then auth (new functionality). Separate commits. |
| Production smoke test fails | Low | Hosted Supabase JWT secret differs from local. CORS origins not configured for Vercel domain. Mitigation: test locally first with `APP_ENV=production` to catch config issues early. |

## Rollback Plan

Git revert. The migration is a single branch. If Phase 1 (migration) has issues, revert to pre-migration commit. If Phase 2 (auth) has issues, revert auth commits while keeping migration.

## Dependencies

- `supabase-setup` block completed (migration, config, seed — done).
- `pyjwt[crypto]` package available via pip.
- `@supabase/ssr` and `@supabase/supabase-js` already in frontend dependencies.
- `react-hook-form` and `zod` already in frontend dependencies.

## Success Criteria

- [ ] `pytest` passes with all existing tests on new import paths.
- [ ] New test: protected endpoint returns 401 without JWT, 401 with invalid JWT, 200 with valid JWT.
- [ ] `pnpm dev` starts both Next.js (`:3000`) and FastAPI (`:8000`).
- [ ] Login form submits, receives Supabase session, redirects to `/dashboard`.
- [ ] Register form creates account via Supabase, redirects after signup.
- [ ] Unauthenticated visit to `/dashboard` redirects to `/login`.
- [ ] `ruff check` and `ruff format --check` pass on backend.
- [ ] `pnpm lint` and `pnpm typecheck` pass on frontend.
- [ ] Old directories (`core/`, `api/`, `application/`, `domain/`, `infrastructure/`, `prompts/`) no longer exist.
- [ ] **Production smoke test**: A real user can register, login, logout, and login again against the deployed frontend (Vercel) + backend (Railway) using the hosted Supabase project.
