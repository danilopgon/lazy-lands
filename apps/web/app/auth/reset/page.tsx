'use client'

import { Suspense, useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import type { EmailOtpType } from '@supabase/supabase-js'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'
import {
  AuthCard,
  authInputClass,
  authButtonClass,
} from '@/components/auth/auth-card'

const supabase = createClient()

/** New-password form schema — min 6 chars + confirmation must match. */
const resetPasswordSchema = z
  .object({
    newPassword: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>

type ResetState = 'loading' | 'error' | 'form' | 'success'

/**
 * Inner reset content — must be in its own component so the Suspense boundary
 * wrapping it catches the useSearchParams suspension during SSR.
 *
 * @returns {React.ReactElement} Loading indicator, error state, password form, or success.
 */
function ResetContent() {
  const searchParams = useSearchParams()
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type')

  // Initialize error state immediately when params are absent (no flash on render).
  const [state, setState] = useState<ResetState>(
    tokenHash && type ? 'loading' : 'error'
  )
  const [errorMessage, setErrorMessage] = useState<string | null>(
    tokenHash && type ? null : 'Invalid or missing reset link.'
  )
  const [updateError, setUpdateError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
  })

  useEffect(() => {
    // Already in error state from initial render — nothing to do.
    if (!tokenHash || !type) return

    supabase.auth
      .verifyOtp({ token_hash: tokenHash, type: type as EmailOtpType })
      .then(({ error }) => {
        if (error) {
          setErrorMessage(error.message)
          setState('error')
        } else {
          setState('form')
        }
      })
  }, [tokenHash, type])

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
        password: data.newPassword,
      })

      if (error) {
        setUpdateError(error.message)
        return
      }

      setState('success')
    } catch {
      setUpdateError('Unable to update password right now. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (state === 'loading') {
    return (
      <AuthCard>
        <p className="text-base leading-relaxed text-[var(--ink-2)]">
          Verifying your reset link&hellip;
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
          Request a new reset link
        </Link>
      </AuthCard>
    )
  }

  if (state === 'success') {
    return (
      <AuthCard>
        <h1 className="font-serif text-4xl font-semibold leading-none tracking-[-0.025em] text-[var(--ink)] llg:text-[52px]">
          Password updated
        </h1>
        <p className="mt-4 max-w-[60ch] text-base leading-relaxed text-[var(--ink-2)]">
          Your password has been updated successfully.
        </p>
        <p className="mt-6 text-sm text-[var(--ink-2)]">
          <Link href="/login" className="underline">
            Sign in
          </Link>
        </p>
      </AuthCard>
    )
  }

  // state === 'form'
  return (
    <AuthCard>
      <h1 className="font-serif text-4xl font-semibold leading-none tracking-[-0.025em] text-[var(--ink)] llg:text-[52px]">
        Set a new password
      </h1>
      <p className="mt-4 max-w-[60ch] text-base leading-relaxed text-[var(--ink-2)]">
        Choose a new password for your account.
      </p>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="mt-8 space-y-6"
        noValidate
      >
        <div className="space-y-2">
          <Label htmlFor="newPassword">New password</Label>
          <Input
            id="newPassword"
            type="password"
            autoComplete="new-password"
            className={authInputClass}
            {...register('newPassword')}
          />
          {errors.newPassword && (
            <p role="alert" className="text-sm text-[var(--danger)]">
              {errors.newPassword.message}
            </p>
          )}
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
          {isSubmitting ? 'Updating...' : 'Update password'}
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
  return (
    <Suspense
      fallback={
        <AuthCard>
          <p className="text-base leading-relaxed text-[var(--ink-2)]">
            Verifying your reset link&hellip;
          </p>
        </AuthCard>
      }
    >
      <ResetContent />
    </Suspense>
  )
}
