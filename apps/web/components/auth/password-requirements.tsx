import { PASSWORD_REQUIREMENTS } from '@/lib/auth/password'
import en from '@/messages/en.json'

const copy = en.Auth

/**
 * Live checklist reflecting which strong-password requirements the current
 * value satisfies. Shared by the signup and password-reset forms so both
 * surface the same policy.
 *
 * @param {{ value: string }} props - The current password input value.
 * @returns {React.ReactElement} The requirements checklist.
 */
export function PasswordRequirements({ value }: { value: string }) {
  const metCount = PASSWORD_REQUIREMENTS.filter((requirement) =>
    requirement.test(value)
  ).length

  return (
    <div
      id="password-requirements"
      className="border-2 border-[var(--border)] bg-[var(--paper-2)] p-4"
    >
      <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--mute)]">
        {copy.passwordRequirementsTitle}
      </p>
      <span className="sr-only" aria-live="polite">
        {copy.passwordRequirementsProgress
          .replace('{met}', String(metCount))
          .replace('{total}', String(PASSWORD_REQUIREMENTS.length))}
      </span>
      <ul className="mt-2 space-y-1 text-sm text-[var(--ink-soft)]">
        {PASSWORD_REQUIREMENTS.map((requirement) => {
          const isMet = requirement.test(value)

          return (
            <li key={requirement.label} className="flex items-start gap-2">
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
  )
}
