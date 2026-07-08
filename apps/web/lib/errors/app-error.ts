export type AppErrorSource = 'supabase-auth' | 'backend' | 'network' | 'unknown'

export type AppErrorCode =
  | 'auth.invalidCredentials'
  | 'auth.emailNotConfirmed'
  | 'auth.generic'
  | 'auth.registerGeneric'
  | 'auth.confirmGeneric'
  | 'auth.resetGeneric'
  | 'notFound'
  | 'validation'
  | 'backend.generic'
  | 'unknown'

/**
 * Known messageKeys backed by the `Errors` catalog in `messages/*.json`.
 * Kept separate from `AppErrorCode` because some keys (`fallback`) have no
 * matching code and some codes (`unknown`) have no dedicated message key.
 */
export type AppMessageKey =
  | 'fallback'
  | 'notFound'
  | 'validation'
  | 'backend.generic'
  | 'auth.invalidCredentials'
  | 'auth.emailNotConfirmed'
  | 'auth.generic'
  | 'auth.registerGeneric'
  | 'auth.confirmGeneric'
  | 'auth.resetGeneric'

export type AppErrorOptions = {
  code: AppErrorCode
  status?: number
  source: AppErrorSource
  retryable: boolean
  messageKey: AppMessageKey
}

type SupabaseAuthLikeError = {
  code?: unknown
  message?: unknown
  status?: unknown
}

type BackendErrorBody = {
  code?: unknown
  error?: unknown
  detail?: unknown
  retryable?: unknown
}

const AUTH_ERROR_BY_CODE = new Map<string, AppErrorOptions>([
  [
    'invalid_credentials',
    {
      code: 'auth.invalidCredentials',
      source: 'supabase-auth',
      retryable: false,
      messageKey: 'auth.invalidCredentials',
    },
  ],
  [
    'email_not_confirmed',
    {
      code: 'auth.emailNotConfirmed',
      source: 'supabase-auth',
      retryable: false,
      messageKey: 'auth.emailNotConfirmed',
    },
  ],
])

/**
 * Stable frontend error used by UI code to render localized copy from message
 * catalogs instead of backend/Supabase raw strings.
 */
export class AppError extends Error {
  readonly code: AppErrorCode
  readonly status?: number
  readonly source: AppErrorSource
  readonly retryable: boolean
  readonly messageKey: AppMessageKey

  /**
   * Create an application error from stable UI-safe error metadata.
   * @param {AppErrorOptions} options - Normalized error metadata.
   */
  constructor(options: AppErrorOptions) {
    super(`Errors.${options.messageKey}`)
    this.name = 'AppError'
    this.code = options.code
    this.status = options.status
    this.source = options.source
    this.retryable = options.retryable
    this.messageKey = options.messageKey
  }
}

/**
 * Normalize a Supabase Auth error by stable `code`, never by display message.
 * @param {SupabaseAuthLikeError} error - Supabase Auth error-like object.
 * @param {Pick<AppErrorOptions, 'code' | 'messageKey'>} fallback - Optional caller-specific fallback key.
 * @returns {AppError} UI-safe normalized app error.
 */
export function normalizeSupabaseAuthError(
  error: SupabaseAuthLikeError,
  fallback: Pick<AppErrorOptions, 'code' | 'messageKey'> = {
    code: 'auth.generic',
    messageKey: 'auth.generic',
  }
): AppError {
  const code = typeof error.code === 'string' ? error.code : undefined
  const status = typeof error.status === 'number' ? error.status : undefined
  const mapped = code ? AUTH_ERROR_BY_CODE.get(code) : undefined

  if (mapped) {
    return new AppError({ ...mapped, status })
  }

  return new AppError({
    code: fallback.code,
    status,
    source: 'supabase-auth',
    retryable: !status || status >= 500,
    messageKey: fallback.messageKey,
  })
}

/**
 * Normalize a non-2xx backend response into a localization key and metadata.
 * @param {Response} response - Failed backend response.
 * @returns {Promise<AppError>} UI-safe normalized app error.
 */
export async function normalizeBackendResponseError(
  response: Response
): Promise<AppError> {
  const body = await readBackendErrorBody(response)

  if (response.status === 404) {
    return new AppError({
      code: 'notFound',
      status: response.status,
      source: 'backend',
      retryable: false,
      messageKey: 'notFound',
    })
  }

  if (response.status === 422 || hasValidationDetail(body?.detail)) {
    return new AppError({
      code: 'validation',
      status: response.status,
      source: 'backend',
      retryable: false,
      messageKey: 'validation',
    })
  }

  return new AppError({
    code: 'backend.generic',
    status: response.status,
    source: 'backend',
    retryable: resolveRetryable(body, response.status),
    messageKey: 'backend.generic',
  })
}

/**
 * Normalize thrown/network failures that do not have structured response data.
 * @param {unknown} error - Thrown value.
 * @param {Pick<AppErrorOptions, 'code' | 'messageKey'>} fallback - Optional caller-specific fallback key.
 * @returns {AppError} UI-safe normalized app error.
 */
export function normalizeUnknownError(
  error: unknown,
  fallback: Pick<AppErrorOptions, 'code' | 'messageKey'> = {
    code: 'unknown',
    messageKey: 'fallback',
  }
): AppError {
  const source = error instanceof Error ? 'network' : 'unknown'

  return new AppError({
    code: fallback.code,
    source,
    retryable: true,
    messageKey: fallback.messageKey,
  })
}

/**
 * Safely parse a backend JSON error body.
 * @param {Response} response - Failed backend response.
 * @returns {Promise<BackendErrorBody | null>} Parsed body or null for non-JSON bodies.
 */
async function readBackendErrorBody(
  response: Response
): Promise<BackendErrorBody | null> {
  try {
    const body: unknown = await response.json()
    return body && typeof body === 'object' ? (body as BackendErrorBody) : null
  } catch {
    return null
  }
}

/**
 * Detect FastAPI/Pydantic validation payloads.
 * @param {unknown} detail - Backend `detail` field.
 * @returns {boolean} True when the detail looks like a validation array.
 */
function hasValidationDetail(detail: unknown): boolean {
  return Array.isArray(detail)
}

/**
 * Resolve retryability from backend metadata or HTTP status.
 * @param {BackendErrorBody | null} body - Parsed backend error body.
 * @param {number} status - HTTP status code.
 * @returns {boolean} Whether retrying is likely useful.
 */
function resolveRetryable(
  body: BackendErrorBody | null,
  status: number
): boolean {
  if (typeof body?.retryable === 'boolean') return body.retryable
  return status === 429 || status >= 500
}
