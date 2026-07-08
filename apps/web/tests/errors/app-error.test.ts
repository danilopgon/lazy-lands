import { describe, expect, it } from 'vitest'

import {
  normalizeBackendResponseError,
  normalizeUnknownError,
  normalizeSupabaseAuthError,
} from '@/lib/errors/app-error'

describe('app error normalization', () => {
  it('maps Supabase invalid_credentials by code to the invalid credentials translation key', () => {
    const error = normalizeSupabaseAuthError({
      code: 'invalid_credentials',
      message: 'Invalid login credentials',
      status: 400,
    })

    expect(error).toMatchObject({
      code: 'auth.invalidCredentials',
      status: 400,
      source: 'supabase-auth',
      retryable: false,
      messageKey: 'auth.invalidCredentials',
    })
    expect(error.message).toBe('Errors.auth.invalidCredentials')
  })

  it('maps the runtime invalid_credentials payload without status to the invalid credentials translation key', () => {
    const error = normalizeSupabaseAuthError({
      code: 'invalid_credentials',
      message: 'Invalid login credentials',
    })

    expect(error).toMatchObject({
      code: 'auth.invalidCredentials',
      source: 'supabase-auth',
      retryable: false,
      messageKey: 'auth.invalidCredentials',
    })
    expect(error.status).toBeUndefined()
    expect(error.message).toBe('Errors.auth.invalidCredentials')
  })

  it('maps unknown Supabase auth errors to the generic auth fallback key', () => {
    const error = normalizeSupabaseAuthError({
      code: 'unexpected_provider_error',
      message: 'Provider exploded',
      status: 500,
    })

    expect(error).toMatchObject({
      code: 'auth.generic',
      status: 500,
      source: 'supabase-auth',
      retryable: true,
      messageKey: 'auth.generic',
    })
    expect(error.message).not.toContain('Provider exploded')
  })

  it('maps backend 404 bodies with { error } to the not-found translation key', async () => {
    const error = await normalizeBackendResponseError(
      new Response(JSON.stringify({ error: 'Not found.' }), { status: 404 })
    )

    expect(error).toMatchObject({
      code: 'notFound',
      status: 404,
      source: 'backend',
      retryable: false,
      messageKey: 'notFound',
    })
    expect(error.message).not.toContain('Not found.')
  })

  it('maps FastAPI validation detail arrays to validation without using raw msg as UI copy', async () => {
    const error = await normalizeBackendResponseError(
      new Response(
        JSON.stringify({
          detail: [{ msg: 'Field required', loc: ['body', 'title'] }],
        }),
        { status: 422 }
      )
    )

    expect(error).toMatchObject({
      code: 'validation',
      status: 422,
      source: 'backend',
      retryable: false,
      messageKey: 'validation',
    })
    expect(error.message).not.toContain('Field required')
  })

  it('maps network and unknown failures to the generic fallback key', () => {
    const error = normalizeUnknownError(new Error('Failed to fetch'))

    expect(error).toMatchObject({
      code: 'unknown',
      source: 'network',
      retryable: true,
      messageKey: 'fallback',
    })
    expect(error.message).not.toContain('Failed to fetch')
  })

  it('maps Supabase email_not_confirmed by code to the email-not-confirmed translation key', () => {
    const error = normalizeSupabaseAuthError({
      code: 'email_not_confirmed',
      message: 'Email not confirmed',
      status: 400,
    })

    expect(error).toMatchObject({
      code: 'auth.emailNotConfirmed',
      status: 400,
      source: 'supabase-auth',
      retryable: false,
      messageKey: 'auth.emailNotConfirmed',
    })
    expect(error.message).toBe('Errors.auth.emailNotConfirmed')
  })

  it('maps backend 429 responses to the generic backend key with retryable=true', async () => {
    const error = await normalizeBackendResponseError(
      new Response(JSON.stringify({ error: 'Too many requests.' }), {
        status: 429,
      })
    )

    expect(error).toMatchObject({
      code: 'backend.generic',
      status: 429,
      source: 'backend',
      retryable: true,
      messageKey: 'backend.generic',
    })
  })

  it('maps backend 5xx responses to the generic backend key with retryable=true', async () => {
    const error = await normalizeBackendResponseError(
      new Response(JSON.stringify({ error: 'Internal server error.' }), {
        status: 500,
      })
    )

    expect(error).toMatchObject({
      code: 'backend.generic',
      status: 500,
      source: 'backend',
      retryable: true,
      messageKey: 'backend.generic',
    })
  })

  it('honors an explicit body.retryable=true override even when the status is normally non-retryable', async () => {
    const error = await normalizeBackendResponseError(
      new Response(JSON.stringify({ error: 'Conflict.', retryable: true }), {
        status: 409,
      })
    )

    expect(error).toMatchObject({
      code: 'backend.generic',
      status: 409,
      source: 'backend',
      retryable: true,
      messageKey: 'backend.generic',
    })
  })

  it('falls back to status-based retryable when the backend body is not valid JSON', async () => {
    const error = await normalizeBackendResponseError(
      new Response('<html><body>Bad Gateway</body></html>', {
        status: 502,
        headers: { 'Content-Type': 'text/html' },
      })
    )

    expect(error).toMatchObject({
      code: 'backend.generic',
      status: 502,
      source: 'backend',
      retryable: true,
      messageKey: 'backend.generic',
    })
    expect(error.message).not.toContain('Bad Gateway')
  })

  it('classifies a non-Error thrown value as source=unknown', () => {
    const error = normalizeUnknownError('a thrown string is not an Error')

    expect(error).toMatchObject({
      code: 'unknown',
      source: 'unknown',
      retryable: true,
      messageKey: 'fallback',
    })
  })
})
