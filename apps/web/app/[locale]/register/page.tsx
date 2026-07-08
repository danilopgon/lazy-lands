'use client'

import { useMemo, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslations } from 'next-intl'

import { Link } from '@/i18n/navigation'
import { useAppLocale } from '@/i18n/use-app-locale'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'
import {
  normalizeSupabaseAuthError,
  normalizeUnknownError,
} from '@/lib/errors/app-error'
import { resolveAppOrigin } from '@/lib/auth/redirect'
import { buildLocalizedPath } from '@/lib/format'
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

type RegisterFormData = {
  email: string
  password: string
  confirmPassword: string
}

const supabase = createClient()

/**
 * Register page — initiates email-confirmed account creation via Supabase.
 *
 * On success the form becomes non-interactive and a "Check your email" message
 * is shown. The user must click the confirmation link before a session is active.
 * Do NOT redirect to /dashboard — there is no session yet.
 *
 * @returns {React.ReactElement} The registration page.
 */
export default function RegisterPage() {
  const [authError, setAuthError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const t = useTranslations('Auth')
  const errorT = useTranslations('Errors')
  const locale = useAppLocale()

  const registerSchema = useMemo(
    () =>
      withPasswordMatch(
        createPasswordConfirmationSchema({
          minimum: t('passwordMinimum'),
          pattern: t('passwordPattern'),
          confirmRequired: t('passwordConfirmRequired'),
          mismatch: t('passwordMismatch'),
        }).extend({ email: z.email(t('emailInvalid')) }),
        t('passwordMismatch')
      ),
    [t]
  )

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  })
  const passwordValue = useWatch({
    control,
    name: 'password',
    defaultValue: '',
  })

  /**
   * Handle form submission — calls Supabase signUp with an emailRedirectTo URL.
   *
   * @param {RegisterFormData} data - Validated form data.
   */
  async function onSubmit(data: RegisterFormData) {
    setAuthError(null)
    setIsSubmitting(true)

    try {
      // Preserve the active locale on return from the confirmation email so the
      // user lands on `/es/auth/confirm` rather than the default-locale route.
      const emailRedirectTo = `${resolveAppOrigin()}${buildLocalizedPath('/auth/confirm', locale)}`

      const { error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          emailRedirectTo,
          data: { language: locale },
        },
      })

      if (error) {
        setAuthError(
          errorT(
            normalizeSupabaseAuthError(error, {
              code: 'auth.registerGeneric',
              messageKey: 'auth.registerGeneric',
            }).messageKey
          )
        )
        return
      }

      setIsSuccess(true)
    } catch (error) {
      setAuthError(
        errorT(
          normalizeUnknownError(error, {
            code: 'auth.registerGeneric',
            messageKey: 'auth.registerGeneric',
          }).messageKey
        )
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isSuccess) {
    return (
      <AuthCard>
        <h1 className="font-serif text-4xl font-semibold leading-none tracking-[-0.025em] text-[var(--ink)] llg:text-[52px]">
          {t('registerSuccessTitle')}
        </h1>
        <p className="mt-4 max-w-[60ch] text-base leading-relaxed text-[var(--ink-2)]">
          {t('registerSuccessBody')}
        </p>
      </AuthCard>
    )
  }

  return (
    <AuthCard>
      <h1 className="font-serif text-4xl font-semibold leading-none tracking-[-0.025em] text-[var(--ink)] llg:text-[52px]">
        {t('registerTitle')}
      </h1>
      <p className="mt-4 max-w-[60ch] text-base leading-relaxed text-[var(--ink-2)]">
        {t('registerSubtitle')}
      </p>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="mt-8 space-y-6"
        noValidate
      >
        <div className="space-y-2">
          <Label htmlFor="email">{t('email')}</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            className={authInputClass}
            {...register('email')}
          />
          {errors.email && (
            <p role="alert" className="text-sm text-[var(--danger)]">
              {errors.email.message}
            </p>
          )}
        </div>

        <div className="space-y-3">
          <Label htmlFor="password">{t('password')}</Label>
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

        {authError && (
          <p role="alert" className="text-sm text-[var(--danger)]">
            {authError}
          </p>
        )}

        <Button
          type="submit"
          disabled={isSubmitting}
          className={authButtonClass}
        >
          {isSubmitting ? t('registerSubmitting') : t('registerSubmit')}
        </Button>
      </form>

      <p className="mt-6 text-sm text-[var(--ink-2)]">
        {t('registerHaveAccount')}{' '}
        <Link href="/login" className="underline">
          {t('loginTitle')}
        </Link>
      </p>
    </AuthCard>
  )
}
