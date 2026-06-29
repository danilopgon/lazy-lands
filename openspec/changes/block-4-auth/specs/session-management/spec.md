# Spec: session-management (revised — new public routes added, smoke test updated)

**Change**: block-4-auth
**Capability**: `session-management` (new)
**Revised**: 2026-06-29 — Added `/auth/confirm`, `/auth/reset`, `/forgot-password` to
public allow-list. Updated smoke test to reflect email confirmation flow and ES256/JWKS
(no JWT secret on Railway). See proposal amendment.

---

## Overview

Add a Next.js middleware file at `apps/web/middleware.ts` that refreshes Supabase session
cookies on every matched request and redirects unauthenticated users away from protected
routes. The `updateSession()` helper at `apps/web/lib/supabase/middleware.ts` already
exists from a prior block; this spec wires it into the actual Next.js middleware entry
point.

**Partition**: `session-management` owns route guards and session refresh. `auth-ui` owns
Supabase auth calls and page rendering. The email confirmation and password reset callback
routes (`/auth/confirm`, `/auth/reset`, `/forgot-password`) MUST be public — they are
reached before a session exists.

---

## Functional requirements

### SM-001: Middleware file exists

`apps/web/middleware.ts` MUST exist at the Next.js app root (peer of `app/`, not inside it).

---

### SM-002: Session refresh on every matched request

The middleware MUST call `updateSession(request)` (imported from
`apps/web/lib/supabase/middleware.ts`) on every request that matches the route matcher.
`updateSession` handles Supabase cookie refresh and returns a `NextResponse`. The
middleware MUST return this response (or a redirect derived from it).

Session refresh MUST happen before any ownership check or route guard so that
`supabase.auth.getUser()` inside the middleware reflects the current token state.

---

### SM-003: Route matcher — protected routes

The middleware `config.matcher` MUST match:

| Pattern | Reason |
|---------|--------|
| `/dashboard` | Primary authenticated entry point in this block |
| `/dashboard/:path*` | All sub-paths under `/dashboard` |

The matcher MAY also exclude Next.js internal paths (`_next/static`, `_next/image`,
`favicon.ico`) for performance. It MUST NOT match static asset paths in a way that
breaks image or CSS loading.

---

### SM-004: Public routes are not blocked

The middleware MUST NOT redirect any of the following routes regardless of auth state:

| Route | Reason |
|-------|--------|
| `/` | Landing page |
| `/login` | Login form |
| `/register` | Registration form |
| `/forgot-password` | Password reset request (no session yet) |
| `/auth/confirm` | Email confirmation callback (no session yet) |
| `/auth/reset` | Password reset callback (recovery session established here) |
| `/privacy` | Static legal page |
| `/cookies` | Static legal page |

These routes MUST be either excluded from the matcher or explicitly allowed through when
the session check is performed. Not including them risks infinite redirect loops (e.g.,
`/auth/confirm` redirected to `/login` before the session is established, making email
confirmation impossible).

---

### SM-005: Unauthenticated redirect

After `updateSession` runs, the middleware MUST inspect whether a valid user session
exists (using `supabase.auth.getUser()` or the session returned by `updateSession`).

If no valid session exists AND the request path matches a protected route:
- The middleware MUST respond with an HTTP 302 redirect to `/login`.
- The redirect MUST use a `NextResponse.redirect` call.

---

### SM-006: Authenticated pass-through

If a valid session exists AND the request path matches a protected route:
- The middleware MUST allow the request to proceed (return the `updateSession` response
  without issuing a redirect).

---

### SM-007: Session cookies refreshed in response

When `updateSession` performs a token refresh, the updated `Set-Cookie` headers MUST be
present on the middleware response. The Next.js `cookies()` API MUST reflect the
refreshed token on the next server-side render.

---

## Test requirements

### Strict TDD — tests before implementation

Tests MUST be written in a failing state before `middleware.ts` is created.

### Auth-decision function — pure unit test pattern

To avoid the `@edge-runtime/vm` mocking complexity, the auth decision logic (session
check → redirect or pass-through) SHOULD be extracted into a pure function that takes
the user object (or null) and the request URL as inputs and returns the intended action
(`redirect | passthrough`). This function is unit-testable with plain inputs.

The Edge glue (calling `updateSession`, calling `getUser`, building `NextResponse`) is
covered by the Playwright E2E smoke test, not by Vitest unit tests.

### Middleware unit tests (Vitest)

Location: `apps/web/middleware.test.ts` or equivalent.

The Supabase client and `updateSession` MUST be mocked. `NextRequest` is constructible
from a URL string without a live Next.js runtime.

| Test ID | Setup | Expected behavior |
|---------|-------|-------------------|
| SM-T-01 | No session; request to `/dashboard` | Response is a redirect to `/login` |
| SM-T-02 | Valid session; request to `/dashboard` | No redirect; response passes through |
| SM-T-03 | No session; request to `/` (public) | No redirect |
| SM-T-04 | No session; request to `/login` | No redirect |
| SM-T-05 | Expired token that can be refreshed; request to `/dashboard` | Refreshed cookie headers present; no redirect |
| SM-T-06 | No session; request to `/auth/confirm` | No redirect (public route) |
| SM-T-07 | No session; request to `/auth/reset` | No redirect (public route) |

#### Scenario: Unauthenticated visit to `/dashboard`

- GIVEN no valid Supabase session cookie is present
- WHEN the middleware processes `GET /dashboard`
- THEN the response is HTTP 302 redirecting to `/login`

#### Scenario: Authenticated visit to `/dashboard`

- GIVEN a valid Supabase session cookie is present
- WHEN the middleware processes `GET /dashboard`
- THEN the response proceeds to the dashboard page (no redirect)

#### Scenario: Unauthenticated visit to `/auth/confirm` (email callback)

- GIVEN no valid Supabase session cookie is present
- WHEN the middleware processes `GET /auth/confirm?token_hash=<hash>&type=signup`
- THEN the response proceeds without redirect (route is public)

#### Scenario: Unauthenticated visit to `/auth/reset` (password reset callback)

- GIVEN no valid Supabase session cookie is present
- WHEN the middleware processes `GET /auth/reset?token_hash=<hash>&type=recovery`
- THEN the response proceeds without redirect (route is public)

#### Scenario: Unauthenticated visit to `/login` (no redirect loop)

- GIVEN no valid Supabase session cookie is present
- WHEN the middleware processes `GET /login`
- THEN the response proceeds without redirect

---

## Non-functional requirements

### NFR-SM-1: SSR compatibility

The middleware runs in the Next.js Edge Runtime. It MUST use the `@supabase/ssr`
package (`createServerClient` with cookie handlers) and MUST NOT use the browser
Supabase client.

### NFR-SM-2: No redirect loops

The middleware MUST NOT redirect `/login`, `/auth/confirm`, or `/auth/reset` to `/login`.
The matcher or explicit path check MUST prevent this for all public routes listed in SM-004.

### NFR-SM-3: TypeScript

`middleware.ts` MUST pass `pnpm typecheck` without errors.

---

## Acceptance criteria

1. `apps/web/middleware.ts` exists at the app root. (SM-001)
2. Middleware calls `updateSession` on every matched request. (SM-002)
3. Middleware `config.matcher` includes `/dashboard` and `/dashboard/:path*`. (SM-003)
4. Public routes (`/`, `/login`, `/register`, `/forgot-password`, `/auth/confirm`, `/auth/reset`, `/privacy`, `/cookies`) are not redirected. (SM-004)
5. Unauthenticated request to `/dashboard` → 302 redirect to `/login`. (SM-005)
6. Authenticated request to `/dashboard` → proceeds without redirect. (SM-006)
7. Refreshed session cookies are present on the response when a refresh occurs. (SM-007)
8. All 7 Vitest test cases pass without a live Supabase instance. (Test requirements)
9. `pnpm typecheck` passes on `middleware.ts`. (NFR-SM-3)
10. No redirect loop is possible from `/login`, `/auth/confirm`, or `/auth/reset`. (NFR-SM-2)

---

## Production smoke test (manual — Block 4 gate)

The following scenarios MUST be verified manually against the deployed environment
(Vercel frontend + Railway backend + hosted Supabase) before Block 4 is closed.

> **Note (2026-06-29 revision)**: The backend no longer requires `SUPABASE_JWT_SECRET`
> on Railway. JWT validation uses JWKS (ES256) derived from `SUPABASE_URL`. Smoke test
> pre-conditions updated accordingly.

### Pre-conditions

| Requirement | Where |
|-------------|-------|
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` set | Railway backend |
| `API_CORS_ORIGINS=<vercel-domain>` set | Railway backend |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` set | Vercel frontend |
| `NEXT_PUBLIC_API_URL=<railway-backend-url>` set | Vercel frontend |
| `NEXT_PUBLIC_APP_URL=<vercel-domain>` set | Vercel frontend |
| Supabase dashboard: Auth → URL configuration lists `/auth/confirm` and `/auth/reset` redirect URLs | Hosted Supabase |
| Supabase dashboard: Email confirmation is enabled | Hosted Supabase |
| A real (non-seed) test email address is available (must receive actual emails) | Tester |

### Smoke scenarios

| Step | Action | Expected result |
|------|--------|-----------------|
| 1 | Navigate to Vercel frontend root `/` | Landing page loads, no errors |
| 2 | Navigate to `/dashboard` while unauthenticated | Redirect to `/login` |
| 3 | Navigate to `/register` and submit a new email + password | "Check your email" message shown; no redirect to `/dashboard` |
| 4 | Open confirmation email and click the link | Browser opens `/auth/confirm?token_hash=...&type=signup`; page calls `verifyOtp`; redirect to `/dashboard` |
| 5 | While logged in, navigate to `/dashboard` | Dashboard loads; no redirect |
| 6 | Log out | Session cleared; redirect to `/login` or `/` |
| 7 | Log in again via `/login` with registered credentials | Session restored; redirect to `/dashboard` |
| 8 | Inspect browser DevTools — Network tab | `Authorization: Bearer <token>` header present on any API call from the frontend |
| 9 | Inspect Railway backend logs | JWT validation succeeds (ES256/JWKS); no 401 on authenticated requests |
| 10 | Navigate to `/forgot-password` and submit the test email | Confirmation message shown |
| 11 | Open password reset email and click the link | Browser opens `/auth/reset?token_hash=...&type=recovery`; new password form shown |
| 12 | Submit a new password | `updateUser` called; directed to `/login`; old password no longer works; new password works |

### CORS verification

- GIVEN the Vercel frontend makes a request to the Railway backend
- WHEN the browser preflight (`OPTIONS`) request is sent
- THEN the Railway backend responds with `Access-Control-Allow-Origin: <vercel-domain>`
  and the actual request is not blocked

The `API_CORS_ORIGINS` env var on Railway MUST include the Vercel deployment URL.
