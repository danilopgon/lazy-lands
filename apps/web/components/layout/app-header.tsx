import { useTranslations } from 'next-intl'

import { Link } from '@/i18n/navigation'
import { LanguageSwitcher } from '@/components/i18n/language-switcher'
import { LogoutButton } from '@/components/auth/logout-button'
import { userInitials } from '@/lib/user/initials'

type AppHeaderProps = {
  /** The signed-in user's email, or null when it could not be resolved. */
  email: string | null
  children: React.ReactNode
}

/**
 * Top bar for the authenticated area: wordmark home link, language switcher,
 * an initials avatar identifying the signed-in user, and the logout action.
 *
 * Rendered by the dashboard and campaigns layouts so the guarded routes share
 * one chrome instead of each page wiring its own switcher. The interactive
 * pieces (`LanguageSwitcher`, `LogoutButton`) are client islands; this shell
 * stays a server component so the email never reaches the client except as the
 * already-derived initials and label.
 *
 * @param {AppHeaderProps} root0 - Header props.
 * @param {string | null} root0.email - The signed-in user's email.
 * @param {React.ReactNode} root0.children - The page content rendered below the bar.
 * @returns {React.ReactElement} The header wrapping the page content.
 */
export function AppHeader({ email, children }: AppHeaderProps) {
  const t = useTranslations('Nav')
  const initials = userInitials(email)
  const identityLabel = email
    ? t('signedInAs', { email })
    : t('signedInAs', { email: '?' })

  return (
    <>
      <header className="flex items-center justify-between border-b-2 border-[var(--border)] px-4 py-4 llg:px-10">
        <Link
          href="/dashboard"
          className="font-serif text-xl font-semibold tracking-[-0.02em] text-[var(--ink)]"
        >
          Lazy <span className="text-[var(--accent)]">Lands</span>
        </Link>

        <div className="flex items-center gap-3">
          <LanguageSwitcher compact persistUserLanguage />
          <span
            aria-label={identityLabel}
            title={email ?? undefined}
            className="flex h-9 w-9 items-center justify-center border-2 border-[var(--border)] bg-[var(--paper)] font-mono text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--ink-2)] shadow-[3px_3px_0_var(--shadow)]"
          >
            {initials}
          </span>
          <LogoutButton />
        </div>
      </header>
      {children}
    </>
  )
}
