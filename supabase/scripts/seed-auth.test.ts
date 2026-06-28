/**
 * Unit tests for supabase/scripts/seed-auth.ts.
 *
 * Strict-TDD Phase 1 (RED): written BEFORE seed-auth.ts exists. Vitest fails
 * at module import (`./seed-auth` does not exist) until Phase 3 implements it.
 *
 * No live Supabase stack required: the Admin client is injected via `deps`
 * (createClientFn + log), so every test stubs the Admin API surface
 * (auth.admin.createUser / auth.admin.getUserById) with vi.fn().
 *
 * Cases (numbered to match tasks.md T-05 (a)–(e)).
 */
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  FIXED_UUID,
  loadRootEnv,
  seedAuthUser,
  type SeedAuthDeps,
} from './seed-auth'

/**
 * Build mocked Admin client factory returning the provided admin surface.
 * Keeps tests under the ≤3-mock hygiene threshold (one createClientFn mock,
 * optionally one createUser mock and one getUserById mock per test).
 */
function makeCreateClientFn(admin: {
  createUser?: ReturnType<typeof vi.fn>
  getUserById?: ReturnType<typeof vi.fn>
  from?: ReturnType<typeof vi.fn>
}): ReturnType<typeof vi.fn> {
  return vi.fn().mockReturnValue({
    auth: { admin },
    from: admin.from,
  }) as unknown as ReturnType<typeof vi.fn>
}

function makeSeedDataFromFn(): ReturnType<typeof vi.fn> {
  const insert = vi.fn().mockResolvedValue({ error: null })
  const select = vi.fn().mockReturnValue({
    eq: vi.fn().mockReturnValue({
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    }),
  })

  return vi.fn().mockImplementation(() => ({ select, insert }))
}

describe('seed-auth', () => {
  let logs: string[]

  beforeEach(() => {
    logs = []
  })

  // (a) dry-run makes no API call and logs the intended pinned-UUID create.
  it('(a) dry-run logs the pinned UUID + email_confirm=true and does NOT call createUser', async () => {
    const createUser = vi.fn()
    const createClientFn = makeCreateClientFn({ createUser })

    await seedAuthUser({ dryRun: true }, {
      url: undefined,
      serviceRoleKey: undefined,
      createClientFn,
      log: (m: string) => logs.push(m),
    } satisfies SeedAuthDeps)

    expect(createClientFn).not.toHaveBeenCalled()
    expect(createUser).not.toHaveBeenCalled()
    const output = logs.join('\n')
    expect(output).toContain('[dry-run]')
    expect(output).toContain(FIXED_UUID)
    expect(output).toContain('email_confirm=true')
  })

  // (b) Missing SUPABASE_URL (no --dry-run) → throws descriptive error.
  it('(b) throws a descriptive error when SUPABASE_URL is missing', async () => {
    await expect(
      seedAuthUser({ dryRun: false }, {
        url: undefined,
        serviceRoleKey: 'service-role-key',
        log: () => {},
      } satisfies SeedAuthDeps)
    ).rejects.toThrow(/SUPABASE_URL/)
  })

  // (c) Missing SUPABASE_SERVICE_ROLE_KEY (no --dry-run) → throws descriptive error.
  it('(c) throws a descriptive error when SUPABASE_SERVICE_ROLE_KEY is missing', async () => {
    await expect(
      seedAuthUser({ dryRun: false }, {
        url: 'http://localhost:54321',
        serviceRoleKey: undefined,
        log: () => {},
      } satisfies SeedAuthDeps)
    ).rejects.toThrow(/SUPABASE_SERVICE_ROLE_KEY/)
  })

  it('throws a descriptive error when SUPABASE_SEED_PASSWORD is missing', async () => {
    await expect(
      seedAuthUser({ dryRun: false }, {
        url: 'http://localhost:54321',
        serviceRoleKey: 'service-role-key',
        seedPassword: undefined,
        log: () => {},
      } satisfies SeedAuthDeps)
    ).rejects.toThrow(/SUPABASE_SEED_PASSWORD/)
  })

  // (d) Normal path: getUserById says "no user", createUser called once with the
  // pinned UUID + email_confirm:true.
  it('(d) calls createUser once with { id: FIXED_UUID, email_confirm: true } when no user exists', async () => {
    const createUser = vi
      .fn()
      .mockResolvedValue({ data: { user: { id: FIXED_UUID } }, error: null })
    const getUserById = vi
      .fn()
      .mockResolvedValue({ data: { user: null }, error: null })
    const from = makeSeedDataFromFn()
    const createClientFn = makeCreateClientFn({ createUser, getUserById, from })

    await seedAuthUser({ dryRun: false }, {
      url: 'http://localhost:54321',
      serviceRoleKey: 'service-role-key',
      seedPassword: 'test-password',
      createClientFn,
      log: () => {},
    } satisfies SeedAuthDeps)

    expect(getUserById).toHaveBeenCalledWith(FIXED_UUID)
    expect(createUser).toHaveBeenCalledTimes(1)
    expect(createUser).toHaveBeenCalledWith(
      expect.objectContaining({
        id: FIXED_UUID,
        password: 'test-password',
        email_confirm: true,
      })
    )
  })

  it('rejects remote Supabase URLs before creating a client', async () => {
    const createUser = vi.fn()
    const getUserById = vi.fn()
    const createClientFn = makeCreateClientFn({ createUser, getUserById })

    await expect(
      seedAuthUser({ dryRun: false }, {
        url: 'https://example.supabase.co',
        serviceRoleKey: 'service-role-key',
        seedPassword: 'test-password',
        createClientFn,
        log: () => {},
      } satisfies SeedAuthDeps)
    ).rejects.toThrow(/local Supabase URL/)

    expect(createClientFn).not.toHaveBeenCalled()
    expect(getUserById).not.toHaveBeenCalled()
    expect(createUser).not.toHaveBeenCalled()
  })

  it('rejects invalid Supabase URLs clearly before creating a client', async () => {
    const createClientFn = makeCreateClientFn({})

    await expect(
      seedAuthUser({ dryRun: false }, {
        url: 'not a valid url',
        serviceRoleKey: 'service-role-key',
        seedPassword: 'test-password',
        createClientFn,
        log: () => {},
      } satisfies SeedAuthDeps)
    ).rejects.toThrow(/valid URL/)

    expect(createClientFn).not.toHaveBeenCalled()
  })

  // (e) Idempotency guard: getUserById returns an existing user → createUser
  // is NOT called and a skip message is logged.
  it('(e) skips createUser and logs a skip when the user already exists', async () => {
    const createUser = vi.fn()
    const getUserById = vi
      .fn()
      .mockResolvedValue({ data: { user: { id: FIXED_UUID } }, error: null })
    const from = makeSeedDataFromFn()
    const createClientFn = makeCreateClientFn({ createUser, getUserById, from })

    await seedAuthUser({ dryRun: false }, {
      url: 'http://localhost:54321',
      serviceRoleKey: 'service-role-key',
      seedPassword: 'test-password',
      createClientFn,
      log: (m: string) => logs.push(m),
    } satisfies SeedAuthDeps)

    expect(getUserById).toHaveBeenCalledWith(FIXED_UUID)
    expect(createUser).not.toHaveBeenCalled()
    expect(from).toHaveBeenCalledWith('campaigns')
    expect(from).toHaveBeenCalledWith('sessions')
    const output = logs.join('\n')
    expect(output.toLowerCase()).toMatch(/skip|already exists/)
  })

  it('creates deterministic campaign and sessions after creating the auth user', async () => {
    const createUser = vi.fn().mockResolvedValue({ error: null })
    const getUserById = vi
      .fn()
      .mockResolvedValue({ data: { user: null }, error: null })
    const from = makeSeedDataFromFn()
    const createClientFn = makeCreateClientFn({ createUser, getUserById, from })

    await seedAuthUser({ dryRun: false }, {
      url: 'http://localhost:54321',
      serviceRoleKey: 'service-role-key',
      seedPassword: 'test-password',
      createClientFn,
      log: () => {},
    } satisfies SeedAuthDeps)

    expect(from).toHaveBeenCalledWith('campaigns')
    expect(from).toHaveBeenCalledWith('sessions')
  })

  it('loads root .env values without overriding existing process env values', () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'lazy-lands-seed-auth-'))
    const previousUrl = process.env.SUPABASE_URL
    const previousPassword = process.env.SUPABASE_SEED_PASSWORD

    process.env.SUPABASE_URL = 'http://existing.localhost:54321'
    delete process.env.SUPABASE_SEED_PASSWORD

    try {
      writeFileSync(
        join(tempDir, '.env'),
        [
          'SUPABASE_URL=http://from-env.localhost:54321',
          'SUPABASE_SEED_PASSWORD=from-env-file',
        ].join('\n')
      )

      loadRootEnv(tempDir)

      expect(process.env.SUPABASE_URL).toBe('http://existing.localhost:54321')
      expect(process.env.SUPABASE_SEED_PASSWORD).toBe('from-env-file')
    } finally {
      if (previousUrl === undefined) {
        delete process.env.SUPABASE_URL
      } else {
        process.env.SUPABASE_URL = previousUrl
      }

      if (previousPassword === undefined) {
        delete process.env.SUPABASE_SEED_PASSWORD
      } else {
        process.env.SUPABASE_SEED_PASSWORD = previousPassword
      }

      rmSync(tempDir, { recursive: true, force: true })
    }
  })
})
