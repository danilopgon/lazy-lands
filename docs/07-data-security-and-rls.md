# Data, Security and RLS

## Authentication

Lazy Lands uses Supabase Auth.

The frontend authenticates the user and obtains a Supabase JWT.

FastAPI validates the JWT for protected backend operations.

## Authorization model

All campaign data belongs to a single user.

Ownership is enforced through:

- `user_id` on `campaigns`.
- Campaign-scoped child entities.
- A database FK from `campaigns.user_id` to `auth.users(id)`.
- A composite FK from `memory_facts(campaign_id, source_session_id)` to
  `sessions(campaign_id, id)`, preventing a memory fact from linking to a
  session in another campaign.
- Supabase Row Level Security.
- Backend ownership checks before operations.

## Tables

### `campaigns`

Suggested fields:

- `id uuid primary key`
- `user_id uuid not null`
- `title text not null`
- `description text`
- `world_state text`
- `accumulated_summary text`
- `summarized_up_to_session integer`
- `created_at timestamptz`
- `updated_at timestamptz`

### `npcs`

Suggested fields:

- `id uuid primary key`
- `campaign_id uuid references campaigns(id)`
- `name text not null`
- `description text`
- `current_state text`
- `motivation text`
- `content_source text`
- `created_at timestamptz`
- `updated_at timestamptz`

### `factions`

Suggested fields:

- `id uuid primary key`
- `campaign_id uuid references campaigns(id)`
- `name text not null`
- `description text`
- `current_stance text`
- `goals text`
- `content_source text`
- `created_at timestamptz`
- `updated_at timestamptz`

### `arcs`

Suggested fields:

- `id uuid primary key`
- `campaign_id uuid references campaigns(id)`
- `title text not null`
- `description text`
- `status text`
- `priority text`
- `created_at timestamptz`
- `updated_at timestamptz`

### `sessions`

Suggested fields:

- `id uuid primary key`
- `campaign_id uuid references campaigns(id)`
- `session_number integer not null`
- `summary text`
- `consequences text`
- `generated_content jsonb`
- `trace_json jsonb`
- `created_at timestamptz`
- `updated_at timestamptz`

### `memory_facts`

Suggested fields:

- `id uuid primary key`
- `campaign_id uuid references campaigns(id)`
- `source_session_id uuid` nullable, constrained with `campaign_id` to reference
  a session in the same campaign
- `content text not null`
- `type text`
- `importance text`
- `status text`
- `created_at timestamptz`
- `updated_at timestamptz`

## RLS requirements

RLS must be enabled on:

- `campaigns`
- `npcs`
- `factions`
- `arcs`
- `sessions`
- `memory_facts`

## Ownership rules

A user can only read campaigns where:

```sql
campaigns.user_id = auth.uid()
```

A user can only read child entities when their parent campaign belongs to that user.

Example child ownership logic:

```sql
exists (
  select 1
  from campaigns
  where campaigns.id = child_table.campaign_id
  and campaigns.user_id = auth.uid()
)
```

## Security rules

- Never trust frontend campaign ids.
- Always validate ownership in backend use cases.
- Never persist invalid LLM output.
- Never log full prompts in production.
- Never log full campaign content in production.
- Avoid exposing whether an entity exists if the user does not own it.
- Use generic errors for unauthorized access.

## Test requirements

Minimum security checks:

- User A cannot list campaigns from User B.
- User A cannot read User B's campaign detail.
- User A cannot create a session in User B's campaign.
- User A cannot accept a memory fact for User B's campaign.
- Invalid JWT is rejected.
- Missing JWT is rejected.
- Expired session redirects or shows clear feedback.
