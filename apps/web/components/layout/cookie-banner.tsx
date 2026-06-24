'use client'

import { startTransition, useEffect, useState } from 'react'
import Link from 'next/link'

import { getConsent, setConsent } from '@/lib/consent'

export function CookieBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    startTransition(() => {
      if (getConsent() === null) {
        setVisible(true)
      }
    })
  }, [])

  if (!visible) return null

  function handleAccept() {
    setConsent()
    setVisible(false)
  }

  return (
    <div
      role="region"
      aria-label="Cookie notice"
      className={[
        'fixed bottom-0 left-0 right-0 z-cookie-banner',
        'border-t-2 border-[var(--border)]',
        'bg-[var(--paper)] px-6 py-4',
        'shadow-[0_-4px_0_var(--shadow)]',
      ].join(' ')}
    >
      <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-4">
        <p className="font-sans text-sm text-[var(--ink-2)]">
          Lazy Lands uses cookies for authentication only. No tracking, no
          third-party data.{' '}
          <Link href="/cookies" className="text-[var(--accent)] underline">
            Learn more
          </Link>
        </p>
        <button
          onClick={handleAccept}
          className={[
            'inline-flex items-center justify-center whitespace-nowrap',
            'border-2 border-[var(--border)] font-sans text-sm font-semibold',
            'bg-[var(--ink)] text-[var(--bg)]',
            'shadow-[3px_3px_0_var(--shadow)]',
            'h-9 px-4',
            'hover:translate-x-[1.5px] hover:translate-y-[1.5px] hover:shadow-[1.5px_1.5px_0_var(--shadow)]',
            'active:translate-x-[3px] active:translate-y-[3px] active:shadow-none',
            'transition-[transform,box-shadow] duration-100',
          ].join(' ')}
        >
          Got it
        </button>
      </div>
    </div>
  )
}
