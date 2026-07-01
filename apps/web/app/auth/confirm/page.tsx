'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import type { EmailOtpType } from '@supabase/supabase-js'

import { createClient } from '@/lib/supabase/client'
import { AuthCard } from '@/components/auth/auth-card'

const supabase = createClient()

/**
 * Inner confirm content — must be in its own component so the Suspense boundary
 * wrapping it catches the useSearchParams suspension during SSR.
 *
 * @returns {React.ReactElement} Loading indicator, error state, or empty (on redirect).
 */
function ConfirmContent() {
  const searchParams = useSearchParams()
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type')

  // Show error immediately when either param is absent (AU-004.2/.3 — no flash).
  const [status, setStatus] = useState<'loading' | 'error'>(
    tokenHash && type ? 'loading' : 'error'
  )
  const [errorMessage, setErrorMessage] = useState<string | null>(
    tokenHash && type
      ? null
      : 'Invalid confirmation link. Please request a new one.'
  )

  useEffect(() => {
    if (!tokenHash || !type) return

    supabase.auth
      .verifyOtp({ token_hash: tokenHash, type: type as EmailOtpType })
      .then(({ error }) => {
        if (error) {
          setStatus('error')
          setErrorMessage(error.message)
        } else {
          // Hard navigation so the SSR proxy sees the freshly-written session
          // cookie before rendering /dashboard (design Decision 2).
          window.location.assign('/dashboard')
        }
      })
  }, [tokenHash, type])

  if (status === 'loading') {
    return (
      <AuthCard>
        <p className="text-base leading-relaxed text-[var(--ink-2)]">
          Verifying your email&hellip;
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
        Register again
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
  return (
    <Suspense
      fallback={
        <AuthCard>
          <p className="text-base leading-relaxed text-[var(--ink-2)]">
            Verifying your email&hellip;
          </p>
        </AuthCard>
      }
    >
      <ConfirmContent />
    </Suspense>
  )
}
