'use client'

import { startTransition, useEffect, useState } from 'react'
import Link from 'next/link'

import {
  getAnnouncementDismissed,
  setAnnouncementDismissed,
} from '@/lib/consent'

export function AnnouncementBar() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
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
    <div className="w-full border-b-2 border-[var(--border)] bg-[var(--ink)] px-4 py-3">
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
          className="inline-flex h-11 w-11 flex-shrink-0 items-center justify-center font-sans text-lg text-[var(--bg)] transition-colors duration-100 hover:text-[var(--accent-wash)]"
        >
          ×
        </button>
      </div>
    </div>
  )
}
