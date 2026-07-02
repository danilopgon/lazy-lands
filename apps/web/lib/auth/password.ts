import { z } from 'zod'

/** Message shown when the password fails the complexity policy. */
export const PASSWORD_PATTERN_MESSAGE =
  'Password must include uppercase, lowercase, number, and special character'

/** Message shown when the password and its confirmation do not match. */
export const PASSWORD_MISMATCH_MESSAGE = 'Passwords must match'

/**
 * Strong-password checklist. The first entry (length) is also enforced by
 * `passwordSchema.min(8)`; the remaining entries drive both the live checklist
 * UI and the complexity refinement, keeping this array the single source of
 * truth for the policy across signup and password reset.
 */
export const PASSWORD_REQUIREMENTS = [
  { label: 'Use at least 8 characters', test: (p: string) => p.length >= 8 },
  { label: 'Include a lowercase letter', test: (p: string) => /[a-z]/.test(p) },
  {
    label: 'Include an uppercase letter',
    test: (p: string) => /[A-Z]/.test(p),
  },
  { label: 'Include a number', test: (p: string) => /\d/.test(p) },
  {
    label: 'Include a special character',
    test: (p: string) => /[^A-Za-z0-9]/.test(p),
  },
]

/** Reusable strong-password field schema (min 8 chars + complexity). */
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .refine(
    (password) =>
      PASSWORD_REQUIREMENTS.slice(1).every((requirement) =>
        requirement.test(password)
      ),
    PASSWORD_PATTERN_MESSAGE
  )

/**
 * Password + confirmation object. Kept free of the match refinement so callers
 * can `.extend()` it (e.g. with an email field) before applying
 * `withPasswordMatch`.
 */
export const passwordConfirmationSchema = z.object({
  password: passwordSchema,
  confirmPassword: z.string().min(1, 'Please confirm your password'),
})

/**
 * Attach the "password must equal confirmation" refinement, anchoring the error
 * to the confirmPassword field so it renders next to that input.
 *
 * @param {Schema} schema - A schema whose output has `password` and `confirmPassword`.
 * @returns {z.ZodType} The schema with the matching refinement applied.
 */
export function withPasswordMatch<
  Schema extends z.ZodType<{ password: string; confirmPassword: string }>,
>(schema: Schema) {
  return schema.refine((data) => data.password === data.confirmPassword, {
    message: PASSWORD_MISMATCH_MESSAGE,
    path: ['confirmPassword'],
  })
}
