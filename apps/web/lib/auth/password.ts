import { z } from 'zod'

/**
 * Locale-resolved messages the password schema factories need. Callers pass the
 * strings from `useTranslations('Auth')` so validation errors follow the active
 * locale instead of a hardcoded English catalog import.
 */
export type PasswordMessages = {
  minimum: string
  pattern: string
  confirmRequired: string
  mismatch: string
}

/**
 * Strong-password checklist. The first entry (length) is also enforced by
 * `createPasswordSchema().min(8)`; the remaining entries drive both the live
 * checklist UI and the complexity refinement, keeping this array the single
 * source of truth for the policy across signup and password reset.
 *
 * `key` maps to `Auth.passwordRequirements.<key>` so the checklist UI renders
 * each label through the active locale rather than a hardcoded string.
 */
export const PASSWORD_REQUIREMENTS = [
  { key: 'length', test: (p: string) => p.length >= 8 },
  { key: 'lowercase', test: (p: string) => /[a-z]/.test(p) },
  { key: 'uppercase', test: (p: string) => /[A-Z]/.test(p) },
  { key: 'number', test: (p: string) => /\d/.test(p) },
  { key: 'special', test: (p: string) => /[^A-Za-z0-9]/.test(p) },
] as const

/**
 * Build the reusable strong-password field schema (min 8 chars + complexity)
 * with locale-aware messages.
 *
 * @param {PasswordMessages} messages - Active-locale validation messages.
 * @returns {z.ZodType<string>} The password field schema.
 */
export function createPasswordSchema(messages: PasswordMessages) {
  return z
    .string()
    .min(8, messages.minimum)
    .refine(
      (password) =>
        PASSWORD_REQUIREMENTS.slice(1).every((requirement) =>
          requirement.test(password)
        ),
      messages.pattern
    )
}

/**
 * Build the password + confirmation object schema. Kept free of the match
 * refinement so callers can `.extend()` it (e.g. with an email field) before
 * applying `withPasswordMatch`.
 *
 * @param {PasswordMessages} messages - Active-locale validation messages.
 * @returns {z.ZodObject} The password/confirmation object schema.
 */
export function createPasswordConfirmationSchema(messages: PasswordMessages) {
  return z.object({
    password: createPasswordSchema(messages),
    confirmPassword: z.string().min(1, messages.confirmRequired),
  })
}

/**
 * Attach the "password must equal confirmation" refinement, anchoring the error
 * to the confirmPassword field so it renders next to that input.
 *
 * @param {Schema} schema - A schema whose output has `password` and `confirmPassword`.
 * @param {string} mismatchMessage - Active-locale "passwords must match" message.
 * @returns {z.ZodType} The schema with the matching refinement applied.
 */
export function withPasswordMatch<
  Schema extends z.ZodType<{ password: string; confirmPassword: string }>,
>(schema: Schema, mismatchMessage: string) {
  return schema.refine((data) => data.password === data.confirmPassword, {
    message: mismatchMessage,
    path: ['confirmPassword'],
  })
}
