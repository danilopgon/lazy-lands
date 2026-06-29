# Spec: repository-bootstrap (block-4-auth delta)

> **Note (2026-06-29)**: The migration of `config.py` includes removing the
> `supabase_jwt_secret` field. JWT validation now uses JWKS (ES256), making the
> shared secret unnecessary. This removal is part of the structural migration, but
> the requirement is owned by the `jwt-auth` spec (JA-005). The migration MUST NOT
> introduce the JWT validation logic — per NFR-RB-2, auth logic lands in a
> separate commit after the structural migration is complete.

**Change**: block-4-auth
**Capability**: `repository-bootstrap` (modified)
**Spec type**: Delta — extends the bootstrap established in `supabase-setup`

---

## Overview

Migrate the FastAPI backend from a layer-first directory structure (`core/`, `api/`,
`application/`, `domain/`, `infrastructure/`, `prompts/`) to a modular monolith
(`shared/` kernel + `health/` module + empty feature shells). All existing tests and
lint rules MUST pass after the migration. Turborepo integration is added so `pnpm dev`
launches both Next.js (`:3000`) and FastAPI (`:8000`).

---

## Functional requirements

### RB-001: `app/shared/` kernel

`services/api/app/shared/` MUST be created containing exactly these modules:

| Module | Source | Notes |
|--------|--------|-------|
| `__init__.py` | New | Empty |
| `config.py` | Moved from `core/config.py` | Import paths updated |
| `security.py` | Moved from `core/security.py` | Stub replaced with real ES256/JWKS JWT (see `jwt-auth` spec) |
| `errors.py` | Moved from `core/errors.py` | Import paths updated |
| `logging.py` | Moved from `core/logging.py` | Import paths updated |
| `database.py` | New | Supabase client factory (see `jwt-auth` spec) |
| `dependencies.py` | Moved from `api/dependencies.py` | Re-exports `get_current_user` from `shared.security` |
| `llm/__init__.py` | New | Aggregates LLM port + implementation |
| `llm/port.py` | Moved from `domain/ports/llm.py` | Same interface |
| `llm/fake.py` | Moved from `infrastructure/llm/fake.py` | Same implementation |

`main.py` MUST import all symbols from `app.shared.*`; no import from `app.core.*` or
`app.api.*` or `app.domain.*` or `app.infrastructure.*` MUST remain.

#### Scenario: Shared kernel is importable

- GIVEN the migration is complete
- WHEN `from app.shared.config import settings` is executed in a Python context
- THEN the import succeeds without `ModuleNotFoundError`

---

### RB-002: `app/health/` module

`services/api/app/health/` MUST contain:

| File | Source |
|------|--------|
| `__init__.py` | New (empty) |
| `routes.py` | Moved from `api/routes/health.py` |

`main.py` MUST register the health router via `from app.health.routes import router`.

#### Scenario: Health endpoint still responds

- GIVEN the backend is running on the new structure
- WHEN `GET /health` is called without any Authorization header
- THEN the response is HTTP 200

---

### RB-003: Empty feature module shells

`services/api/app/` MUST contain exactly these new module directories, each with the
following subdirectory tree:

```
<module>/
  __init__.py
  domain/
    __init__.py
  application/
    __init__.py
  infrastructure/
    __init__.py
```

Modules: `campaigns/`, `sessions/`, `memory/`, `generation/`.

These shells MUST contain no business logic — they are scaffolding for future blocks.
No router from these modules MUST be registered in `main.py`.

---

### RB-004: Remove old directories

After the migration all of the following directories MUST NOT exist under
`services/api/app/`:

- `core/`
- `api/`
- `application/` (top-level, not the one inside feature shells)
- `domain/` (top-level)
- `infrastructure/` (top-level)
- `prompts/`

#### Scenario: Old directory paths are gone

- GIVEN the migration commit has been applied
- WHEN the file system under `services/api/app/` is listed
- THEN none of `core/`, `api/`, `application/`, `domain/`, `infrastructure/`, `prompts/`
  exist at the top level of `services/api/app/`

---

### RB-005: All existing tests pass on new import paths

`services/api/tests/` MUST be updated to reflect new import paths. Every test file that
imports from `app.core.*`, `app.api.*`, `app.domain.*`, or `app.infrastructure.*` MUST be
updated to import from `app.shared.*` or `app.health.*` as appropriate.

`pytest` MUST exit 0 with all tests passing after the migration.
`ruff check app/` MUST report zero violations after the migration.

#### Scenario: Full test suite green after migration

- GIVEN all old directories are deleted and `shared/` + `health/` are in place
- WHEN `uv run pytest` is executed from `services/api/`
- THEN all tests pass and the exit code is 0

#### Scenario: Ruff passes on new structure

- GIVEN the migration is complete
- WHEN `uv run ruff check app/` is executed from `services/api/`
- THEN zero violations are reported

---

### RB-006: Turborepo dev integration

`services/api/package.json` MUST exist and contain:

```json
{
  "name": "api",
  "scripts": {
    "dev": "uv run uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"
  }
}
```

When `pnpm dev` is executed from the monorepo root, Turborepo MUST start both the
Next.js dev server on port `:3000` and the FastAPI server on port `:8000`.

#### Scenario: pnpm dev starts both servers

- GIVEN `services/api/package.json` exists with a `dev` script
- WHEN `pnpm dev` is executed from the monorepo root
- THEN Next.js starts on `:3000` AND FastAPI starts on `:8000`

---

## Non-functional requirements

### NFR-RB-1: Strict TDD compliance

All import-path tests MUST be updated (not deleted) before the migration is executed.
The test suite MUST be in a failing state during the migration and MUST return to passing
only after the migration is complete.

### NFR-RB-2: No logic changes during migration

The migration is purely structural. No business logic, no new behavior MUST be introduced
in the same commit(s) as the directory move. Auth implementation (JWT validation) is a
separate commit.

---

## Acceptance criteria

1. `services/api/app/shared/` exists with all 8 modules listed in RB-001. (RB-001)
2. `services/api/app/health/routes.py` exists and exposes a router. (RB-002)
3. `GET /health` returns HTTP 200 after the migration. (RB-002)
4. `campaigns/`, `sessions/`, `memory/`, `generation/` exist under `app/` with `domain/`, `application/`, `infrastructure/` subdirectories. (RB-003)
5. `core/`, `api/`, `application/` (top-level), `domain/` (top-level), `infrastructure/` (top-level), `prompts/` do NOT exist under `services/api/app/`. (RB-004)
6. `uv run pytest` exits 0 with all tests passing. (RB-005)
7. `uv run ruff check app/` reports zero violations. (RB-005)
8. `services/api/package.json` exists with a `dev` script that starts uvicorn. (RB-006)
9. `pnpm dev` from the monorepo root launches both Next.js and FastAPI. (RB-006)
