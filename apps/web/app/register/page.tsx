'use client'

import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'
import {
  AuthCard,
  authInputClass,
  authButtonClass,
} from '@/components/auth/auth-card'

const PASSWORD_PATTERN_MESSAGE =
  'Password must include uppercase, lowercase, number, and special character'

const PASSWORD_REQUIREMENTS = [
  {
    label: 'Use at least 8 characters',
    test: (password: string) => password.length >= 8,
  },
  {
    label: 'Include a lowercase letter',
    test: (password: string) => /[a-z]/.test(password),
  },
  {
    label: 'Include an uppercase letter',
    test: (password: string) => /[A-Z]/.test(password),
  },
  {
    label: 'Include a number',
    test: (password: string) => /\d/.test(password),
  },
  {
    label: 'Include a special character',
    test: (password: string) => /[^A-Za-z0-9]/.test(password),
  },
]

const registerSchema = z
  .object({
    email: z.string().email('Invalid email format'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .refine(
        (password) =>
          PASSWORD_REQUIREMENTS.slice(1).every((requirement) =>
            requirement.test(password)
          ),
        PASSWORD_PATTERN_MESSAGE
      ),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords must match',
    path: ['confirmPassword'],
  })

type RegisterFormData = z.infer<typeof registerSchema>

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
      const emailRedirectTo =
        (process.env.NEXT_PUBLIC_APP_URL ?? '') + '/auth/confirm'

      const { error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: { emailRedirectTo },
      })

      if (error) {
        setAuthError(error.message)
        return
      }

      setIsSuccess(true)
    } catch {
      setAuthError('Unable to register right now. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isSuccess) {
    return (
      <AuthCard>
        <h1 className="font-serif text-4xl font-semibold leading-none tracking-[-0.025em] text-[var(--ink)] llg:text-[52px]">
          Check your email
        </h1>
        <p className="mt-4 max-w-[60ch] text-base leading-relaxed text-[var(--ink-2)]">
          We sent a confirmation link to your inbox. Click it to activate your
          account and start your first campaign.
        </p>
      </AuthCard>
    )
  }

  return (
    <AuthCard>
      <h1 className="font-serif text-4xl font-semibold leading-none tracking-[-0.025em] text-[var(--ink)] llg:text-[52px]">
        Create an account
      </h1>
      <p className="mt-4 max-w-[60ch] text-base leading-relaxed text-[var(--ink-2)]">
        Start your campaign shelf. We will send a confirmation link to your
        inbox.
      </p>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="mt-8 space-y-6"
        noValidate
      >
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
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
          <Label htmlFor="password">Password</Label>
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
          <div
            id="password-requirements"
            className="border-2 border-[var(--border)] bg-[var(--paper-2)] p-4"
          >
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--mute)]">
              Password must include
            </p>
            <ul className="mt-2 space-y-1 text-sm text-[var(--ink-soft)]">
              {PASSWORD_REQUIREMENTS.map((requirement) => {
                const isMet = requirement.test(passwordValue)

                return (
                  <li
                    key={requirement.label}
                    className="flex items-start gap-2"
                  >
                    <span
                      aria-hidden="true"
                      className={
                        isMet
                          ? 'font-mono font-semibold text-[var(--good)]'
                          : 'font-mono font-semibold text-[var(--ink-3)]'
                      }
                    >
                      {isMet ? '✓' : '—'}
                    </span>
                    <span>{requirement.label}</span>
                  </li>
                )
              })}
            </ul>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirm password</Label>
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
          {isSubmitting ? 'Creating account...' : 'Sign up'}
        </Button>
      </form>

      <p className="mt-6 text-sm text-[var(--ink-2)]">
        Already have an account?{' '}
        <Link href="/login" className="underline">
          Sign in
        </Link>
      </p>
    </AuthCard>
  )
}
