'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import type { EmailOtpType } from '@supabase/supabase-js'

import { Link } from '@/i18n/navigation'
import { useAppLocale } from '@/i18n/use-app-locale'
import { buildLocalizedPath } from '@/lib/format'
import { createClient } from '@/lib/supabase/client'
import {
  normalizeSupabaseAuthError,
  normalizeUnknownError,
} from '@/lib/errors/app-error'
import { AuthCard } from '@/components/auth/auth-card'

const supabase = createClient()

/**
 * Inner confirm content — must be in its own component so the Suspense boundary
 * wrapping it catches the useSearchParams suspension during SSR.
 *
 * @returns {React.ReactElement} Loading indicator, error state, or empty (on redirect).
 */
function ConfirmContent() {
  const t = useTranslations('Auth')
  const errorT = useTranslations('Errors')
  const locale = useAppLocale()
  const searchParams = useSearchParams()
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type')

  // Show error immediately when either param is absent (AU-004.2/.3 — no flash).
  const [status, setStatus] = useState<'loading' | 'error'>(
    tokenHash && type ? 'loading' : 'error'
  )
  const [errorMessage, setErrorMessage] = useState<string | null>(
    tokenHash && type ? null : t('confirmInvalidLink')
  )

  useEffect(() => {
    if (!tokenHash || !type) return

    supabase.auth
      .verifyOtp({ token_hash: tokenHash, type: type as EmailOtpType })
      .then(({ error }) => {
        if (error) {
          setStatus('error')
          setErrorMessage(
            errorT(
              normalizeSupabaseAuthError(error, {
                code: 'auth.confirmGeneric',
                messageKey: 'auth.confirmGeneric',
              }).messageKey
            )
          )
        } else {
          // Hard navigation so the SSR proxy sees the freshly-written session
          // cookie before rendering the dashboard (design Decision 2). Keep the
          // active locale so a Spanish confirmation lands on /es/dashboard.
          window.location.assign(buildLocalizedPath('/dashboard', locale))
        }
      })
      .catch((reason: unknown) => {
        // A rejected promise (transient/network failure) must not strand the
        // user on the "Verifying…" loading state.
        setStatus('error')
        setErrorMessage(
          errorT(
            normalizeUnknownError(reason, {
              code: 'auth.confirmGeneric',
              messageKey: 'auth.confirmGeneric',
            }).messageKey
          )
        )
      })
  }, [tokenHash, type, locale, errorT])

  if (status === 'loading') {
    return (
      <AuthCard>
        <p className="text-base leading-relaxed text-[var(--ink-2)]">
          {t('confirmVerifying')}
        </p>
      </AuthCard>
    )
  }

  return (
    <AuthCard>
      <p role="alert" className="text-base text-[var(--danger)]">
        {errorMessage}
      </p>
      <Link href="/register" className="mt-4 underline">
        {t('confirmRegisterAgain')}
      </Link>
    </AuthCard>
  )
}

/**
 * Email confirmation callback page.
 *
 * Reads `token_hash` and `type` from the URL search parameters, calls
 * `verifyOtp` on mount, and hard-navigates to /dashboard on success.
 * On failure, displays an error and a link back to /register.
 *
 * @returns {React.ReactElement} The email confirmation page wrapped in Suspense.
 */
export default function ConfirmPage() {
  const t = useTranslations('Auth')

  return (
    <Suspense
      fallback={
        <AuthCard>
          <p className="text-base leading-relaxed text-[var(--ink-2)]">
            {t('confirmVerifying')}
          </p>
        </AuthCard>
      }
    >
      <ConfirmContent />
    </Suspense>
  )
}
