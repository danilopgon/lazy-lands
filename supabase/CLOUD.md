# Supabase Cloud Migration Runbook

This runbook describes how Lazy Lands keeps the local Supabase schema and the hosted Supabase
project in sync.

## Principles

- **Migrations are source-controlled.** Schema changes must be committed under
  `supabase/migrations/` and reviewed in pull requests.
- **Cloud schema changes are applied by CI/CD.** Manual `supabase db push` is allowed only for
  controlled bootstrap or emergency recovery.
- **Supabase Studio is inspect-only for schema.** Do not hand-edit tables, policies, functions,
  or grants in the hosted dashboard.
- **Local seed data is local-only.** Do not push `supabase/seed.sql` to the hosted project.
- **Dev auth seeding is local-only.** Do not run `pnpm supabase:seed-auth` against hosted
  Supabase projects.

## Prerequisites

- Docker Desktop running for the local Supabase stack.
- Supabase CLI available through the root dev dependency:

  ```bash
  pnpm supabase --version
  ```

- A hosted Supabase project reference. Find it in:

  ```text
  Supabase Dashboard -> Project Settings -> General -> Reference ID
  ```

- CI/CD secrets configured in the protected deployment environment when cloud pushes are
  automated. At minimum, the pipeline needs a Supabase access token and the target project ref.

## One-time local link

Developers may link their local workspace for inspection and dry runs:

```bash
pnpm supabase login
pnpm supabase link --project-ref <project-ref>
```

This link must not turn the developer machine into the normal deployment mechanism. The target
state is CI/CD-controlled migration deployment.

## Local migration workflow

Create each schema change as a migration file:

```bash
pnpm supabase migration new <change_name>
```

Edit the generated file under `supabase/migrations/`, then verify against a clean local stack:

```bash
pnpm supabase start
pnpm supabase:reset
uv run pytest tests/test_schema.py tests/test_rls.py -v
pnpm --filter supabase test
```

Commit the migration and related tests/docs in the same pull request.

## Cloud migration workflow

After a migration PR merges to `main`, CI/CD should apply pending migrations to the hosted
project.

Recommended deployment sequence:

```bash
pnpm install --frozen-lockfile
pnpm supabase link --project-ref "$SUPABASE_PROJECT_REF"
pnpm supabase db push --dry-run
pnpm supabase db push
```

Use a protected deployment environment for the real `db push`. For example, GitHub Actions can
require manual approval before the production environment step runs. This keeps the execution
repeatable while preserving human control over hosted database changes.

## Manual push policy

Manual cloud pushes are not the default workflow.

Allowed cases:

- Initial bootstrap before CI/CD exists.
- Emergency recovery with an explicit maintainer decision.
- Debugging a deployment failure, preferably using `--dry-run` first.

When a manual push is needed, run:

```bash
pnpm supabase db push --dry-run
pnpm supabase db push
```

Record the reason in the PR, issue, or release notes.

## Seed policy

The local deterministic data workflow is local-only. `supabase db reset` runs
`supabase/seed.sql`, which intentionally contains no campaign/session rows because the fixed local
auth user does not exist yet. After reset, `pnpm supabase:seed-auth` creates or detects that auth
user and then inserts the deterministic local campaign and sessions for tests and developer
onboarding.

Do not apply local seed data to the hosted project:

```bash
# Do not use this for hosted deployment unless explicitly approved.
pnpm supabase db push --include-seed
```

The default cloud workflow must apply migrations only.

## Auth user policy

`pnpm supabase:seed-auth` is local-only. The script requires
`SUPABASE_SEED_PASSWORD` from the environment and has a technical guard that rejects non-local
`SUPABASE_URL` values.

For hosted projects:

- Do not run `pnpm supabase:seed-auth`.
- Do not create users with any local development seed password.
- Create any required demo user through the Supabase dashboard or a future cloud-specific
  provisioning script that uses a real, rotated password.
- Store cloud secrets only in the deployment platform's secret manager, never in Git.

## Rollback

Do not edit or delete already-applied migration files to roll back a hosted database. Instead,
create a new reverting migration:

```bash
pnpm supabase migration new revert_<change_name>
```

For this initial schema, a destructive rollback is acceptable only while the hosted project has
no real campaign data. The revert order is:

1. Drop RLS policies.
2. Drop child tables and then parent tables, using `cascade` only when deliberately safe.
3. Drop enum types.

Then deploy the rollback migration through the same cloud workflow:

```bash
pnpm supabase db push --dry-run
pnpm supabase db push
```

Once real user data exists, every rollback must include a data-safety plan and should avoid
destructive operations unless explicitly approved.

## Current status

This repository does not yet include the CI/CD workflow that performs `supabase db push`.
Until that workflow exists, any cloud push is a controlled manual bootstrap step. Implementing
the protected CI/CD migration deployment is planned for the next block, alongside the login and
hosted-auth work.
