'use client'

import { useTranslations } from 'next-intl'

import { NavLink } from '@/components/navigation/nav-link'
import { LanguageSwitcher } from '@/components/i18n/language-switcher'
import { demoHrefs } from '@/lib/demo/hrefs'

/**
 * Public top bar for the `/demo` island. Deliberately unlike the authenticated
 * {@link AppHeader}: no avatar, no logout — instead a "Demo" badge, the
 * wordmark linking back to the demo home, the language switcher, and an
 * unmistakable exit link to the real landing page. No link here reaches an
 * authenticated route.
 *
 * @returns {React.ReactElement} The demo header element.
 */
export function DemoHeader() {
  const t = useTranslations('Demo')

  return (
    <header className="flex items-center justify-between gap-3 border-b-2 border-[var(--border)] px-4 py-4 llg:px-10">
      <div className="flex items-center gap-3">
        <NavLink
          href={demoHrefs.campaign}
          className="font-serif text-xl font-semibold tracking-[-0.02em] text-[var(--ink)]"
        >
          Lazy <span className="text-[var(--accent)]">Lands</span>
        </NavLink>
        <span className="inline-flex h-9 items-center border-2 border-[var(--border)] bg-[var(--accent)] px-2.5 font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--bg-contrast)]">
          {t('badge')}
        </span>
      </div>

      <div className="flex items-center gap-3">
        <LanguageSwitcher compact />
        <NavLink
          href={demoHrefs.home}
          className="inline-flex h-9 items-center whitespace-nowrap border-2 border-[var(--border)] bg-[var(--paper)] px-3 font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--ink)] shadow-[3px_3px_0_var(--shadow)] transition-[transform,box-shadow] duration-100 ease-out hover:translate-x-[1.5px] hover:translate-y-[1.5px] hover:shadow-[1.5px_1.5px_0_var(--shadow)]"
        >
          {t('exit')}
        </NavLink>
      </div>
    </header>
  )
}
