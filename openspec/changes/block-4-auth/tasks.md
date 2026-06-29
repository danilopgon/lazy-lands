# Tasks: block-4-auth — Auth + Backend Structure Migration

Ordered, dependency-aware implementation checklist for the **block-4-auth** change.
All 39 tasks follow Strict TDD: the failing test comes before its implementation.
Two main commit boundaries: (1) structural migration, (2) real auth.

---

## Dependency Map

```
Phase 1 (T-01..T-10) ──must complete first──┐
                                             ├── Phase 2A  Backend JWT (T-11..T-18)  ─── PR 2
                                             ├── Phase 2B  Middleware    (T-19..T-23)  ─── PR 3
                                             ├── Phase 2C-i  Login+API   (T-24..T-28)  ─── PR 4
                                             ├── Phase 2C-ii  Reg+Confirm (T-29..T-33)  ─── PR 5
                                             └── Phase 2C-iii Forgot+Reset (T-34..T-38) ─── PR 6
                                                                   │
                                       Final gate (T-39) ──────────┘
```

**Phase 2A, 2B, 2C-i, 2C-ii, 2C-iii are all parallelizable** with each other after Phase 1
completes. PRs 4/5/6 are chained for reviewer budget control, not for code dependencies —
pages do not import each other.

---

## Phase 1 — Structural Migration (repository-bootstrap)

> One commit. No business logic changes. Tests updated first, migration makes them green.
> Satisfies: RB-001, RB-002, RB-003, RB-004, RB-005, RB-006, NFR-RB-1, NFR-RB-2.

### T-01 · Update existing test import paths [TDD — make tests fail first]

**Seq**: first task in Phase 1.

Update all test files under `services/api/tests/` that import from old paths to the new
paths below. Do NOT delete any test — update the import only. After this task, `uv run
pytest` MUST fail with `ModuleNotFoundError` (the new paths do not yet exist).

| Old import | New import |
|------------|------------|
| `from app.core.config import settings` | `from app.shared.config import settings` |
| `from app.core.errors import ...` | `from app.shared.errors import ...` |
| `from app.core.logging import ...` | `from app.shared.logging import ...` |
| `from app.core.security import ...` | `from app.shared.security import ...` |
| `from app.api.dependencies import ...` | `from app.shared.dependencies import ...` |
| `from app.api.routes.health import ...` | `from app.health.routes import ...` |
| `from app.domain.ports.llm import ...` | `from app.shared.llm.port import ...` |
| `from app.infrastructure.llm.fake import ...` | `from app.shared.llm.fake import ...` |

Files to update: `tests/test_config.py`, `tests/test_fake_llm.py`, `tests/test_health.py`,
`tests/test_rls.py`, `tests/test_schema.py`, `tests/conftest.py`.

**Spec**: RB-005 / NFR-RB-1.

---

### T-02 · Create `app/shared/` kernel (config, security stub, errors, logging, dependencies)

**Seq**: after T-01. **Parallel with T-03, T-04**.

Create `services/api/app/shared/` with:

| File | Source | Notes |
|------|--------|-------|
| `__init__.py` | New — empty | |
| `config.py` | Move from `core/config.py` | Keep `supabase_jwt_secret` field — removal is Phase 2A (T-15) |
| `security.py` | Move from `core/security.py` | Keep existing stub — real ES256 impl is Phase 2A (T-14) |
| `errors.py` | Move from `core/errors.py` | Update internal imports only |
| `logging.py` | Move from `core/logging.py` | Update internal imports only |
| `dependencies.py` | Move from `api/dependencies.py` | Re-export `get_current_user` from `shared.security` |

**Spec**: RB-001 / NFR-RB-2 (structural only, no auth logic).

---

### T-03 · Create `app/shared/llm/` subpackage

**Seq**: after T-01. **Parallel with T-02, T-04**.

Create `services/api/app/shared/llm/` with:

| File | Source |
|------|--------|
| `__init__.py` | New — empty |
| `port.py` | Move from `domain/ports/llm.py` |
| `fake.py` | Move from `infrastructure/llm/fake.py` |

**Spec**: RB-001.

---

### T-04 · Create `app/health/` module

**Seq**: after T-01. **Parallel with T-02, T-03**.

Create `services/api/app/health/` with:

| File | Source |
|------|--------|
| `__init__.py` | New — empty |
| `routes.py` | Move from `api/routes/health.py` |

`routes.py` must continue to expose a `router` that `main.py` can import.

**Spec**: RB-002.

---

### T-05 · Create empty feature module shells

**Seq**: after T-01. **Parallel with T-02, T-03, T-04**.

Create the following directory tree (no business logic — scaffolding only):

```
services/api/app/
  campaigns/  __init__.py  domain/__init__.py  application/__init__.py  infrastructure/__init__.py
  sessions/   __init__.py  domain/__init__.py  application/__init__.py  infrastructure/__init__.py
  memory/     __init__.py  domain/__init__.py  application/__init__.py  infrastructure/__init__.py
  generation/ __init__.py  domain/__init__.py  application/__init__.py  infrastructure/__init__.py
```

No router from these modules is registered in `main.py` in this phase.

**Spec**: RB-003.

---

### T-06 · Update `main.py` imports

**Seq**: after T-02, T-03, T-04.

Replace all `app.core.*`, `app.api.*`, `app.domain.*`, and `app.infrastructure.*` imports in
`services/api/app/main.py` with `app.shared.*` / `app.health.*` equivalents. No import from
old paths must remain.

**Spec**: RB-001, RB-002.

---

### T-07 · Delete old directories

**Seq**: after T-06.

Remove the following directories from `services/api/app/`:

```
core/          api/           application/  (top-level only)
domain/        infrastructure/ (top-level)  prompts/
```

Do not remove the nested `domain/`, `application/`, `infrastructure/` directories inside
each feature shell created in T-05.

**Spec**: RB-004.

---

### T-08 · Add `services/api/package.json` with dev script

**Seq**: after T-01 (independent of T-02..T-07, can be done in parallel).

Create `services/api/package.json`:

```json
{
  "name": "api",
  "scripts": {
    "dev": "uv run uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"
  }
}
```

When `pnpm dev` is executed from the monorepo root, Turborepo must start both Next.js
(`:3000`) and FastAPI (`:8000`).

**Spec**: RB-006.

---

### T-09 · Add signing-key generation script to `services/api/package.json`

**Seq**: after T-08.

Extend `services/api/package.json` with a cross-platform key-generation script (works on
Windows PowerShell and macOS/Linux):

```json
{
  "scripts": {
    "dev": "uv run uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload",
    "setup:keys": "supabase gen signing-key --algorithm ES256 > supabase/signing_keys.json"
  }
}
```

Add `supabase/signing_keys.json` to `.gitignore`.
Uncomment `signing_keys_path` in `supabase/config.toml` and set its value to the generated
file path (line ~168 in the file). Developers run `pnpm --filter api setup:keys` before
`supabase start`. CI tests mock `PyJWKClient` — no real keys required in CI.

**Spec**: JA-006.

---

### T-10 · Verify Phase 1 green

**Seq**: after T-06, T-07 (all migration tasks complete).

Confirm:
- `uv run pytest` exits 0 (all existing tests pass on new import paths). (RB-005)
- `uv run ruff check app/` reports zero violations. (RB-005)
- `GET /health` returns HTTP 200 when the FastAPI server is started. (RB-002)

This task is a verification gate only — no code changes.

**[COMMIT 1 — structural migration: one commit, no auth logic]**

---

## Phase 2A — Backend JWT Auth (jwt-auth)

> Starts after Phase 1 commits. Parallel with Phase 2B, 2C-i, 2C-ii, 2C-iii.
> Satisfies: JA-001 through JA-006.

### T-11 · Add `pyjwt[crypto]` to `pyproject.toml`

**Seq**: first task in Phase 2A (prerequisite for test imports).

Add to `services/api/pyproject.toml` under `[project.dependencies]`:

```
"pyjwt[crypto]"
```

The `[crypto]` extra pulls in `cryptography`, which is required for ES256 support.

**Spec**: JA-001.

---

### T-12 · Write failing JWT auth tests (JA-T-01..11) [TDD — failing]

**Seq**: after T-11.

Create `services/api/tests/test_jwt_auth.py`. Tests must be runnable (imports resolve) but
fail because `get_current_user` is still a stub.

**Fixtures to add** (in `conftest.py` or the test file):

1. `ec_keypair` (session-scoped) — generates EC P-256 key pair in memory:
   ```python
   from cryptography.hazmat.primitives.asymmetric.ec import generate_private_key, SECP256R1
   from cryptography.hazmat.backends import default_backend
   ```

2. `make_token` helper — signs ES256 JWTs with fixture private key; accepts `sub`, `aud`,
   `iss`, `exp_offset`, `algorithm`, `kid` overrides.

3. `mock_jwks_client` fixture — monkeypatches `app.shared.security.jwks_client` with a
   `MagicMock` whose `get_signing_key_from_jwt` returns `SimpleNamespace(key=public_key)`.

4. Protected test endpoint (`/protected`) mounted only in tests — must NOT appear in
   production `main.py`.

**Test matrix** (all must be present; all must fail at this stage):

| ID | Scenario | Expected |
|----|----------|----------|
| JA-T-01 | Valid ES256 token, correct key, `aud: "authenticated"`, correct issuer, not expired | 200 |
| JA-T-02 | No `Authorization` header | 401 + `WWW-Authenticate: Bearer` |
| JA-T-03 | `Authorization: Bearer ` (empty token part) | 401 |
| JA-T-04 | Header present but no `Bearer ` prefix | 401 |
| JA-T-05 | Token signed by an unknown EC key (signature mismatch) | 401 |
| JA-T-06 | Expired token (`exp` in the past) | 401 |
| JA-T-07 | Malformed string (not a valid JWT) | 401 |
| JA-T-08 | `GET /health` with no Authorization header | 200 |
| JA-T-09 | Token with `aud: "anon"` | 401 |
| JA-T-10 | Token with wrong issuer | 401 |
| JA-T-11 | `mock_jwks_client.get_signing_key_from_jwt` raises `PyJWKClientError` | 401 |

Every 401 response assertion MUST also check for the `WWW-Authenticate: Bearer` header.

**Spec**: jwt-auth test requirements.

---

### T-13 · Write failing import/factory test for `shared/database.py` [TDD — failing]

**Seq**: after T-11. **Parallel with T-12**.

Add to `services/api/tests/test_jwt_auth.py` (or a dedicated `test_database.py`):

```python
def test_database_factory_is_importable():
    from app.shared.database import get_supabase_client
    assert callable(get_supabase_client)

def test_database_factory_does_not_init_at_import():
    # importing the module must not raise or make network calls
    import app.shared.database  # noqa: F401
```

These tests fail because `shared/database.py` does not exist yet.

**Spec**: JA-004.

---

### T-14 · Implement `get_current_user` in `shared/security.py`

**Seq**: after T-12 (failing tests exist). Makes JA-T-01..11 GREEN.

Replace the stub in `services/api/app/shared/security.py` with the real ES256/JWKS
implementation:

**Critical implementation points** (design Decision 1):

- **Module-level singleton**: `jwks_client: PyJWKClient = PyJWKClient(jwks_uri)` at module
  level. `PyJWKClient()` makes no network call at construction — safe to import.

- **Trailing-slash guard (mandatory)**:
  ```python
  base = str(settings.supabase_url).rstrip("/")
  jwks_uri = f"{base}/auth/v1/.well-known/jwks.json"
  issuer   = f"{base}/auth/v1"
  ```
  Omitting `rstrip("/")` causes `//auth/v1` in the issuer and rejects every valid token
  (JA-T-01 and JA-T-10 both fail if this is missing).

- **All failures → 401**: every `except` block — including `PyJWKClientError`, `DecodeError`,
  `ExpiredSignatureError`, `InvalidSignatureError`, `InvalidAudienceError`,
  `InvalidIssuerError`, `InvalidAlgorithmError` — must raise
  `HTTPException(status_code=401, headers={"WWW-Authenticate": "Bearer"})`.
  Never propagate the raw exception. Never return 503.

- **Return value**: `payload["sub"]` as `str`.

- `get_current_user` is re-exported from `shared/dependencies.py`.

**Spec**: JA-002, JA-002.1–JA-002.5 / NFR-JA-2, NFR-JA-3.

---

### T-15 · Remove `supabase_jwt_secret` from `Settings`

**Seq**: after T-14 (implementation no longer references the field).

Remove the `supabase_jwt_secret` field from `services/api/app/shared/config.py`.
Remove any remaining references in application code or tests. Update `tests/test_config.py`
if it asserts the field exists.

**Spec**: JA-005.

---

### T-16 · Implement `shared/database.py` lazy Supabase client factory

**Seq**: after T-13 (failing tests exist). Makes T-13 tests GREEN.

Create `services/api/app/shared/database.py`:

```python
from functools import lru_cache
from supabase import create_client, Client
from app.shared.config import settings

@lru_cache(maxsize=1)
def get_supabase_client() -> Client:
    return create_client(
        str(settings.supabase_url).rstrip("/"),
        settings.supabase_service_role_key,
    )
```

The function must NOT instantiate the client at module import time. The `lru_cache` acts as
a lazy singleton. Include the ownership constraint comment per JA-004 (service-role client
bypasses RLS; feature modules must not use it for user-data reads).

**Spec**: JA-004.

---

### T-17 · Verify Phase 2A backend green

**Seq**: after T-14, T-15, T-16.

Confirm:
- `uv run pytest` exits 0: all 11 JA-T tests pass + all existing tests still pass.
- `uv run ruff check app/` reports zero violations.

**[COMMIT 2 — backend jwt-auth: one commit, adds real ES256/JWKS validation]**

---

## Phase 2B — Frontend Middleware (session-management)

> Starts after Phase 1 commits. Parallel with Phase 2A, 2C-i, 2C-ii, 2C-iii.
> Satisfies: SM-001 through SM-007, NFR-SM-1, NFR-SM-2, NFR-SM-3.

### T-18 · Write failing Vitest unit tests for `decideAuth` (SM-T-01..07) [TDD — failing]

**Seq**: first task in Phase 2B.

Create `apps/web/middleware.test.ts`. Tests are pure-function Vitest tests of
`decideAuth(user, pathname)` — no `@edge-runtime/vm` required.

| ID | User | Path | Expected return |
|----|------|------|-----------------|
| SM-T-01 | `null` (no session) | `/dashboard` | `"redirect"` |
| SM-T-02 | `{ id: "x" }` (valid session) | `/dashboard` | `"passthrough"` |
| SM-T-03 | `null` | `/` | `"passthrough"` |
| SM-T-04 | `null` | `/login` | `"passthrough"` |
| SM-T-05 | `null` | `/forgot-password` | `"passthrough"` |
| SM-T-06 | `null` | `/auth/confirm` | `"passthrough"` |
| SM-T-07 | `null` | `/auth/reset` | `"passthrough"` |

Tests fail because `lib/auth/decide.ts` does not exist yet.

**Spec**: session-management test requirements.

---

### T-19 · Create pure `decideAuth` function

**Seq**: after T-18 (failing tests exist). Makes SM-T-01..07 GREEN.

Create `apps/web/lib/auth/decide.ts`:

```ts
import type { User } from "@supabase/supabase-js";

const PROTECTED = ["/dashboard"];

export function decideAuth(
  user: User | null,
  pathname: string
): "redirect" | "passthrough" {
  const isProtected = PROTECTED.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
  if (isProtected && !user) return "redirect";
  return "passthrough";
}
```

The function must return `"passthrough"` defensively for any non-protected path regardless
of session state (SM-T-03..SM-T-07 all pass through).

**Spec**: SM-005, SM-006 / design Decision 3.

---

### T-20 · Write failing Playwright E2E test for middleware glue [TDD — failing]

**Seq**: after T-19 (decideAuth exists, middleware.ts does not).

Create `apps/web/tests/e2e/middleware.spec.ts`:

```ts
import { test, expect } from "@playwright/test";

test("unauthenticated visit to /dashboard redirects to /login", async ({
  page,
}) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login/);
});
```

Test fails because `middleware.ts` does not yet exist; visiting `/dashboard` renders the
page directly without any redirect.

**Spec**: SM-005 (edge glue).

---

### T-21 · Create `middleware.ts` thin glue

**Seq**: after T-20 (failing Playwright test exists). Makes T-20 Playwright test GREEN.

Create `apps/web/middleware.ts` at the Next.js app root (peer of `app/`, not inside it):

```ts
import { NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { decideAuth } from "@/lib/auth/decide";

export async function middleware(request: NextRequest) {
  const { response, supabase } = await updateSession(request);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (decideAuth(user, request.nextUrl.pathname) === "redirect") {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return response;
}

export const config = {
  matcher: ["/dashboard", "/dashboard/:path*"],
};
```

The matcher is scoped to `/dashboard*` only — all other routes are untouched by the
middleware (SM-004 public routes are never reached by the matcher).

**Spec**: SM-001, SM-002, SM-003, SM-004, SM-005, SM-006, SM-007 / NFR-SM-1, NFR-SM-2.

---

### T-22 · Verify Phase 2B middleware green

**Seq**: after T-21.

Confirm:
- `pnpm test` — all 7 SM-T Vitest tests pass.
- Playwright E2E — `apps/web/tests/e2e/middleware.spec.ts` passes.
- `pnpm typecheck` passes on `middleware.ts` and `lib/auth/decide.ts`.

**[COMMIT 3 — middleware: decideAuth pure function + thin Edge glue]**

---

## Phase 2C-i — Auth UI: HTTP Client + Login Page

> Starts after Phase 1 commits. **Parallelizable** with Phase 2A, 2B, 2C-ii, 2C-iii.
> Chained after Phase 1 for budget control, not for code dependency.
> Satisfies: AU-001, AU-003.

### T-23 · Write failing Vitest tests for HTTP client (AU-T-12..14) [TDD — failing]

**Seq**: first task in Phase 2C-i.

Create `apps/web/lib/__tests__/api.test.ts`. Mock `supabase.auth.getSession`.

| ID | Scenario |
|----|----------|
| AU-T-12 | Active session → `Authorization: Bearer <token>` header present |
| AU-T-13 | No session → no `Authorization` header |
| AU-T-14 | Relative path `/campaigns` → prefixed with `NEXT_PUBLIC_API_URL` |

Tests fail because `lib/api.ts` does not exist.

**Spec**: AU-003.

---

### T-24 · Create `apps/web/lib/api.ts` fetch wrapper

**Seq**: after T-23. Makes AU-T-12..14 GREEN.

Export `apiFetch(path, init?)`:
- Call `supabase.auth.getSession()`. If session and `access_token` exist, inject
  `Authorization: Bearer <access_token>` header.
- If `path` starts with `/`, prepend `process.env.NEXT_PUBLIC_API_URL`.
- Do NOT catch or transform 4xx/5xx — return the raw `Response`.

**Important**: `NEXT_PUBLIC_API_URL` (backend base URL) is distinct from
`NEXT_PUBLIC_APP_URL` (frontend domain, used for email redirect URLs in the register and
forgot-password pages).

**Spec**: AU-003.1, AU-003.2, AU-003.3.

---

### T-25 · Write failing RTL tests for login form (AU-T-01..07) [TDD — failing]

**Seq**: after T-23 (or in parallel). Does not depend on T-24.

Create `apps/web/app/login/__tests__/page.test.tsx`. Mock `supabase.auth.signInWithPassword`
and the Next.js router.

| ID | Scenario |
|----|----------|
| AU-T-01 | Empty email → validation error visible; no Supabase call |
| AU-T-02 | Invalid email format → validation error; no Supabase call |
| AU-T-03 | Empty password → validation error; no Supabase call |
| AU-T-04 | Valid input → `signInWithPassword` mock called |
| AU-T-05 | Successful mock → navigate to `/dashboard` |
| AU-T-06 | Error mock → error message in DOM; no navigation |
| AU-T-07 | Submit button disabled while in-flight |

Tests fail because `apps/web/app/login/page.tsx` is still a placeholder.

**Spec**: AU-001.

---

### T-26 · Replace login placeholder with real form

**Seq**: after T-25. Makes AU-T-01..07 GREEN.

Replace `apps/web/app/login/page.tsx` with a real `"use client"` form:
- `react-hook-form` + `zod` (both in `apps/web/package.json`) for client-side validation.
- Fields: `email` (`z.string().email()`) + `password` (`z.string().min(1)`).
- On valid submit: call `supabase.auth.signInWithPassword({ email, password })`.
- On success: redirect to `/dashboard`.
- On error: display error in DOM; keep form interactive.
- Loading state: disable submit button while in-flight; show loading indicator.

**Spec**: AU-001.1, AU-001.2, AU-001.3.

---

### T-27 · Verify Phase 2C-i green

**Seq**: after T-24, T-26.

- `pnpm test` — AU-T-12..14 and AU-T-01..07 pass.
- `pnpm typecheck` + `pnpm lint` pass on `lib/api.ts` and `app/login/page.tsx`.

**[COMMIT 4 — auth-ui: HTTP client + login form]**

---

## Phase 2C-ii — Auth UI: Register Page + Email Confirm Callback

> **Parallelizable** with Phase 2A, 2B, 2C-i, 2C-iii after Phase 1.
> Chained after Phase 2C-i for reviewer budget control.
> Satisfies: AU-002, AU-004.

### T-28 · Write failing RTL tests for register form (AU-T-08..11) [TDD — failing]

**Seq**: first task in Phase 2C-ii.

Create `apps/web/app/register/__tests__/page.test.tsx`.

| ID | Scenario |
|----|----------|
| AU-T-08 | Invalid email format → validation error; no Supabase call |
| AU-T-09 | Valid input → `signUp` mock called with `emailRedirectTo` pointing to `/auth/confirm` |
| AU-T-10 | Successful mock → "Check your email" message in DOM; NOT redirected to `/dashboard` |
| AU-T-11 | Error mock → error message in DOM |

**Spec**: AU-002.

---

### T-29 · Replace register placeholder with real form

**Seq**: after T-28. Makes AU-T-08..11 GREEN.

Replace `apps/web/app/register/page.tsx` with a real `"use client"` form:
- On valid submit: `supabase.auth.signUp({ email, password, options: { emailRedirectTo } })`.
- `emailRedirectTo` = `process.env.NEXT_PUBLIC_APP_URL + "/auth/confirm"`.
  (`NEXT_PUBLIC_APP_URL` is the frontend domain — distinct from `NEXT_PUBLIC_API_URL`.)
- On success: show "Check your email" message; make form non-interactive; do NOT redirect.
- On error: show error; keep form interactive.

**Spec**: AU-002.1, AU-002.2, AU-002.3.

---

### T-30 · Write failing RTL tests for `/auth/confirm` page (AU-T-15..17) [TDD — failing]

**Seq**: after T-28 (or in parallel). Does not depend on T-29.

Create `apps/web/app/auth/confirm/__tests__/page.test.tsx`. Mock `supabase.auth.verifyOtp`
and the router.

| ID | Scenario |
|----|----------|
| AU-T-15 | Valid `token_hash` + `type` in URL → `verifyOtp` called → redirect to `/dashboard` |
| AU-T-16 | `verifyOtp` error → error message visible; link to `/register` present |
| AU-T-17 | Missing `token_hash` in URL → error message visible |

Tests fail because the page does not exist.

**Spec**: AU-004.

---

### T-31 · Create `/auth/confirm` page

**Seq**: after T-30. Makes AU-T-15..17 GREEN.

Create `apps/web/app/auth/confirm/page.tsx` as a `"use client"` component:
- Read `token_hash` and `type` from `useSearchParams()`.
- On mount (`useEffect`): if both present, call `supabase.auth.verifyOtp({ token_hash, type })`.
- On success: **hard navigation** (`window.location.href = "/dashboard"` or `router.push`)
  so the SSR middleware sees the freshly-written session cookie (design Decision 2).
- On failure: show error + link to `/register`.
- If `token_hash` absent: show error immediately.
- Loading indicator while `verifyOtp` is in-flight.

**Spec**: AU-004.1, AU-004.2, AU-004.3 / design Decision 2 (hard nav after verifyOtp).

---

### T-32 · Verify Phase 2C-ii green

**Seq**: after T-29, T-31.

- `pnpm test` — AU-T-08..11 and AU-T-15..17 pass.
- `pnpm typecheck` + `pnpm lint` pass on `app/register/page.tsx` and `app/auth/confirm/page.tsx`.

**[COMMIT 5 — auth-ui: register form + email confirm callback]**

---

## Phase 2C-iii — Auth UI: Forgot Password + Reset Callback

> **Parallelizable** with Phase 2A, 2B, 2C-i, 2C-ii after Phase 1.
> Chained after Phase 2C-ii for reviewer budget control.
> Satisfies: AU-005, AU-006.

### T-33 · Write failing RTL tests for `/forgot-password` page (AU-T-18..20) [TDD — failing]

**Seq**: first task in Phase 2C-iii.

Create `apps/web/app/forgot-password/__tests__/page.test.tsx`.

| ID | Scenario |
|----|----------|
| AU-T-18 | Invalid email format → validation error; no Supabase call |
| AU-T-19 | Valid email → `resetPasswordForEmail` called with correct `redirectTo` (`NEXT_PUBLIC_APP_URL + "/auth/reset"`) |
| AU-T-20 | After submit (success or failure) → confirmation message shown; form non-interactive |

**Spec**: AU-005.

---

### T-34 · Create `/forgot-password` page

**Seq**: after T-33. Makes AU-T-18..20 GREEN.

Create `apps/web/app/forgot-password/page.tsx` as a `"use client"` component:
- `email` field with `z.string().email()` validation.
- On valid submit: `supabase.auth.resetPasswordForEmail(email, { redirectTo })`.
  `redirectTo` = `process.env.NEXT_PUBLIC_APP_URL + "/auth/reset"`.
- Regardless of outcome: show uniform message ("If an account exists, a reset email has
  been sent"). Make form non-interactive. Do NOT vary the message by outcome (AU-005.2 —
  prevents email enumeration).

**Spec**: AU-005.1, AU-005.2.

---

### T-35 · Write failing RTL tests for `/auth/reset` page (AU-T-21..24) [TDD — failing]

**Seq**: after T-33 (or in parallel). Does not depend on T-34.

Create `apps/web/app/auth/reset/__tests__/page.test.tsx`.

| ID | Scenario |
|----|----------|
| AU-T-21 | Valid `token_hash` + `type=recovery` → `verifyOtp` succeeds → new password form shown |
| AU-T-22 | `verifyOtp` error on mount → error message; link to `/forgot-password` present |
| AU-T-23 | Password mismatch → validation error; `updateUser` NOT called |
| AU-T-24 | Valid passwords → `updateUser` called → success message + redirect to `/login` |

**Spec**: AU-006.

---

### T-36 · Create `/auth/reset` page

**Seq**: after T-35. Makes AU-T-21..24 GREEN.

Create `apps/web/app/auth/reset/page.tsx` as a `"use client"` component:
- On mount: read `token_hash` and `type` from URL. Call `verifyOtp({ token_hash, type: "recovery" })`.
- On `verifyOtp` success: show new password form (fields: `newPassword` min 6 chars +
  `confirmPassword` must match).
- On `verifyOtp` failure: show error + link to `/forgot-password`.
- On password submit: call `supabase.auth.updateUser({ password: newPassword })`.
- On `updateUser` success: show "Password updated" message and direct to `/login`.
- On `updateUser` error: show error; keep form interactive.

**Spec**: AU-006.1, AU-006.2, AU-006.3 / design Decision 2.

---

### T-37 · Verify Phase 2C-iii green

**Seq**: after T-34, T-36.

- `pnpm test` — AU-T-18..20 and AU-T-21..24 pass.
- `pnpm typecheck` + `pnpm lint` pass on `app/forgot-password/page.tsx` and `app/auth/reset/page.tsx`.

**[COMMIT 6 — auth-ui: forgot-password + reset callback]**

---

## T-38 · Full Suite Gate (all PRs merged)

**Seq**: after all of Phase 2A, 2B, 2C-i, 2C-ii, 2C-iii are merged.

| Check | Command | Required result |
|-------|---------|-----------------|
| Backend unit tests | `uv run pytest` from `services/api/` | Exit 0 — includes JA-T-01..11 + existing |
| Frontend unit tests | `pnpm test` | All 42 tests pass (11 JA + 24 AU + 7 SM) |
| Frontend typecheck | `pnpm typecheck` | Zero errors |
| Frontend lint | `pnpm lint` | Zero errors |
| Backend lint | `uv run ruff check app/` from `services/api/` | Zero violations |

This task gates the PR train — do not declare Block 4 complete until it is green.

**Spec**: acceptance criteria summary (all 42 automated tests); NFR-GLOBAL-1 through NFR-GLOBAL-5.

---

## Summary: Test/Implementation Pairs

| Test task | Test IDs | Implementation task |
|-----------|----------|---------------------|
| T-01 (update imports) | — | T-02..T-07 (migration) |
| T-12 | JA-T-01..11 | T-14 (`get_current_user`) |
| T-13 | database factory | T-16 (`database.py`) |
| T-18 | SM-T-01..07 | T-19 (`decideAuth`) |
| T-20 | E2E middleware | T-21 (`middleware.ts`) |
| T-23 | AU-T-12..14 | T-24 (`api.ts`) |
| T-25 | AU-T-01..07 | T-26 (login form) |
| T-28 | AU-T-08..11 | T-29 (register form) |
| T-30 | AU-T-15..17 | T-31 (`/auth/confirm`) |
| T-33 | AU-T-18..20 | T-34 (`/forgot-password`) |
| T-35 | AU-T-21..24 | T-36 (`/auth/reset`) |

---

## Parallel / Sequential Reference

| Group | Can start after | Parallel with |
|-------|-----------------|---------------|
| Phase 1 (T-01..T-10) | Immediately | — |
| Phase 2A (T-11..T-17) | Phase 1 committed | 2B, 2C-i, 2C-ii, 2C-iii |
| Phase 2B (T-18..T-22) | Phase 1 committed | 2A, 2C-i, 2C-ii, 2C-iii |
| Phase 2C-i (T-23..T-27) | Phase 1 committed | 2A, 2B, 2C-ii, 2C-iii |
| Phase 2C-ii (T-28..T-32) | Phase 1 committed | 2A, 2B, 2C-i, 2C-iii |
| Phase 2C-iii (T-33..T-37) | Phase 1 committed | 2A, 2B, 2C-i, 2C-ii |
| T-38 | All Phase 2 merged | — |

Within Phase 1: T-02, T-03, T-04, T-05, T-08 are parallel with each other (after T-01).

---

## Review Workload Forecast

> Delivery strategy: `ask-on-risk`. Budget: 800 lines (project-level override). Standard guard: 400 lines.

### Line Estimates by Area

| Slice / PR | Area | Estimated lines | Notes |
|------------|------|-----------------|-------|
| PR 1 — Phase 1 | Structural migration | **~800 add+delete / ~150 with rename detection** | Assumption: git counts file moves as full add+delete (no rename detection). With `git mv` + rename detection enabled: ~150 import-line changes + ~100 new files. Conservative estimate used for planning. |
| PR 2 — Phase 2A | Backend jwt-auth | ~310 | test_jwt_auth.py ~220 + security.py ~50 + database.py ~30 + config changes ~10 |
| PR 3 — Phase 2B | Middleware | ~230 | middleware.test.ts ~120 + decide.ts ~30 + middleware.spec.ts ~30 + middleware.ts ~50 |
| PR 4 — Phase 2C-i | Login form + api.ts | ~320 | api.test.ts ~60 + api.ts ~40 + login test ~140 + login form ~80 |
| PR 5 — Phase 2C-ii | Register + confirm | ~290 | register test ~80 + form ~80 + confirm test ~60 + page ~70 |
| PR 6 — Phase 2C-iii | Forgot + reset | ~300 | forgot test ~60 + page ~60 + reset test ~80 + page ~100 |
| **Total** | | **~2,250 lines (add+delete) / ~1,600 (rename detection)** | |

### Forecast

| Field | Value |
|-------|-------|
| **Chained PRs recommended** | **Yes** — 6 PRs minimum |
| **400-line budget risk** | **High** — Phase 1 exceeds 400 under add+delete counting; Phase 2C-i borderline at ~320 |
| **800-line budget risk** | **High** — full change is ~2,250 lines even when split; Phase 1 alone may hit 800 under worst-case counting |
| **Decision needed before apply** | **Yes** — Phase 1 structural migration requires `size:exception` or explicit approval (purely mechanical moves; no behavior change). All other PRs are within budget individually. |

### Recommended PR train

```
PR 1  feat(api): migrate layer-first → modular-monolith structure   [size:exception if needed]
PR 2  feat(api): ES256/JWKS JWT auth via PyJWKClient singleton
PR 3  feat(web): Edge middleware + decideAuth route guard
PR 4  feat(web): auth HTTP client + login form
PR 5  feat(web): register form + email confirm callback
PR 6  feat(web): forgot-password + reset callback
```

PRs 2–6 each stay within the 400-line standard budget and can be reviewed independently
by area. The `size:exception` label on PR 1 is motivated by its purely structural nature
(import paths, directory moves, no logic changes) and must be called out explicitly before
`sdd-apply` begins.
