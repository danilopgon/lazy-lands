'use client'

import { Suspense } from 'react'
import Link from 'next/link'
import { useLocale, useTranslations } from 'next-intl'
import { useSearchParams } from 'next/navigation'

import { usePathname } from '@/i18n/navigation'
import { buildLocalizedPath } from '@/lib/format'
import { cn } from '@/lib/utils'

type LanguageSwitcherProps = {
  className?: string
  compact?: boolean
}

const linkClassName =
  'border border-[var(--border)] px-2 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--ink-2)] shadow-[2px_2px_0_var(--shadow)] transition-[transform,box-shadow] hover:translate-x-[1.5px] hover:translate-y-[1.5px] hover:text-[var(--ink)] hover:shadow-[1px_1px_0_var(--shadow)] data-[active=true]:bg-[var(--accent)] data-[active=true]:text-white'

/**
 * Render the two locale links for a resolved path.
 *
 * @param {object} root0 - Link props.
 * @param {string} root0.currentPath - The current path, optionally with a query string.
 * @param {string} root0.locale - The active locale, used to mark the current link.
 * @param {boolean} root0.compact - Whether to render compact EN/ES labels.
 * @returns {React.ReactElement} The two locale links.
 */
function LocaleLinks({
  currentPath,
  locale,
  compact,
}: {
  currentPath: string
  locale: string
  compact: boolean
}) {
  return (
    <>
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
    </>
  )
}

/**
 * Locale links that also preserve the active query string. Isolated so its
 * `useSearchParams` call sits under a Suspense boundary — otherwise it forces a
 * client-side-rendering bailout of statically generated pages at build time.
 *
 * @param {object} root0 - Link props.
 * @param {string} root0.pathname - The locale-free pathname from next-intl.
 * @param {string} root0.locale - The active locale.
 * @param {boolean} root0.compact - Whether to render compact labels.
 * @returns {React.ReactElement} The query-preserving locale links.
 */
function SearchAwareLinks({
  pathname,
  locale,
  compact,
}: {
  pathname: string
  locale: string
  compact: boolean
}) {
  const searchParams = useSearchParams()
  const query = searchParams.toString()
  const currentPath = query ? `${pathname}?${query}` : pathname

  return (
    <LocaleLinks currentPath={currentPath} locale={locale} compact={compact} />
  )
}

/**
 * Render hard-edged links for switching between English and Spanish routes.
 *
 * The current pathname and locale come from next-intl context (not
 * `window.location`) so server and client render identical hrefs, avoiding a
 * hydration mismatch on `/es/...` routes.
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
  const t = useTranslations('Nav')
  const locale = useLocale()
  const pathname = usePathname()

  return (
    <nav
      aria-label={t('language')}
      className={cn('flex items-center gap-1', compact && 'gap-0.5', className)}
    >
      <Suspense
        fallback={
          <LocaleLinks
            currentPath={pathname}
            locale={locale}
            compact={compact}
          />
        }
      >
        <SearchAwareLinks
          pathname={pathname}
          locale={locale}
          compact={compact}
        />
      </Suspense>
    </nav>
  )
}
