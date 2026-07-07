'use client'

import { startTransition, useEffect, useState } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'

import { Button } from '@/components/ui/button'
import {
  getAnnouncementDismissed,
  setAnnouncementDismissed,
} from '@/lib/consent'

/**
 * Dismissible announcement bar — reads dismissed state from localStorage.
 *
 * @returns {React.ReactElement|null} The announcement bar element, or null if dismissed.
 */
export function AnnouncementBar() {
  const [visible, setVisible] = useState(false)
  const t = useTranslations('Landing')

  useEffect(() => {
    startTransition(() => {
      if (!getAnnouncementDismissed()) {
        setVisible(true)
      }
    })
  }, [])

  if (!visible) return null

  /** Persist dismissal to localStorage and hide the bar. */
  function handleDismiss() {
    setAnnouncementDismissed()
    setVisible(false)
  }

  return (
    <div className="w-full border-b-2 border-[var(--border)] bg-[var(--ink)] px-4 py-3">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
        <p className="font-sans text-sm text-[var(--bg)]">
          <span className="mr-2 text-[var(--accent)]">✦</span>
          {t.rich('announcement.body', {
            signup: (chunks) => (
              <Link
                href="/register"
                className="underline hover:text-[var(--accent-wash)]"
              >
                {chunks}
              </Link>
            ),
          })}
        </p>
        <Button
          onClick={handleDismiss}
          aria-label={t('announcement.dismiss')}
          variant="ghost"
          size="sm"
          className="h-10 w-10 flex-shrink-0 border-[var(--bg)] text-[var(--bg)] hover:bg-transparent hover:text-[var(--accent-wash)]"
        >
          ×
        </Button>
      </div>
    </div>
  )
}
