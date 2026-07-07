'use client'

import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslations } from 'next-intl'

import { Link, useRouter } from '@/i18n/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'
import {
  AuthCard,
  authInputClass,
  authButtonClass,
} from '@/components/auth/auth-card'

type LoginFormData = { email: string; password: string }

const supabase = createClient()

/**
 * Login page — authenticates the user via Supabase email/password.
 *
 * @returns {React.ReactElement} The login form.
 */
export default function LoginPage() {
  const router = useRouter()
  const t = useTranslations('Auth')
  const [authError, setAuthError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const loginSchema = useMemo(
    () =>
      z.object({
        email: z.email(t('emailInvalid')),
        password: z.string().min(1, t('passwordRequired')),
      }),
    [t]
  )

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  /**
   * Handle form submission — calls Supabase signInWithPassword.
   *
   * @param {LoginFormData} data - Validated form data.
   */
  async function onSubmit(data: LoginFormData) {
    setAuthError(null)
    setIsSubmitting(true)

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      })

      if (error) {
        setAuthError(error.message)
        return
      }

      router.push('/dashboard')
    } catch {
      setAuthError(t('loginError'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthCard>
      <h1 className="font-serif text-4xl font-semibold leading-none tracking-[-0.025em] text-[var(--ink)] llg:text-[52px]">
        {t('loginTitle')}
      </h1>
      <p className="mt-4 max-w-[60ch] text-base leading-relaxed text-[var(--ink-2)]">
        {t('loginSubtitle')}
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

        <div className="space-y-2">
          <Label htmlFor="password">{t('password')}</Label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            className={authInputClass}
            {...register('password')}
          />
          {errors.password && (
            <p role="alert" className="text-sm text-[var(--danger)]">
              {errors.password.message}
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
          {isSubmitting ? t('loginSubmitting') : t('loginSubmit')}
        </Button>
      </form>

      <p className="mt-4 text-sm text-[var(--ink-2)]">
        <Link href="/forgot-password" className="underline">
          {t('forgotPassword')}
        </Link>
      </p>

      <p className="mt-6 text-sm text-[var(--ink-2)]">
        {t('loginNoAccount')}{' '}
        <Link href="/register" className="underline">
          {t('loginCreateAccount')}
        </Link>
      </p>
    </AuthCard>
  )
}
