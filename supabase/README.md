# Supabase Local Development

This folder contains the Block 0 Supabase scaffold for local Auth and PostgreSQL. Real schema migrations, RLS policies, and seed data start in Block 1.

## CLI

The Supabase CLI is installed as a root dev dependency and runs through pnpm:

```bash
pnpm supabase --version
```

## Start the local stack

Docker Desktop must be running before starting Supabase:

```bash
pnpm supabase start
```

After startup, copy the fake-development values from `pnpm supabase status` into a local `.env` file. Do not commit real keys.

Expected environment variable mapping:

```env
NEXT_PUBLIC_SUPABASE_URL=<API URL from supabase status>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key from supabase status>
SUPABASE_URL=<API URL from supabase status>
SUPABASE_ANON_KEY=<anon key from supabase status>
SUPABASE_SERVICE_ROLE_KEY=<service_role key from supabase status>
SUPABASE_JWT_SECRET=<JWT secret for local verification>
```

## Migrations and seed

- `migrations/.gitkeep` keeps the migrations directory in version control until Block 1 adds real SQL.
- `seed.sql` is intentionally a placeholder for local development seed data.
