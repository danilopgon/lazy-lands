'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'

/** Login form schema — email + password validation. */
const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
})

type LoginFormData = z.infer<typeof loginSchema>

const supabase = createClient()

/**
 * Login page — authenticates the user via Supabase email/password.
 *
 * @returns {React.ReactElement} The login form.
 */
export default function LoginPage() {
  const router = useRouter()
  const [authError, setAuthError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

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
      setAuthError('Unable to sign in right now. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main
      id="main-content"
      className="mx-auto flex min-h-screen max-w-[720px] flex-col justify-center px-6 py-16"
    >
      <h1 className="font-serif text-4xl font-semibold leading-none tracking-[-0.025em] text-[var(--ink)] llg:text-[52px]">
        Sign in
      </h1>
      <p className="mt-4 max-w-[60ch] text-base leading-relaxed text-[var(--ink-2)]">
        Enter your credentials to access your campaigns.
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
            autoComplete="current-password"
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
          {isSubmitting ? 'Signing in...' : 'Sign in'}
        </Button>
      </form>
    </main>
  )
}
