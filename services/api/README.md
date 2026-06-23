# Lazy Lands API

FastAPI scaffold for the Lazy Lands backend. Block 0 provides Clean Architecture boundaries and smoke-testable entry points only; campaign, memory, and generation features are implemented in later blocks.

## Requirements

- Python 3.12
- uv

## Environment

Use fake local values for Block 0:

```env
APP_ENV=development
API_CORS_ORIGINS=http://localhost:3000
SUPABASE_URL=http://localhost:54321
SUPABASE_ANON_KEY=fake-key
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_JWT_SECRET=
LLM_PROVIDER=fake
```

## Install

```bash
uv sync
```

## Run

```bash
uv run uvicorn app.main:app --reload
```

## Test and quality

```bash
uv run pytest
uv run ruff check app/ tests/
uv run ruff format --check app/ tests/
uv run mypy app/
```

`mypy` is currently non-blocking for Block 0; record findings and keep the scaffold runnable.
