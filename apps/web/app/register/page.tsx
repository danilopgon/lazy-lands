'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'

/** Register form schema — email + password validation. */
const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
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
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
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
      <main
        id="main-content"
        className="mx-auto flex min-h-screen max-w-[720px] flex-col justify-center px-6 py-16"
      >
        <h1 className="font-serif text-4xl font-semibold leading-none tracking-[-0.025em] text-[var(--ink)] llg:text-[52px]">
          Check your email
        </h1>
        <p className="mt-4 max-w-[60ch] text-base leading-relaxed text-[var(--ink-2)]">
          We sent a confirmation link to your inbox. Click it to activate your
          account and start your first campaign.
        </p>
      </main>
    )
  }

  return (
    <main
      id="main-content"
      className="mx-auto flex min-h-screen max-w-[720px] flex-col justify-center px-6 py-16"
    >
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
            {...register('email')}
          />
          {errors.email && (
            <p role="alert" className="text-sm text-red-600">
              {errors.email.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            {...register('password')}
          />
          {errors.password && (
            <p role="alert" className="text-sm text-red-600">
              {errors.password.message}
            </p>
          )}
        </div>

        {authError && (
          <p role="alert" className="text-sm text-red-600">
            {authError}
          </p>
        )}

        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Creating account...' : 'Sign up'}
        </Button>
      </form>

      <p className="mt-6 text-sm text-[var(--ink-2)]">
        Already have an account?{' '}
        <Link href="/login" className="underline">
          Sign in
        </Link>
      </p>
    </main>
  )
}
