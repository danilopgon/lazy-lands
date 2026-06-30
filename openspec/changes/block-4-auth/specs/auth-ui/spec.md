# Spec: auth-ui (revised — email confirmation + password recovery added)

**Change**: block-4-auth
**Capability**: `auth-ui` (new)
**Revised**: 2026-06-29 — Added email confirmation flow (AU-002 rewritten) and password
recovery flows (AU-004, AU-005, AU-006). See proposal amendment.

---

## Overview

Replace the static login and register placeholder pages with real forms backed by
Supabase email auth. Client-side validation uses `zod` + `react-hook-form` (both already
in `apps/web/package.json`). A thin HTTP client module injects the active JWT into every
request to the FastAPI backend.

Email confirmation is **enabled on hosted Supabase** (verified 2026-06-29). Registration
does NOT yield an immediate session; users must confirm their email first. Password
recovery follows the same email-based redirect pattern.

**Partition**: `auth-ui` owns all Supabase auth calls and page rendering. `session-management`
owns middleware route guards (which must allow the callback and recovery routes through
without a session check — see `session-management` spec).

---

## Functional requirements

### AU-001: Login form (`apps/web/app/login/page.tsx`)

The existing static placeholder MUST be replaced. The resulting page MUST contain:

#### AU-001.1: Form fields

| Field | Type | Validation rule |
|-------|------|-----------------|
| Email | `<input type="email">` | Required; must be a valid email format (zod `z.string().email()`) |
| Password | `<input type="password">` | Required; must be non-empty (zod `z.string().min(1)`) |

All validation MUST be enforced client-side on submit via `react-hook-form` + `zod`
before any Supabase call is made. Error messages MUST be visible in the DOM adjacent
to the corresponding field.

#### AU-001.2: Submit behavior

On submit with valid client-side input:
1. Call `supabase.auth.signInWithPassword({ email, password })`.
2. If the call succeeds (no `error` in response): redirect to `/dashboard`.
3. If the call returns an error: display the error message in the DOM; do NOT redirect.
   The form MUST remain interactive (user can correct and resubmit).

#### AU-001.3: Loading state

While `signInWithPassword` is in flight, the submit button MUST be disabled. A loading
indicator (text or spinner) MUST be visible.

#### Scenario: Successful login

- GIVEN the login form is rendered
- AND the user enters a valid registered email and correct password
- WHEN the form is submitted
- THEN `supabase.auth.signInWithPassword` is called
- AND on success the browser navigates to `/dashboard`

#### Scenario: Wrong credentials

- GIVEN the login form is rendered
- AND the user enters an incorrect password
- WHEN the form is submitted
- THEN an error message is visible in the DOM
- AND the user remains on the login page

#### Scenario: Empty email field

- GIVEN the email field is empty
- WHEN the form is submitted
- THEN a validation error for the email field is visible
- AND no Supabase call is made

#### Scenario: Empty password field

- GIVEN the password field is empty
- WHEN the form is submitted
- THEN a validation error for the password field is visible
- AND no Supabase call is made

#### Scenario: Invalid email format

- GIVEN the user enters `not-an-email` in the email field
- WHEN the form is submitted
- THEN a validation error indicating invalid email format is visible
- AND no Supabase call is made

---

### AU-002: Register form (`apps/web/app/register/page.tsx`)

The existing static placeholder MUST be replaced. **Email confirmation is required.**
Registration does NOT yield an immediate session.

#### AU-002.1: Form fields

| Field | Type | Validation rule |
|-------|------|-----------------|
| Email | `<input type="email">` | Required; must be a valid email format |
| Password | `<input type="password">` | Required; must be non-empty |

#### AU-002.2: Submit behavior

On submit with valid client-side input:
1. Call `supabase.auth.signUp({ email, password, options: { emailRedirectTo: <confirm_url> } })`.
   - `emailRedirectTo` MUST be constructed from `process.env.NEXT_PUBLIC_APP_URL` + `/auth/confirm`
     (e.g., `http://localhost:3000/auth/confirm` in development,
     `https://<vercel-domain>/auth/confirm` in production).
2. If the call succeeds (no `error` in response):
   - Do NOT redirect to `/dashboard`. A session is NOT yet active.
   - Display a "Check your email" confirmation message in the DOM.
   - The form MUST become non-interactive (prevent resubmit).
3. If the call returns an error (e.g., email already registered):
   - Display the error message in the DOM; do NOT change the non-interactive state.

> **Why not redirect**: With email confirmation enabled, `signUp` returns `{ data: { session: null, user: {...} } }`.
> The user must click the confirmation link before a session is established. Redirecting
> to `/dashboard` without a session would trigger the middleware guard.

#### AU-002.3: Loading state

Same loading state contract as AU-001.3.

#### Scenario: Successful registration initiation

- GIVEN the register form is rendered
- AND the user enters a new valid email and a non-empty password
- WHEN the form is submitted
- THEN `supabase.auth.signUp` is called with `emailRedirectTo` set to the confirm URL
- AND a "Check your email" message is visible in the DOM
- AND the user is NOT redirected to `/dashboard`

#### Scenario: Duplicate email

- GIVEN the user enters an email that is already registered
- WHEN the form is submitted
- THEN an error message is visible in the DOM
- AND the user remains on the register page

#### Scenario: Invalid email format

- GIVEN the user enters `not-an-email`
- WHEN the form is submitted
- THEN a validation error is visible and no Supabase call is made

---

### AU-003: HTTP client with TanStack Query (`apps/web/lib/api.ts`)

`apps/web/lib/api.ts` MUST be created. It MUST export an internal async function (named `apiFetch`
or equivalent) that wraps the native `fetch` API with the following behavior. This function is used
as the `queryFn` for TanStack Query mutations and queries.

**Important**: `apiFetch` is NOT exported publicly. Components use TanStack Query hooks
(`useMutation`, `useQuery`) instead of calling `apiFetch` directly.

#### AU-003.1: JWT injection

When a Supabase session is active (i.e., `supabase.auth.getSession()` returns a non-null
session with a non-null `access_token`):
- The function MUST add `Authorization: Bearer <access_token>` to the outgoing request headers.

When no session is active:
- The function MUST NOT add an `Authorization` header.

#### AU-003.2: Base URL

The function MUST prepend `process.env.NEXT_PUBLIC_API_URL` to relative URL paths
(paths starting with `/`). Absolute URLs MUST be passed through unchanged.

#### AU-003.3: No error swallowing

The function MUST NOT catch or transform HTTP error responses. 4xx/5xx responses
MUST be returned to the caller as-is so the caller can inspect the status.

#### AU-003.4: TanStack Query integration

The app MUST use `@tanstack/react-query` for data fetching. The `QueryClientProvider`
MUST be configured in `apps/web/app/layout.tsx`. Components MUST use `useMutation` and
`useQuery` hooks instead of calling `apiFetch` directly.

#### Scenario: Request with active session

- GIVEN a Supabase session exists with a valid `access_token`
- WHEN a TanStack Query mutation calls `apiFetch("/campaigns")` internally
- THEN the outgoing request includes `Authorization: Bearer <access_token>`

#### Scenario: Request without session

- GIVEN no Supabase session exists
- WHEN a TanStack Query mutation calls `apiFetch("/campaigns")` internally
- THEN the outgoing request does NOT include an `Authorization` header

---

### AU-004: Email confirmation callback (`apps/web/app/auth/confirm/page.tsx`)

`apps/web/app/auth/confirm/page.tsx` MUST be created. This page handles the redirect
from Supabase's confirmation email.

#### AU-004.1: URL parameter handling

The page MUST read `token_hash` and `type` from the URL search parameters.

#### AU-004.2: Token verification

On page mount (or `useEffect`), if `token_hash` and `type` are present:
1. Call `supabase.auth.verifyOtp({ token_hash, type })`.
2. If verification succeeds: redirect to `/dashboard` (session is now active).
3. If verification fails (expired, invalid, already used):
   - Display an error message explaining the link is invalid or expired.
   - Provide a link or button to `/register` so the user can restart.

If `token_hash` or `type` is absent from the URL:
- Display an error message indicating an invalid confirmation link.

#### AU-004.3: Loading state

While `verifyOtp` is in flight, a loading indicator MUST be visible. The page MUST NOT
flash content before the verification result is known.

#### Scenario: Valid confirmation link

- GIVEN the user clicks a confirmation email link
- AND the link redirects to `/auth/confirm?token_hash=<valid>&type=signup`
- WHEN the page mounts and calls `verifyOtp`
- THEN verification succeeds and the browser navigates to `/dashboard`

#### Scenario: Expired confirmation link

- GIVEN the user clicks a confirmation email link whose token has expired
- WHEN the page mounts and calls `verifyOtp`
- THEN an error message is visible explaining the link has expired
- AND a link to `/register` is present

#### Scenario: Missing token_hash in URL

- GIVEN the user navigates to `/auth/confirm` without `token_hash` in the URL
- THEN an error message is visible indicating an invalid link

---

### AU-005: Forgot password page (`apps/web/app/forgot-password/page.tsx`)

`apps/web/app/forgot-password/page.tsx` MUST be created.

#### AU-005.1: Form fields

| Field | Type | Validation rule |
|-------|------|-----------------|
| Email | `<input type="email">` | Required; valid email format |

#### AU-005.2: Submit behavior

On submit with valid input:
1. Call `supabase.auth.resetPasswordForEmail(email, { redirectTo: <reset_url> })`.
   - `redirectTo` MUST be constructed from `process.env.NEXT_PUBLIC_APP_URL` + `/auth/reset`.
2. Regardless of whether the email exists in Supabase (to prevent email enumeration):
   - Display a "If an account exists, a password reset email has been sent" message.
   - The form MUST become non-interactive.

> **Security note**: Do NOT display different messages for known vs. unknown emails.
> Supabase's `resetPasswordForEmail` does not indicate whether the email exists.

#### Scenario: Password reset email requested

- GIVEN the user submits a valid email on the forgot-password page
- WHEN the form is submitted
- THEN `supabase.auth.resetPasswordForEmail` is called with the email and `redirectTo`
- AND a confirmation message is displayed regardless of outcome
- AND the form becomes non-interactive

---

### AU-006: Password reset callback (`apps/web/app/auth/reset/page.tsx`)

`apps/web/app/auth/reset/page.tsx` MUST be created. This page handles the redirect from
Supabase's password-reset email.

#### AU-006.1: URL parameter handling and session establishment

On page mount, if `token_hash` and `type=recovery` are present in the URL:
1. Call `supabase.auth.verifyOtp({ token_hash, type: "recovery" })`.
2. If verification succeeds: a temporary recovery session is now active. Proceed to show
   the new password form (AU-006.2).
3. If verification fails (expired, invalid): display an error and a link to `/forgot-password`.

#### AU-006.2: New password form

After successful token verification, the page MUST display:

| Field | Type | Validation rule |
|-------|------|-----------------|
| New password | `<input type="password">` | Required; minimum 6 characters |
| Confirm password | `<input type="password">` | Required; must match new password |

#### AU-006.3: Password update submission

On submit with valid input:
1. Call `supabase.auth.updateUser({ password: newPassword })`.
2. On success: display a "Password updated" message and redirect to `/login` after a
   brief moment (or provide a link to `/login`).
3. On error: display the error message and keep the form interactive.

#### Scenario: Valid reset link and password update

- GIVEN the user clicks a password reset link
- AND the link redirects to `/auth/reset?token_hash=<valid>&type=recovery`
- WHEN the page mounts, verifyOtp succeeds, user enters a new password, and submits
- THEN `supabase.auth.updateUser` is called
- AND on success the user is directed to `/login`

#### Scenario: Expired reset link

- GIVEN the user clicks a password reset link whose token has expired
- WHEN `verifyOtp` is called on page mount
- THEN an error message is visible
- AND a link to `/forgot-password` is present

---

## Test requirements

### Strict TDD — tests before implementation

All tests MUST be written in a failing state before replacing the placeholder pages.

### Testability boundary

- Unit/integration tests (Vitest + RTL): mock all Supabase calls. No live Supabase or
  email sending. This satisfies NFR-GLOBAL-4.
- The actual email delivery and link-click round-trip is covered by the production
  smoke test (manual, Block 4 gate) and is NOT automatable in CI.

### Login form tests (Vitest + React Testing Library)

Location: `apps/web/app/login/__tests__/page.test.tsx` or equivalent.

| Test ID | Scenario covered |
|---------|-----------------|
| AU-T-01 | Empty email shows validation error; no Supabase call |
| AU-T-02 | Invalid email format shows validation error; no Supabase call |
| AU-T-03 | Empty password shows validation error; no Supabase call |
| AU-T-04 | Valid input calls `signInWithPassword` mock |
| AU-T-05 | Successful mock response navigates to `/dashboard` |
| AU-T-06 | Error mock response shows error message; no navigation |
| AU-T-07 | Submit button is disabled while request is in flight |

### Register form tests (Vitest + React Testing Library)

Location: `apps/web/app/register/__tests__/page.test.tsx` or equivalent.

| Test ID | Scenario covered |
|---------|-----------------|
| AU-T-08 | Invalid email format shows validation error; no Supabase call |
| AU-T-09 | Valid input calls `signUp` mock with `emailRedirectTo` set |
| AU-T-10 | Successful mock response shows "Check your email" message; no navigation to `/dashboard` |
| AU-T-11 | Error mock response shows error message; no navigation |

### Email confirmation page tests (Vitest + React Testing Library)

Location: `apps/web/app/auth/confirm/__tests__/page.test.tsx` or equivalent.

| Test ID | Scenario covered |
|---------|-----------------|
| AU-T-15 | Valid `token_hash` + `type` in URL → `verifyOtp` called → redirect to `/dashboard` |
| AU-T-16 | `verifyOtp` error → error message visible; link to `/register` present |
| AU-T-17 | Missing `token_hash` in URL → error message visible |

### Forgot password page tests (Vitest + React Testing Library)

Location: `apps/web/app/forgot-password/__tests__/page.test.tsx` or equivalent.

| Test ID | Scenario covered |
|---------|-----------------|
| AU-T-18 | Invalid email format shows validation error; no Supabase call |
| AU-T-19 | Valid email calls `resetPasswordForEmail` mock with correct `redirectTo` |
| AU-T-20 | After submission (success or failure): confirmation message shown; form non-interactive |

### Password reset page tests (Vitest + React Testing Library)

Location: `apps/web/app/auth/reset/__tests__/page.test.tsx` or equivalent.

| Test ID | Scenario covered |
|---------|-----------------|
| AU-T-21 | Valid `token_hash` + `type=recovery` → `verifyOtp` succeeds → new password form shown |
| AU-T-22 | `verifyOtp` error on mount → error message; link to `/forgot-password` |
| AU-T-23 | Password mismatch → validation error; no `updateUser` call |
| AU-T-24 | Valid new password submission → `updateUser` mock called → success message + `/login` navigation |

### HTTP client tests (Vitest)

Location: `apps/web/lib/__tests__/api.test.ts` or equivalent.

| Test ID | Scenario covered |
|---------|-----------------|
| AU-T-12 | With active session: `Authorization` header present and equals `Bearer <token>` |
| AU-T-13 | Without session: no `Authorization` header sent |
| AU-T-14 | Relative path prefixed with `NEXT_PUBLIC_API_URL` |

All Supabase calls MUST be mocked. No live Supabase instance required.

---

## Non-functional requirements

### NFR-AU-1: TypeScript

All new files MUST pass `pnpm typecheck` (`tsc --noEmit`) without errors.

### NFR-AU-2: Lint

All new files MUST pass `pnpm lint` (ESLint) without errors.

### NFR-AU-3: Client Components

Login, register, forgot-password, confirm, and reset pages MAY use the `"use client"`
directive since they manage form state and use the Supabase browser client. They MUST
NOT be Server Components if they use browser APIs.

### NFR-AU-4: Email enumeration prevention

The forgot-password page MUST display the same message regardless of whether the submitted
email is registered with Supabase (AU-005.2).

---

## Acceptance criteria

1. `apps/web/app/login/page.tsx` renders email + password fields and a submit button. (AU-001)
2. Login: empty email → validation error visible, no Supabase call. (AU-001.1)
3. Login: successful `signInWithPassword` → redirect to `/dashboard`. (AU-001.2)
4. Login: failed `signInWithPassword` → error message in DOM, no redirect. (AU-001.2)
5. Login: submit button disabled while request is in flight. (AU-001.3)
6. `apps/web/app/register/page.tsx` renders email + password fields and a submit button. (AU-002)
7. Register: successful `signUp` → "Check your email" message; NO redirect to `/dashboard`. (AU-002.2)
8. Register: `signUp` called with `emailRedirectTo` pointing to `/auth/confirm`. (AU-002.2)
9. Register: failed `signUp` → error message in DOM. (AU-002.2)
10. `apps/web/app/auth/confirm/page.tsx` exists; calls `verifyOtp` on mount; redirects to `/dashboard` on success. (AU-004)
11. Confirm page: expired/invalid token → error message + link to `/register`. (AU-004.2)
12. `apps/web/app/forgot-password/page.tsx` exists; calls `resetPasswordForEmail` with correct `redirectTo`; shows confirmation message. (AU-005)
13. `apps/web/app/auth/reset/page.tsx` exists; calls `verifyOtp` with `type: "recovery"` on mount; shows new password form on success. (AU-006)
14. Reset page: successful password update → `updateUser` called → directed to `/login`. (AU-006.3)
15. `apps/web/lib/api.ts` exists and contains an internal `apiFetch` function for TanStack Query. (AU-003)
16. With active session: `Authorization: Bearer <token>` header injected. (AU-003.1)
17. Without session: no `Authorization` header sent. (AU-003.1)
18. `@tanstack/react-query` is installed and `QueryClientProvider` is configured in `app/layout.tsx`. (AU-003.4)
19. All 24 Vitest test cases pass. (Test requirements)
20. `pnpm typecheck` and `pnpm lint` pass on all new/modified files. (NFR-AU-1, NFR-AU-2)
