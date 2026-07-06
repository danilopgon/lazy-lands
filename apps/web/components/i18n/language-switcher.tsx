'use client'

import Link from 'next/link'

import { buildLocalizedPath, stripLocaleFromPathname } from '@/lib/format'
import { cn } from '@/lib/utils'

type LanguageSwitcherProps = {
  className?: string
  compact?: boolean
}

/**
 * Render hard-edged links for switching between English and Spanish routes.
 *
 * @param {LanguageSwitcherProps} root0 - Switcher props.
 * @param {string} [root0.className] - Optional classes for placement.
 * @param {boolean} [root0.compact] - Whether to render compact EN/ES labels.
 * @returns {React.ReactElement} The language switcher navigation.
 */
export function LanguageSwitcher({
  className,
  compact = false,
}: LanguageSwitcherProps) {
  const pathname =
    typeof window === 'undefined' ? '/' : window.location.pathname || '/'
  const locale = stripLocaleFromPathname(pathname).locale
  const search =
    typeof window === 'undefined'
      ? ''
      : window.location.search.replace(/^\?/, '')
  const currentPath = search ? `${pathname}?${search}` : pathname

  const linkClassName =
    'border border-[var(--border)] px-2 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--ink-2)] shadow-[2px_2px_0_var(--shadow)] transition-[transform,box-shadow] hover:translate-x-[1.5px] hover:translate-y-[1.5px] hover:text-[var(--ink)] hover:shadow-[1px_1px_0_var(--shadow)] data-[active=true]:bg-[var(--accent)] data-[active=true]:text-white'

  return (
    <nav
      aria-label="Language"
      className={cn('flex items-center gap-1', compact && 'gap-0.5', className)}
    >
      <Link
        href={buildLocalizedPath(currentPath, 'en')}
        hrefLang="en"
        data-active={locale === 'en'}
        className={linkClassName}
      >
        {compact ? 'EN' : 'English'}
      </Link>
      <Link
        href={buildLocalizedPath(currentPath, 'es')}
        hrefLang="es"
        data-active={locale === 'es'}
        className={linkClassName}
      >
        {compact ? 'ES' : 'Español'}
      </Link>
    </nav>
  )
}
