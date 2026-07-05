# Code Documentation and Comment Conventions

Write code so readers understand the happy path without comments. Add comments and docstrings only when they preserve context that is not obvious from the code itself.

## Quick Rules

| Area | Convention |
| --- | --- |
| Inline comments | Explain why, tradeoffs, invariants, security constraints, or external behavior. |
| TypeScript/React JSDoc | Use for exported APIs whose contract is not obvious from types and names. |
| Python docstrings | Use for public modules, classes, functions, FastAPI dependencies, and non-obvious helpers. |
| Tests | Prefer descriptive test names. Add comments only for setup intent, spec traceability, or tricky assertions. |
| Tooling | Treat stricter doc rules as optional future enforcement unless the repo already configures them. |

## TypeScript and React JSDoc/TSDoc

### Required When

- An exported function, component, hook, or utility has behavior that is not obvious from its name and type signature.
- The API encodes framework behavior, security assumptions, external constraints, or a non-obvious invariant.
- A helper is intentionally pure, side-effectful, or environment-specific in a way future maintainers must preserve.
- A public type or prop has constraints that TypeScript cannot express clearly.

### Usually Not Required When

- The function is local to one file and has a clear name.
- Props and return types already describe the contract.
- The comment would restate implementation steps or duplicate the test name.

### Preferred Format

Use concise TSDoc-style blocks for exported APIs. Lead with the contract, then add constraints only when useful.

```ts
/**
 * Decides whether a request should continue or redirect to login.
 *
 * Kept pure so route protection can be tested without the Next.js Edge runtime.
 */
export function decideAuth(user: User | null, pathname: string) {
  // ...
}
```

For React components, document surprising behavior rather than visual intent that should live in names, props, or design docs.

```tsx
/**
 * Server-only campaign shell. Reads auth state from cookies and must not be
 * imported by client components.
 */
export async function CampaignShell() {
  // ...
}
```

### Avoid

```ts
// Check if the route is protected.
const isProtected = protectedRoutes.includes(pathname)
```

```tsx
/** Renders a button. */
export function Button() {
  // ...
}
```

## Python Docstrings

### Required When

- A public module, class, function, or FastAPI dependency is imported outside its file.
- A helper encapsulates security, persistence, network, async, or environment behavior.
- A function has side effects, failure modes, or constraints that are not obvious from the signature.
- Tests rely on a fixture or factory whose purpose is not obvious from its name.

### Usually Not Required When

- A private helper is short, local, and clearly named.
- The docstring would only list parameters already obvious from type hints.
- A test function name already states the scenario.

### Preferred Format

Use concise triple-quoted docstrings. Start with the purpose, then add important constraints or failure behavior.

```py
def _unauthorized() -> HTTPException:
    """Build a fresh 401 so exception causes are not shared across requests."""
    return HTTPException(status_code=status.HTTP_401_UNAUTHORIZED)
```

For longer public dependencies, use a short paragraph instead of verbose parameter sections unless they add real value.

```py
async def get_current_user(
    authorization: Annotated[str | None, Header()] = None,
) -> str:
    """
    Validate a Supabase ES256 JWT and return the user UUID.

    Every failure path raises HTTP 401 with ``WWW-Authenticate: Bearer`` so
    invalid credentials fail closed without leaking implementation details.
    """
```

### Avoid

```py
def get_campaign(campaign_id: str) -> Campaign:
    """Gets a campaign."""
```

```py
# Loop through campaigns.
for campaign in campaigns:
    ...
```

## Inline Comments

Inline comments are for context the code cannot carry safely on its own.

### Acceptable

```ts
// Supabase SSR requires middleware on page requests so it can refresh auth cookies.
export const config = { matcher: [/* ... */] }
```

```py
# Pydantic normalizes AnyHttpUrl with a trailing slash; strip it to keep the
# Supabase issuer exact and avoid rejecting valid JWTs.
issuer = f"{str(settings.supabase_url).rstrip('/')}/auth/v1"
```

```ts
// Server components cannot set cookies; middleware refreshes sessions.
cookies: { setAll() {} }
```

### Unacceptable

```ts
// Return redirect.
return 'redirect'
```

```py
# Create response.
response = client.get('/health')
```

```ts
// SM-T-01: unauthenticated request to protected route redirects.
it('SM-T-01: redirects unauthenticated user from /dashboard', () => {
  // ...
})
```

## Tooling Considerations

Do not add doc-comment enforcement by default. The current repo does not configure Ruff docstring rule families or eslint-plugin-jsdoc/TSDoc enforcement.

Future enforcement can be useful if comments start drifting again, but it should be introduced deliberately because broad docstring rules can create low-value boilerplate.

| Tool | Optional Future Use | Tradeoff |
| --- | --- | --- |
| Ruff `D` rules | Enforce selected Python docstring expectations. | Can force noisy docstrings on obvious private helpers unless scoped carefully. |
| Ruff `pydocstyle` conventions | Standardize docstring style. | Needs a convention choice and ignores for tests/private modules. |
| `eslint-plugin-jsdoc` | Enforce JSDoc syntax or require docs for selected exports. | Can conflict with TypeScript-first code if configured too broadly. |
| TSDoc validation | Keep exported API docs consistent. | Best reserved for package/public API surfaces, not every app component. |

If enforcement is added later, start narrow: public backend dependencies, exported frontend utilities, and exceptions for tests and internal components.
