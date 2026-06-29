# Design: Block 4 — Auth + Backend Structure Migration

## Technical Approach

Two ordered, separately-committed phases (NFR-RB-2): (1) mechanical layer-first → modular-monolith
migration (ADR-05), tests green on new import paths; (2) real auth — backend ES256/JWKS validation
(`jwt-auth`), frontend forms + callbacks (`auth-ui`), Edge middleware guard (`session-management`).
No business logic moves in phase 1. Auth uses asymmetric ES256/JWKS only — no shared secret anywhere.

## Architecture Decisions

### Decision 1 — Backend JWKS validation pattern

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Module-level `PyJWKClient` singleton in `shared/security.py` | Preserves key cache; matches fixture `monkeypatch.setattr("app.shared.security.jwks_client", ...)`; `PyJWKClient()` does **no** network at construction (safe at import) | **Chosen** |
| Per-request client | Re-fetches JWKS every call; violates NFR-JA-3 | Rejected |
| 503 on JWKS-down | Semantically truer for infra outage | Rejected — spec JA-002.5 mandates **401** for all failures (don't leak infra state) |

`get_current_user` lives in `shared/security.py` (transversal kernel, ADR-05 rule 3); re-exported from
`shared/dependencies.py`. **Trailing-slash guard (critical):** Pydantic v2 `str(AnyHttpUrl(...))`
normalizes with a trailing `/`. Derive once: `base = str(settings.supabase_url).rstrip("/")`, then
`jwks_uri = f"{base}/auth/v1/.well-known/jwks.json"` and `issuer = f"{base}/auth/v1"`. Skipping this
yields `//auth/v1` and rejects every valid token (would fail JA-T-01/JA-T-10). Key rotation: PyJWKClient
auto-refetches on unknown `kid`; failures caught → `HTTPException(401, headers={"WWW-Authenticate":"Bearer"})`.

### Decision 2 — Email confirmation & recovery flow (locked: verifyOtp + token_hash)

| Option | Tradeoff | Decision |
|--------|----------|----------|
| `verifyOtp({ token_hash, type })` in **client page components** | Matches `auth-ui` spec (AU-004/006) and all 24 Vitest/RTL tests; works cross-device; reset needs an interactive form anyway | **Chosen for BOTH flows** |
| PKCE `code` + `exchangeCodeForSession` in route handlers | @supabase/ssr default; but breaks RTL test matrix, can't render reset form, code-verifier missing on cross-device clicks | Rejected |

Both `/auth/confirm` and `/auth/reset` are `"use client"` page components calling the browser client's
`verifyOtp` on mount. **Requires** the dashboard email templates to emit `token_hash` links (not the
PKCE-default `?code`). `flowType` need not change — `verifyOtp(token_hash)` is independent of PKCE.
After success, use a hard navigation so the SSR middleware sees the freshly-written session cookie.

### Decision 3 — Local signing-key setup + middleware test harness

| Concern | Decision |
|---------|----------|
| ES256 keys reproducible | Documented cross-platform `package.json` script (no bash-only `.sh`) running `supabase gen signing-key --algorithm ES256 > supabase/signing_keys.json`; file in `.gitignore`; `signing_keys_path` uncommented in committed `config.toml`. Devs run script before `supabase start`. CI needs no keys — tests mock PyJWKClient. |
| Middleware testability | Extract pure `decideAuth(user, pathname) → "redirect" \| "passthrough"` (Vitest, plain inputs). `middleware()` is thin glue (`updateSession` → `getUser` → `NextResponse`); SM-T-01..07 call it directly with mocked SSR client. Real Edge behavior covered by Playwright — no `@edge-runtime/vm`. |

## Data Flow

    Login/Register page ──signInWithPassword/signUp──→ Supabase Auth ──email──→ /auth/{confirm,reset}
         │                                                                          │ verifyOtp(token_hash)
         └─ session cookie (@supabase/ssr) ──→ middleware.decideAuth ──→ /dashboard ┘
    Browser ──apiFetch(+Bearer)──→ FastAPI get_current_user ──JWKS(ES256)──→ sub (user id)

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `services/api/app/shared/{config,security,errors,logging,dependencies}.py`, `shared/database.py`, `shared/llm/{port,fake}.py` | Create | Kernel (moved from `core/`,`api/`,`domain/`,`infrastructure/`) + new `database.py` factory |
| `services/api/app/health/routes.py` | Create | Moved from `api/routes/health.py` |
| `services/api/app/{campaigns,sessions,memory,generation}/` | Create | Empty shells (domain/application/infrastructure) |
| `services/api/app/{core,api,application,domain,infrastructure,prompts}/` | Delete | Old layer-first layout |
| `services/api/app/main.py` | Modify | Imports → `app.shared.*` / `app.health.*` |
| `services/api/{pyproject.toml,package.json}` | Modify/Create | `pyjwt[crypto]`; Turborepo `dev` script |
| `apps/web/middleware.ts` + pure `decideAuth` module | Create | Session refresh + `/dashboard*` guard |
| `apps/web/app/{login,register}/page.tsx` | Modify | Real forms (react-hook-form + zod) |
| `apps/web/app/{auth/confirm,auth/reset,forgot-password}/page.tsx` | Create | verifyOtp callbacks + recovery form |
| `apps/web/lib/api.ts` | Create | fetch wrapper injecting `Bearer` token |

## Interfaces / Contracts

```python
# app/shared/security.py
jwks_client: PyJWKClient = PyJWKClient(f"{base}/auth/v1/.well-known/jwks.json")
async def get_current_user(authorization: str | None = Header(None)) -> str: ...  # returns sub
```
```ts
// apps/web/lib/auth/decide.ts
export function decideAuth(user: User | null, pathname: string): 'redirect' | 'passthrough'
```

## Testing Strategy

| Layer | What | Approach |
|-------|------|----------|
| Unit (pytest) | JA-T-01..11 | In-memory EC P-256 keypair; mock `jwks_client`; no network |
| Unit (Vitest/RTL) | AU-T-01..24, SM-T-01..07 | Mock Supabase calls; `decideAuth` pure tests |
| E2E (Playwright) | Edge middleware glue | Real `/dashboard` redirect |
| Manual smoke | Block-4 gate | Deployed Vercel + Railway + hosted Supabase |

## Migration / Rollout

Phase-1 commit (structural) then phase-2 commit(s) (auth). Rollback = git revert per phase. Breaking
config change: `supabase_jwt_secret` removed from `Settings` (JA-005) and Railway. No data migration.

## Open Questions

- None blocking. Confirm `PyJWKClient` `cache_keys`/`lifespan` kwargs against installed PyJWT at apply.
