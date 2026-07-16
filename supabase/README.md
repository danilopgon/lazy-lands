# Supabase Local Development

This folder contains the local Supabase configuration, schema migrations, row-level security
policies, and seed utilities used by Lazy Lands.

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
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<publishable key from supabase status>
SUPABASE_URL=<API URL from supabase status>
SUPABASE_PUBLISHABLE_KEY=<publishable key from supabase status>
SUPABASE_SERVICE_ROLE_KEY=<service_role key from supabase status>
```

If `pnpm supabase start` fails with `failed to read signing keys`, generate them
from the repo root:

```bash
pnpm setup:keys
```

This creates `supabase/signing_keys.json` (gitignored) with the correct format.

## Local Auth smoke testing

Use the local Supabase URL and local publishable key for auth smoke tests. If the
frontend still points to hosted Supabase, real inboxes can receive recovery
emails.

1. Start Supabase:

   ```bash
   pnpm supabase start
   ```

2. Copy the local values into `apps/web/.env.local`:

   ```env
   NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<local publishable key>
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

3. Restart the frontend dev server so Next.js reloads the env vars.
4. Request a password reset in the local app.
5. Open Mailpit at <http://127.0.0.1:54324> and inspect the recovery email.

Do not use the API gateway as the inbox. Opening <http://127.0.0.1:54321> or the
wrong path can return `{"message":"no Route matched with those values"}`; Mailpit
is available at <http://127.0.0.1:54324>.

## Migrations and seed

- `migrations/` contains the versioned schema and RLS migrations.
- `seed.sql` provides local development seed data where required.
