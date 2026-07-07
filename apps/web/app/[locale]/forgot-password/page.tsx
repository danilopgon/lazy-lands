'use client'

import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslations } from 'next-intl'

import { Link } from '@/i18n/navigation'
import { useAppLocale } from '@/i18n/use-app-locale'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'
import { resolveAppOrigin } from '@/lib/auth/redirect'
import { buildLocalizedPath } from '@/lib/format'
import {
  AuthCard,
  authInputClass,
  authButtonClass,
} from '@/components/auth/auth-card'

type ForgotPasswordFormData = { email: string }

const supabase = createClient()

/**
 * Forgot-password page — sends a password reset email via Supabase.
 *
 * Displays a uniform confirmation message after submission regardless of
 * whether the email is registered (AU-005.2 — prevents email enumeration).
 *
 * @returns {React.ReactElement} The forgot-password form or confirmation message.
 */
export default function ForgotPasswordPage() {
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const t = useTranslations('Auth')
  const locale = useAppLocale()

  const forgotPasswordSchema = useMemo(
    () => z.object({ email: z.email(t('emailInvalid')) }),
    [t]
  )

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
  })

  /**
   * Handle form submission — calls Supabase resetPasswordForEmail.
   *
   * Always shows the uniform confirmation message regardless of outcome
   * to prevent email enumeration (AU-005.2 / NFR-AU-4).
   *
   * @param {ForgotPasswordFormData} data - Validated form data.
   */
  async function onSubmit(data: ForgotPasswordFormData) {
    setIsSubmitting(true)

    // Preserve the active locale on return from the reset email.
    const redirectTo = `${resolveAppOrigin()}${buildLocalizedPath('/auth/reset', locale)}`

    try {
      await supabase.auth.resetPasswordForEmail(data.email, { redirectTo })
    } catch {
      // Swallow transport errors — anti-enumeration means we never surface a
      // failure to the user (AU-005.2 / NFR-AU-4).
    } finally {
      // Always show uniform message — do NOT branch on error (AU-005.2). A
      // rejected transport promise must still render the confirmation instead
      // of leaving the submit button stuck disabled (AU-T-20 rejection).
      setIsSubmitted(true)
      setIsSubmitting(false)
    }
  }

  if (isSubmitted) {
    return (
      <AuthCard>
        <h1 className="font-serif text-4xl font-semibold leading-none tracking-[-0.025em] text-[var(--ink)] llg:text-[52px]">
          {t('forgotSentTitle')}
        </h1>
        <p className="mt-4 max-w-[60ch] text-base leading-relaxed text-[var(--ink-2)]">
          {t('forgotSentBody')}
        </p>
        <p className="mt-6 text-sm text-[var(--ink-2)]">
          <Link href="/login" className="underline">
            {t('backToSignIn')}
          </Link>
        </p>
      </AuthCard>
    )
  }

  return (
    <AuthCard>
      <h1 className="font-serif text-4xl font-semibold leading-none tracking-[-0.025em] text-[var(--ink)] llg:text-[52px]">
        {t('forgotTitle')}
      </h1>
      <p className="mt-4 max-w-[60ch] text-base leading-relaxed text-[var(--ink-2)]">
        {t('forgotSubtitle')}
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

        <Button
          type="submit"
          disabled={isSubmitting}
          className={authButtonClass}
        >
          {isSubmitting ? t('forgotSubmitting') : t('forgotSubmit')}
        </Button>
      </form>

      <p className="mt-6 text-sm text-[var(--ink-2)]">
        {t('forgotRemembered')}{' '}
        <Link href="/login" className="underline">
          {t('loginTitle')}
        </Link>
      </p>
    </AuthCard>
  )
}
