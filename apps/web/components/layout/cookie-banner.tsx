'use client'

import { startTransition, useEffect, useState } from 'react'
import { NavLink } from '@/components/navigation/nav-link'

import { useTranslations } from 'next-intl'

import { Button } from '@/components/ui/button'
import { getConsent, setConsent } from '@/lib/consent'

/**
 * Fixed cookie consent banner — shown until the user accepts via localStorage.
 *
 * @returns {React.ReactElement|null} The cookie banner element, or null if consent was already given.
 */
export function CookieBanner() {
  const [visible, setVisible] = useState(false)
  const t = useTranslations('Legal')

  useEffect(() => {
    startTransition(() => {
      if (getConsent() === null) {
        setVisible(true)
      }
    })
  }, [])

  if (!visible) return null

  /** Record consent in localStorage and hide the banner. */
  function handleAccept() {
    setConsent()
    setVisible(false)
  }

  return (
    <div
      role="region"
      aria-label={t('cookieNoticeLabel')}
      className={[
        'fixed bottom-0 left-0 right-0 z-cookie-banner',
        'border-t-2 border-[var(--border)]',
        'bg-[var(--paper)] px-6 py-4',
        'shadow-[0_-4px_0_var(--shadow)]',
      ].join(' ')}
    >
      <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-4">
        <p className="font-sans text-sm text-[var(--ink-2)]">
          {t('cookieNoticeBody')}{' '}
          <NavLink href="/cookies" className="text-[var(--accent)] underline">
            {t('learnMore')}
          </NavLink>
        </p>
        <Button onClick={handleAccept} size="sm">
          {t('gotIt')}
        </Button>
      </div>
    </div>
  )
}
