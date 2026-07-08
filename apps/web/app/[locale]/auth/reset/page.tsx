'use client'

import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import type { EmailOtpType } from '@supabase/supabase-js'

import { Link } from '@/i18n/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'
import {
  normalizeSupabaseAuthError,
  normalizeUnknownError,
} from '@/lib/errors/app-error'
import {
  createPasswordConfirmationSchema,
  withPasswordMatch,
} from '@/lib/auth/password'
import { PasswordRequirements } from '@/components/auth/password-requirements'
import {
  AuthCard,
  authInputClass,
  authButtonClass,
} from '@/components/auth/auth-card'

const supabase = createClient()

type ResetPasswordFormData = { password: string; confirmPassword: string }

type ResetState = 'loading' | 'error' | 'form' | 'success'

/**
 * Inner reset content — must be in its own component so the Suspense boundary
 * wrapping it catches the useSearchParams suspension during SSR.
 *
 * @returns {React.ReactElement} Loading indicator, error state, password form, or success.
 */
function ResetContent() {
  const t = useTranslations('Auth')
  const errorT = useTranslations('Errors')
  const searchParams = useSearchParams()
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type')

  // Initialize error state immediately when params are absent or type is not
  // 'recovery' (no flash on render). S-01: non-recovery type tokens must not
  // be consumed by the password reset flow.
  const [state, setState] = useState<ResetState>(
    tokenHash && type === 'recovery' ? 'loading' : 'error'
  )
  const [errorMessage, setErrorMessage] = useState<string | null>(
    tokenHash && type === 'recovery' ? null : t('resetInvalidLink')
  )
  const [updateError, setUpdateError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const resetPasswordSchema = useMemo(
    () =>
      withPasswordMatch(
        createPasswordConfirmationSchema({
          minimum: t('passwordMinimum'),
          pattern: t('passwordPattern'),
          confirmRequired: t('passwordConfirmRequired'),
          mismatch: t('passwordMismatch'),
        }),
        t('passwordMismatch')
      ),
    [t]
  )

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
  })
  const passwordValue = useWatch({
    control,
    name: 'password',
    defaultValue: '',
  })

  const hasVerified = useRef(false)

  useEffect(() => {
    // Already in error state from initial render — nothing to do.
    // Guard also excludes non-recovery token types (S-01).
    if (!tokenHash || type !== 'recovery') return

    // Strict Mode re-runs effects in dev; the recovery token is single-use, so
    // a second verifyOtp would consume/expire it and overwrite the form with an
    // invalid-token error (S-02). Fire the verification exactly once.
    if (hasVerified.current) return
    hasVerified.current = true

    supabase.auth
      .verifyOtp({ token_hash: tokenHash, type: type as EmailOtpType })
      .then(({ error }) => {
        if (error) {
          setErrorMessage(
            errorT(
              normalizeSupabaseAuthError(error, {
                code: 'auth.resetGeneric',
                messageKey: 'auth.resetGeneric',
              }).messageKey
            )
          )
          setState('error')
        } else {
          setState('form')
        }
      })
      .catch((reason: unknown) => {
        // A rejected promise (transient/network failure) must not strand the
        // user on the "Verifying…" loading state (AU-T-25). Render the failure
        // through `normalizeUnknownError` + `errorT`, matching the
        // `updateUser` catch pattern.
        setErrorMessage(
          errorT(
            normalizeUnknownError(reason, {
              code: 'auth.resetGeneric',
              messageKey: 'auth.resetGeneric',
            }).messageKey
          )
        )
        setState('error')
      })
  }, [tokenHash, type, errorT])

  /**
   * Handle password update form submission.
   *
   * @param {ResetPasswordFormData} data - Validated form data with new + confirm passwords.
   */
  async function onSubmit(data: ResetPasswordFormData) {
    setUpdateError(null)
    setIsSubmitting(true)

    try {
      const { error } = await supabase.auth.updateUser({
        password: data.password,
      })

      if (error) {
        setUpdateError(
          errorT(
            normalizeSupabaseAuthError(error, {
              code: 'auth.resetGeneric',
              messageKey: 'auth.resetGeneric',
            }).messageKey
          )
        )
        return
      }

      setState('success')
    } catch (error) {
      setUpdateError(
        errorT(
          normalizeUnknownError(error, {
            code: 'auth.resetGeneric',
            messageKey: 'auth.resetGeneric',
          }).messageKey
        )
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  if (state === 'loading') {
    return (
      <AuthCard>
        <p className="text-base leading-relaxed text-[var(--ink-2)]">
          {t('resetVerifying')}
        </p>
      </AuthCard>
    )
  }

  if (state === 'error') {
    return (
      <AuthCard>
        <p role="alert" className="text-base text-[var(--danger)]">
          {errorMessage}
        </p>
        <Link href="/forgot-password" className="mt-4 underline">
          {t('resetRequestNew')}
        </Link>
      </AuthCard>
    )
  }

  if (state === 'success') {
    return (
      <AuthCard>
        <h1 className="font-serif text-4xl font-semibold leading-none tracking-[-0.025em] text-[var(--ink)] llg:text-[52px]">
          {t('resetSuccessTitle')}
        </h1>
        <p className="mt-4 max-w-[60ch] text-base leading-relaxed text-[var(--ink-2)]">
          {t('resetSuccessBody')}
        </p>
        <p className="mt-6 text-sm text-[var(--ink-2)]">
          <Link href="/login" className="underline">
            {t('loginTitle')}
          </Link>
        </p>
      </AuthCard>
    )
  }

  // state === 'form'
  return (
    <AuthCard>
      <h1 className="font-serif text-4xl font-semibold leading-none tracking-[-0.025em] text-[var(--ink)] llg:text-[52px]">
        {t('resetTitle')}
      </h1>
      <p className="mt-4 max-w-[60ch] text-base leading-relaxed text-[var(--ink-2)]">
        {t('resetSubtitle')}
      </p>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="mt-8 space-y-6"
        noValidate
      >
        <div className="space-y-3">
          <Label htmlFor="password">{t('resetNewPasswordLabel')}</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            aria-describedby="password-requirements"
            className={authInputClass}
            {...register('password')}
          />
          {errors.password && (
            <p role="alert" className="text-sm text-[var(--danger)]">
              {errors.password.message}
            </p>
          )}
          <PasswordRequirements value={passwordValue} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">{t('confirmPassword')}</Label>
          <Input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            className={authInputClass}
            {...register('confirmPassword')}
          />
          {errors.confirmPassword && (
            <p role="alert" className="text-sm text-[var(--danger)]">
              {errors.confirmPassword.message}
            </p>
          )}
        </div>

        {updateError && (
          <p role="alert" className="text-sm text-[var(--danger)]">
            {updateError}
          </p>
        )}

        <Button
          type="submit"
          disabled={isSubmitting}
          className={authButtonClass}
        >
          {isSubmitting ? t('resetSubmitting') : t('resetSubmit')}
        </Button>
      </form>
    </AuthCard>
  )
}

/**
 * Password reset callback page.
 *
 * Reads `token_hash` and `type` from URL search parameters, calls `verifyOtp`
 * on mount, and shows the new-password form on success. On failure, shows an
 * error and a link back to /forgot-password.
 *
 * @returns {React.ReactElement} The reset page wrapped in Suspense.
 */
export default function ResetPage() {
  const t = useTranslations('Auth')

  return (
    <Suspense
      fallback={
        <AuthCard>
          <p className="text-base leading-relaxed text-[var(--ink-2)]">
            {t('resetVerifying')}
          </p>
        </AuthCard>
      }
    >
      <ResetContent />
    </Suspense>
  )
}
