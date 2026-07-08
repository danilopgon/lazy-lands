'use client'

import {
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent,
} from 'react'
import Link from 'next/link'
import { useLocale, useTranslations } from 'next-intl'
import { useRouter, useSearchParams } from 'next/navigation'

import { usePathname } from '@/i18n/navigation'
import { routing, type AppLocale } from '@/i18n/routing'
import { localeMeta } from '@/i18n/locales'
import { buildLocalizedPath } from '@/lib/format'
import { cn } from '@/lib/utils'

type LanguageSwitcherProps = {
  className?: string
  /** Collapse the trigger to the two-letter code (headers with tight chrome). */
  compact?: boolean
  /**
   * Render every locale as a directly-visible stacked list instead of a
   * collapsible dropdown. Used in the mobile overlay, where vertical room is
   * plentiful and an extra tap would be pure friction.
   */
  inline?: boolean
  /**
   * Persist the chosen locale to the authenticated user's metadata before
   * navigating. Enabled inside the authenticated area so the Scribe's emails
   * follow the DM's language; left off for the public switcher.
   */
  persistUserLanguage?: boolean
}

const optionClassName =
  'block px-3 py-2 font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--ink-2)] transition-colors hover:bg-[var(--bg)] hover:text-[var(--ink)] focus-visible:bg-[var(--bg)] focus-visible:text-[var(--ink)] focus-visible:outline-none data-[active=true]:bg-[var(--accent)] data-[active=true]:text-white'

/**
 * Render one locale-switching link per supported locale.
 *
 * Each link is a real per-locale `<a>` with `hrefLang` and `aria-current`, so
 * switching works without JavaScript and stays crawlable. The list is derived
 * from `routing.locales`, never a hardcoded pair. When `persistUserLanguage` is
 * set, choosing a new locale writes it to the user's metadata before
 * navigating; a persistence failure never blocks the navigation.
 *
 * @param {object} root0 - Link props.
 * @param {string} root0.currentPath - The current path, optionally with a query string.
 * @param {string} root0.locale - The active locale, used to mark the current link.
 * @param {boolean} root0.persistUserLanguage - Whether to persist the locale to user metadata.
 * @param {() => void} [root0.onNavigate] - Optional callback fired when a link is chosen.
 * @returns {React.ReactElement} The list of locale links.
 */
function LocaleLinks({
  currentPath,
  locale,
  persistUserLanguage,
  onNavigate,
}: {
  currentPath: string
  locale: string
  persistUserLanguage: boolean
  onNavigate?: () => void
}) {
  const router = useRouter()

  /**
   * Handle a locale choice: dismiss any disclosure, then (when persistence is
   * enabled and the locale actually changes) write the preference to user
   * metadata before navigating. Navigation always proceeds even if the write
   * fails, so a Supabase hiccup never traps the DM on the current locale.
   *
   * @param {MouseEvent<HTMLAnchorElement>} event - The link click event.
   * @param {AppLocale} nextLocale - The locale the link switches to.
   * @param {string} href - The resolved destination path.
   */
  async function handleClick(
    event: MouseEvent<HTMLAnchorElement>,
    nextLocale: AppLocale,
    href: string
  ) {
    onNavigate?.()

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

  return (
    <>
      {routing.locales.map((code) => {
        const active = code === locale
        const href = buildLocalizedPath(currentPath, code)
        return (
          <Link
            key={code}
            href={href}
            hrefLang={code}
            data-active={active}
            aria-current={active ? 'true' : undefined}
            onClick={(event) => handleClick(event, code, href)}
            className={optionClassName}
          >
            {localeMeta[code].label}
          </Link>
        )
      })}
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
 * @param {boolean} root0.persistUserLanguage - Whether to persist the locale to user metadata.
 * @param {() => void} [root0.onNavigate] - Optional callback fired when a link is chosen.
 * @returns {React.ReactElement} The query-preserving locale links.
 */
function SearchAwareLinks({
  pathname,
  locale,
  persistUserLanguage,
  onNavigate,
}: {
  pathname: string
  locale: string
  persistUserLanguage: boolean
  onNavigate?: () => void
}) {
  const searchParams = useSearchParams()
  const query = searchParams.toString()
  const currentPath = query ? `${pathname}?${query}` : pathname

  return (
    <LocaleLinks
      currentPath={currentPath}
      locale={locale}
      persistUserLanguage={persistUserLanguage}
      onNavigate={onNavigate}
    />
  )
}

/**
 * Render the hard-edged switcher for changing the active locale.
 *
 * By default this is a `<details>` disclosure: a collapsed trigger showing the
 * current locale, opening a panel of per-locale links. The disclosure works
 * without JavaScript (native `<details>` toggle) and scales to any number of
 * locales. Pass `inline` to skip the disclosure and render the links directly
 * (mobile overlay). The current pathname and locale come from next-intl context
 * (not `window.location`) so server and client render identical hrefs.
 *
 * @param {LanguageSwitcherProps} root0 - Switcher props.
 * @param {string} [root0.className] - Optional classes for placement.
 * @param {boolean} [root0.compact] - Collapse the trigger to the locale code.
 * @param {boolean} [root0.inline] - Render links directly, without a disclosure.
 * @param {boolean} [root0.persistUserLanguage] - Persist the locale to user metadata before navigating.
 * @returns {React.ReactElement} The language switcher navigation.
 */
export function LanguageSwitcher({
  className,
  compact = false,
  inline = false,
  persistUserLanguage = false,
}: LanguageSwitcherProps) {
  const t = useTranslations('Nav')
  // next-intl types useLocale() as string; the active locale is always one of
  // routing.locales (validated in the locale layout), so narrow it for the
  // localeMeta lookups below.
  const locale = useLocale() as AppLocale
  const pathname = usePathname()
  const detailsRef = useRef<HTMLDetailsElement>(null)
  const summaryRef = useRef<HTMLElement>(null)
  const [open, setOpen] = useState(false)

  // Collapse the native <details> and mirror the state flag. Used both by the
  // dismissal listeners below and by onNavigate, so a locale click closes the
  // disclosure immediately even while persistUserLanguage awaits Supabase.
  const closeDisclosure = useCallback(() => {
    if (detailsRef.current) {
      detailsRef.current.open = false
    }
    setOpen(false)
  }, [])

  // Escape and outside-click close the disclosure and restore focus to the
  // trigger. Native <details> handles the click-toggle and no-JS case; this
  // only layers on the dismissal affordances a bare <details> lacks.
  useEffect(() => {
    if (!open) return

    /**
     * Close when a pointer press lands outside the disclosure.
     *
     * @param {globalThis.MouseEvent} event - The document pointer event.
     */
    function handlePointerDown(event: globalThis.MouseEvent) {
      if (
        detailsRef.current &&
        !detailsRef.current.contains(event.target as Node)
      ) {
        closeDisclosure()
      }
    }

    /**
     * Close on Escape and return focus to the trigger.
     *
     * @param {KeyboardEvent} event - The document keyboard event.
     */
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        closeDisclosure()
        summaryRef.current?.focus()
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open, closeDisclosure])

  const links = (
    <Suspense
      fallback={
        <LocaleLinks
          currentPath={pathname}
          locale={locale}
          persistUserLanguage={persistUserLanguage}
        />
      }
    >
      <SearchAwareLinks
        pathname={pathname}
        locale={locale}
        persistUserLanguage={persistUserLanguage}
        onNavigate={inline ? undefined : closeDisclosure}
      />
    </Suspense>
  )

  if (inline) {
    return (
      <nav
        aria-label={t('language')}
        className={cn(
          'flex flex-col border border-[var(--border)] bg-[var(--paper)] shadow-[2px_2px_0_var(--shadow)]',
          className
        )}
      >
        {links}
      </nav>
    )
  }

  return (
    <details
      ref={detailsRef}
      onToggle={(event) => setOpen(event.currentTarget.open)}
      className={cn('relative', className)}
    >
      <summary
        ref={summaryRef}
        aria-label={t('language')}
        className={cn(
          'flex h-9 cursor-pointer list-none select-none items-center gap-1.5 whitespace-nowrap border-2 border-[var(--border)] bg-[var(--paper)] px-3 font-mono text-xs font-semibold uppercase tracking-[0.1em] text-[var(--ink-2)] shadow-[3px_3px_0_var(--shadow)] transition-[transform,box-shadow] duration-100 ease-out hover:translate-x-[1.5px] hover:translate-y-[1.5px] hover:text-[var(--ink)] hover:shadow-[1.5px_1.5px_0_var(--shadow)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none [&::-webkit-details-marker]:hidden'
        )}
      >
        <span>
          {compact ? localeMeta[locale].short : localeMeta[locale].label}
        </span>
        <span aria-hidden className="text-[8px] leading-none opacity-70">
          ▾
        </span>
      </summary>
      <div
        role="group"
        aria-label={t('language')}
        className="absolute right-0 z-20 mt-1 min-w-[8rem] border border-[var(--border)] bg-[var(--paper)] shadow-[4px_4px_0_var(--shadow)]"
      >
        {links}
      </div>
    </details>
  )
}
