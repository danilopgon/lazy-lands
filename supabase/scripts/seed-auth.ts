import { pathToFileURL } from 'node:url'

import { createClient } from '@supabase/supabase-js'

export const FIXED_UUID = '00000000-0000-0000-0000-000000000001'
export const SEED_EMAIL = 'dm@lazylands.test'
export const SEED_PASSWORD = 'lazy-lands-dev-password'

export interface SeedAuthOptions {
  dryRun: boolean
}

type AdminClient = {
  auth: {
    admin: {
      getUserById: (
        id: string
      ) => Promise<{ data?: { user?: unknown | null }; error?: unknown }>
      createUser: (params: {
        id: string
        email: string
        password: string
        email_confirm: boolean
      }) => Promise<{ error?: { message?: string } | null }>
    }
  }
}

export interface SeedAuthDeps {
  url: string | undefined
  serviceRoleKey: string | undefined
  createClientFn?: typeof createClient
  log?: (message: string) => void
}

export function parseArgs(argv: string[]): SeedAuthOptions {
  return { dryRun: argv.includes('--dry-run') }
}

function isExecutedDirectly(): boolean {
  const entrypoint = process.argv[1]

  if (!entrypoint) {
    return false
  }

  return import.meta.url === pathToFileURL(entrypoint).href
}

function validateCredentials(
  deps: SeedAuthDeps
): asserts deps is SeedAuthDeps & {
  url: string
  serviceRoleKey: string
} {
  if (!deps.url) {
    throw new Error(
      'seed-auth: SUPABASE_URL must be set unless --dry-run is used'
    )
  }

  if (!deps.serviceRoleKey) {
    throw new Error(
      'seed-auth: SUPABASE_SERVICE_ROLE_KEY must be set unless --dry-run is used'
    )
  }
}

function createSeedUserParams() {
  return {
    id: FIXED_UUID,
    email: SEED_EMAIL,
    password: SEED_PASSWORD,
    email_confirm: true,
  }
}

function isNotFoundError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false
  }

  const status = 'status' in error ? error.status : undefined
  const message = 'message' in error ? String(error.message).toLowerCase() : ''

  return status === 404 || message.includes('not found')
}

export async function seedAuthUser(
  options: SeedAuthOptions,
  deps: SeedAuthDeps
): Promise<void> {
  const log = deps.log ?? console.log
  const params = createSeedUserParams()

  if (options.dryRun) {
    log(
      `[dry-run] would create auth user id=${params.id} email=${params.email} email_confirm=true`
    )
    return
  }

  validateCredentials(deps)

  const client = (deps.createClientFn ?? createClient)(
    deps.url,
    deps.serviceRoleKey,
    {
      auth: { autoRefreshToken: false, persistSession: false },
    }
  ) as AdminClient

  const existing = await client.auth.admin.getUserById(FIXED_UUID)

  if (existing.data?.user) {
    log(`seed-auth: user ${FIXED_UUID} already exists; skipping createUser`)
    return
  }

  if (existing.error && !isNotFoundError(existing.error)) {
    const message =
      typeof existing.error === 'object' &&
      existing.error !== null &&
      'message' in existing.error
        ? String(existing.error.message)
        : String(existing.error)
    throw new Error(`seed-auth: getUserById failed: ${message}`)
  }

  const { error } = await client.auth.admin.createUser(params)

  if (error) {
    throw new Error(
      `seed-auth: createUser failed: ${error.message ?? String(error)}`
    )
  }

  log(`seed-auth: created auth user ${SEED_EMAIL} (${FIXED_UUID})`)
}

async function main(): Promise<void> {
  await seedAuthUser(parseArgs(process.argv.slice(2)), {
    url: process.env.SUPABASE_URL,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  })
}

if (isExecutedDirectly()) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error)
    process.exit(1)
  })
}
