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
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { seedAuthUser, type SeedAuthDeps } from './seed-auth'

const FIXED_UUID = '00000000-0000-0000-0000-000000000001'

/**
 * Build mocked Admin client factory returning the provided admin surface.
 * Keeps tests under the ≤3-mock hygiene threshold (one createClientFn mock,
 * optionally one createUser mock and one getUserById mock per test).
 */
function makeCreateClientFn(admin: {
  createUser?: ReturnType<typeof vi.fn>
  getUserById?: ReturnType<typeof vi.fn>
}): ReturnType<typeof vi.fn> {
  return vi.fn().mockReturnValue({
    auth: { admin },
  }) as unknown as ReturnType<typeof vi.fn>
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

  // (d) Normal path: getUserById says "no user", createUser called once with the
  // pinned UUID + email_confirm:true.
  it('(d) calls createUser once with { id: FIXED_UUID, email_confirm: true } when no user exists', async () => {
    const createUser = vi
      .fn()
      .mockResolvedValue({ data: { user: { id: FIXED_UUID } }, error: null })
    const getUserById = vi
      .fn()
      .mockResolvedValue({ data: { user: null }, error: null })
    const createClientFn = makeCreateClientFn({ createUser, getUserById })

    await seedAuthUser({ dryRun: false }, {
      url: 'http://localhost:54321',
      serviceRoleKey: 'service-role-key',
      createClientFn,
      log: () => {},
    } satisfies SeedAuthDeps)

    expect(getUserById).toHaveBeenCalledWith(FIXED_UUID)
    expect(createUser).toHaveBeenCalledTimes(1)
    expect(createUser).toHaveBeenCalledWith(
      expect.objectContaining({
        id: FIXED_UUID,
        email_confirm: true,
      })
    )
  })

  // (e) Idempotency guard: getUserById returns an existing user → createUser
  // is NOT called and a skip message is logged.
  it('(e) skips createUser and logs a skip when the user already exists', async () => {
    const createUser = vi.fn()
    const getUserById = vi
      .fn()
      .mockResolvedValue({ data: { user: { id: FIXED_UUID } }, error: null })
    const createClientFn = makeCreateClientFn({ createUser, getUserById })

    await seedAuthUser({ dryRun: false }, {
      url: 'http://localhost:54321',
      serviceRoleKey: 'service-role-key',
      createClientFn,
      log: (m: string) => logs.push(m),
    } satisfies SeedAuthDeps)

    expect(getUserById).toHaveBeenCalledWith(FIXED_UUID)
    expect(createUser).not.toHaveBeenCalled()
    const output = logs.join('\n')
    expect(output.toLowerCase()).toMatch(/skip|already exists/)
  })
})
