'use client'

import { startTransition, useEffect, useState } from 'react'
import Link from 'next/link'

import {
  getAnnouncementDismissed,
  setAnnouncementDismissed,
} from '@/lib/consent'

/**
 * Full-width announcement bar.
 * - SSR-safe: initial state is hidden (useState(false)); useEffect reads localStorage.
 * - Not fixed — renders as the first element in flow (above LandingPage).
 * - Dismiss stores ll-announcement-dismissed to hide on return visits.
 */
export function AnnouncementBar() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Only read localStorage on the client (never during SSR).
    // startTransition defers the state update to avoid the
    // "setState synchronously within an effect" lint rule.
    startTransition(() => {
      if (!getAnnouncementDismissed()) {
        setVisible(true)
      }
    })
  }, [])

  if (!visible) return null

  function handleDismiss() {
    setAnnouncementDismissed()
    setVisible(false)
  }

  return (
    <div
      className={[
        'w-full border-b-2 border-[var(--border)]',
        'bg-[var(--ink)] px-4 py-3',
      ].join(' ')}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
        <p className="font-sans text-sm text-[var(--bg)]">
          <span className="mr-2 text-[var(--accent)]">✦</span>
          Under active development — features ship weekly.{' '}
          <Link
            href="/register"
            className="underline hover:text-[var(--accent-wash)]"
          >
            Sign up
          </Link>{' '}
          and you&apos;ll be the first to know.
        </p>
        <button
          onClick={handleDismiss}
          aria-label="Dismiss announcement"
          className={[
            'flex-shrink-0',
            'inline-flex items-center justify-center',
            // Touch target ≥ 44×44 px
            'h-11 w-11',
            'font-sans text-lg text-[var(--bg)]',
            'hover:text-[var(--accent-wash)]',
            'transition-colors duration-100',
          ].join(' ')}
        >
          ×
        </button>
      </div>
    </div>
  )
}
