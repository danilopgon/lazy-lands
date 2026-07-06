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

## Endpoints (campaigns module)

All routes require a valid Supabase JWT and are scoped to the caller by RLS.
See `docs/06-api-contracts.md` for full request/response contracts.

| Method & path                 | Purpose                                                                           |
| ----------------------------- | --------------------------------------------------------------------------------- |
| `POST /campaigns/extract`     | Stateless: extract a campaign scaffold from free text.                            |
| `POST /campaigns`             | Persist a reviewed campaign (+ NPCs/factions/arcs).                               |
| `GET /campaigns`              | List the caller's campaigns (with system/tone + child counts).                    |
| `GET /campaigns/{id}`         | Campaign detail with NPCs, factions and arcs.                                     |
| `PATCH /campaigns/{id}`       | Partial edit of `world_state`/`system`/`tone`.                                    |
| `POST/PATCH/DELETE /npcs`     | Create / edit / delete an NPC (`campaign_id` in the body).                        |
| `POST/PATCH/DELETE /factions` | Create / edit / delete a faction.                                                 |
| `POST/PATCH/DELETE /arcs`     | Create / edit / delete an arc (status codes `active/dormant/resolved/discarded`). |

Manual creates force `content_source = "manual"` and 404 on a non-owned
`campaign_id`; PATCH returns 422 on an empty patch and 404 on an RLS miss.
