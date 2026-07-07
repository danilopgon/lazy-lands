'use client'

import { Suspense, type MouseEvent } from 'react'
import Link from 'next/link'
import { useLocale, useTranslations } from 'next-intl'
import { useRouter, useSearchParams } from 'next/navigation'

import { usePathname } from '@/i18n/navigation'
import { buildLocalizedPath } from '@/lib/format'
import { cn } from '@/lib/utils'

type LanguageSwitcherProps = {
  className?: string
  compact?: boolean
  persistUserLanguage?: boolean
}

type SupportedLocale = 'en' | 'es'

const linkClassName =
  'border border-[var(--border)] px-2 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--ink-2)] shadow-[2px_2px_0_var(--shadow)] transition-[transform,box-shadow] hover:translate-x-[1.5px] hover:translate-y-[1.5px] hover:text-[var(--ink)] hover:shadow-[1px_1px_0_var(--shadow)] data-[active=true]:bg-[var(--accent)] data-[active=true]:text-white'

/**
 * Render the two locale links for a resolved path.
 *
 * @param {object} root0 - Link props.
 * @param {string} root0.currentPath - The current path, optionally with a query string.
 * @param {string} root0.locale - The active locale, used to mark the current link.
 * @param {boolean} root0.compact - Whether to render compact EN/ES labels.
 * @param {boolean} root0.persistUserLanguage - Whether changed locales persist to authenticated user metadata.
 * @returns {React.ReactElement} The two locale links.
 */
function LocaleLinks({
  currentPath,
  locale,
  compact,
  persistUserLanguage,
}: {
  currentPath: string
  locale: string
  compact: boolean
  persistUserLanguage: boolean
}) {
  const router = useRouter()

  async function handleLocaleClick(
    event: MouseEvent<HTMLAnchorElement>,
    nextLocale: SupportedLocale,
    href: string
  ) {
    if (!persistUserLanguage || nextLocale === locale) {
      return
    }

    event.preventDefault()

    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      await supabase.auth.updateUser({ data: { language: nextLocale } })
    } catch {
      // Locale navigation must not be blocked by auth metadata persistence.
    } finally {
      router.push(href)
    }
  }

  const englishHref = buildLocalizedPath(currentPath, 'en')
  const spanishHref = buildLocalizedPath(currentPath, 'es')

  return (
    <>
      <Link
        href={englishHref}
        hrefLang="en"
        data-active={locale === 'en'}
        aria-current={locale === 'en' ? 'true' : undefined}
        className={linkClassName}
        onClick={(event) => handleLocaleClick(event, 'en', englishHref)}
      >
        {compact ? 'EN' : 'English'}
      </Link>
      <Link
        href={spanishHref}
        hrefLang="es"
        data-active={locale === 'es'}
        aria-current={locale === 'es' ? 'true' : undefined}
        className={linkClassName}
        onClick={(event) => handleLocaleClick(event, 'es', spanishHref)}
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
 * @param {boolean} root0.persistUserLanguage - Whether changed locales persist to authenticated user metadata.
 * @returns {React.ReactElement} The query-preserving locale links.
 */
function SearchAwareLinks({
  pathname,
  locale,
  compact,
  persistUserLanguage,
}: {
  pathname: string
  locale: string
  compact: boolean
  persistUserLanguage: boolean
}) {
  const searchParams = useSearchParams()
  const query = searchParams.toString()
  const currentPath = query ? `${pathname}?${query}` : pathname

  return (
    <LocaleLinks
      currentPath={currentPath}
      locale={locale}
      compact={compact}
      persistUserLanguage={persistUserLanguage}
    />
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
 * @param {boolean} [root0.persistUserLanguage] - Whether locale changes persist to authenticated user metadata before navigation.
 * @returns {React.ReactElement} The language switcher navigation.
 */
export function LanguageSwitcher({
  className,
  compact = false,
  persistUserLanguage = false,
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
            persistUserLanguage={persistUserLanguage}
          />
        }
      >
        <SearchAwareLinks
          pathname={pathname}
          locale={locale}
          compact={compact}
          persistUserLanguage={persistUserLanguage}
        />
      </Suspense>
    </nav>
  )
}
