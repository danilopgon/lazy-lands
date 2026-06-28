import { pathToFileURL } from 'node:url'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { createClient } from '@supabase/supabase-js'

export const FIXED_UUID = '00000000-0000-0000-0000-000000000001'
export const SEED_EMAIL = 'dm@lazylands.test'
export const SEED_CAMPAIGN_ID = '10000000-0000-0000-0000-000000000001'
export const SEED_SESSION_ONE_ID = '20000000-0000-0000-0000-000000000001'
export const SEED_SESSION_TWO_ID = '20000000-0000-0000-0000-000000000002'

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
  from: (table: string) => {
    select: (columns: string) => {
      eq: (
        column: string,
        value: string
      ) => {
        maybeSingle: () => Promise<{
          data?: unknown | null
          error?: { message?: string } | null
        }>
      }
    }
    insert: (
      values: unknown
    ) => Promise<{ error?: { message?: string } | null }>
  }
}

export interface SeedAuthDeps {
  url: string | undefined
  serviceRoleKey: string | undefined
  seedPassword?: string | undefined
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
  seedPassword: string
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

  if (!deps.seedPassword) {
    throw new Error(
      'seed-auth: SUPABASE_SEED_PASSWORD must be set unless --dry-run is used'
    )
  }
}

function assertLocalSupabaseUrl(url: string): void {
  let parsed: URL

  try {
    parsed = new URL(url)
  } catch {
    throw new Error('seed-auth: SUPABASE_URL must be a valid URL')
  }

  const hostname = parsed.hostname.toLowerCase()
  const localHostnames = new Set(['localhost', '127.0.0.1', '::1', '[::1]'])

  if (!localHostnames.has(hostname)) {
    throw new Error(
      'seed-auth: SUPABASE_URL must be a local Supabase URL ' +
        '(localhost, 127.0.0.1, or ::1) when --dry-run is not used; ' +
        `refusing remote host ${parsed.hostname}`
    )
  }
}

function createSeedUserParams(seedPassword: string) {
  return {
    id: FIXED_UUID,
    email: SEED_EMAIL,
    password: seedPassword,
    email_confirm: true,
  }
}

function parseDotenvLine(line: string): [string, string] | null {
  const trimmed = line.trim()

  if (!trimmed || trimmed.startsWith('#')) {
    return null
  }

  const withoutExport = trimmed.startsWith('export ')
    ? trimmed.slice('export '.length).trim()
    : trimmed
  const separator = withoutExport.indexOf('=')

  if (separator <= 0) {
    return null
  }

  const key = withoutExport.slice(0, separator).trim()
  let value = withoutExport.slice(separator + 1).trim()

  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1)
  }

  return [key, value]
}

export function loadRootEnv(rootDir = process.cwd()): void {
  const envPath = resolve(rootDir, '.env')

  if (!existsSync(envPath)) {
    return
  }

  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const parsed = parseDotenvLine(line)

    if (!parsed) {
      continue
    }

    const [key, value] = parsed

    if (process.env[key] === undefined) {
      process.env[key] = value
    }
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

  if (options.dryRun) {
    log(
      `[dry-run] would create auth user id=${FIXED_UUID} email=${SEED_EMAIL} email_confirm=true`
    )
    log(
      '[dry-run] SUPABASE_SEED_PASSWORD is required for non-dry-run execution but is not printed'
    )
    log(
      `[dry-run] would seed campaign id=${SEED_CAMPAIGN_ID} and 2 sessions after the auth user exists`
    )
    return
  }

  validateCredentials(deps)
  assertLocalSupabaseUrl(deps.url)
  const params = createSeedUserParams(deps.seedPassword)

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
    await seedCampaignData(client, log)
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
  await seedCampaignData(client, log)
}

async function ensureRow(
  client: AdminClient,
  table: string,
  id: string,
  values: unknown,
  log: (message: string) => void
): Promise<void> {
  const existing = await client
    .from(table)
    .select('id')
    .eq('id', id)
    .maybeSingle()

  if (existing.error) {
    throw new Error(
      `seed-auth: ${table} lookup failed: ${
        existing.error.message ?? String(existing.error)
      }`
    )
  }

  if (existing.data) {
    log(`seed-auth: ${table} ${id} already exists; skipping insert`)
    return
  }

  const inserted = await client.from(table).insert(values)

  if (inserted.error) {
    throw new Error(
      `seed-auth: ${table} insert failed: ${
        inserted.error.message ?? String(inserted.error)
      }`
    )
  }
}

async function seedCampaignData(
  client: AdminClient,
  log: (message: string) => void
): Promise<void> {
  await ensureRow(
    client,
    'campaigns',
    SEED_CAMPAIGN_ID,
    {
      id: SEED_CAMPAIGN_ID,
      user_id: FIXED_UUID,
      title: 'Dev Campaign',
    },
    log
  )

  await ensureRow(
    client,
    'sessions',
    SEED_SESSION_ONE_ID,
    {
      id: SEED_SESSION_ONE_ID,
      campaign_id: SEED_CAMPAIGN_ID,
      session_number: 1,
    },
    log
  )

  await ensureRow(
    client,
    'sessions',
    SEED_SESSION_TWO_ID,
    {
      id: SEED_SESSION_TWO_ID,
      campaign_id: SEED_CAMPAIGN_ID,
      session_number: 2,
    },
    log
  )
}

async function main(): Promise<void> {
  loadRootEnv()
  await seedAuthUser(parseArgs(process.argv.slice(2)), {
    url: process.env.SUPABASE_URL,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    seedPassword: process.env.SUPABASE_SEED_PASSWORD,
  })
}

if (isExecutedDirectly()) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error)
    process.exit(1)
  })
}
