'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { navLinks } from './data'

export function PublicTop() {
  const [open, setOpen] = useState(false)
  const menuButtonRef = useRef<HTMLButtonElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    const previous =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null
    const menuButton = menuButtonRef.current

    closeButtonRef.current?.focus()

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false)
        return
      }

      if (event.key !== 'Tab') {
        return
      }

      const focusable = overlayRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )

      if (!focusable?.length) {
        return
      }

      const first = focusable[0]
      const last = focusable[focusable.length - 1]

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      }

      if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      if (previous && document.contains(previous)) {
        previous.focus()
      } else {
        menuButton?.focus()
      }
    }
  }, [open])

  return (
    <>
      <header className="flex items-center justify-between border-b-2 border-[var(--border)] px-4 py-4 llg:px-10">
        <Link
          href="/"
          className="font-serif text-xl font-semibold tracking-[-0.02em] text-[var(--ink)]"
        >
          Lazy <span className="text-[var(--accent)]">Lands</span>
        </Link>

        <nav aria-label="Main" className="flex items-center gap-3">
          {/* Desktop links */}
          <div className="hidden items-center gap-6 llg:flex">
            {navLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="font-mono text-[10.5px] uppercase tracking-[0.06em] text-[var(--ink-2)] hover:text-[var(--ink)]"
              >
                {l.label}
              </Link>
            ))}
          </div>

          {/* Desktop auth */}
          <div className="hidden items-center gap-2 llg:flex">
            <Button asChild variant="ghost" size="sm">
              <Link href="/login">Sign in</Link>
            </Button>
            <Button asChild variant="accent" size="sm">
              <Link href="/register">
                Start<span className="sr-only"> your chronicle</span>
              </Link>
            </Button>
          </div>

          {/* Mobile: CTA + hamburger */}
          <Button asChild variant="accent" size="sm" className="llg:hidden">
            <Link href="/register">
              Start<span className="sr-only"> your chronicle</span>
            </Link>
          </Button>

          <button
            ref={menuButtonRef}
            type="button"
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="llg:hidden flex h-10 w-10 flex-col items-center justify-center gap-[5px] border-2 border-[var(--border)] bg-[var(--paper)] shadow-[2px_2px_0_var(--shadow)]"
          >
            <span
              className={`block h-[2px] w-5 bg-[var(--ink)] transition-transform duration-200 ${open ? 'translate-y-[7px] rotate-45' : ''}`}
            />
            <span
              className={`block h-[2px] w-5 bg-[var(--ink)] transition-opacity duration-200 ${open ? 'opacity-0' : ''}`}
            />
            <span
              className={`block h-[2px] w-5 bg-[var(--ink)] transition-transform duration-200 ${open ? '-translate-y-[7px] -rotate-45' : ''}`}
            />
          </button>
        </nav>
      </header>

      {/* Mobile overlay */}
      {open && (
        <div
          ref={overlayRef}
          role="dialog"
          aria-label="Mobile navigation"
          aria-modal="true"
          className="llg:hidden fixed inset-0 z-mobile-menu flex flex-col bg-[var(--paper)]"
        >
          <div className="flex items-center justify-between border-b-2 border-[var(--border)] px-4 py-4">
            <Link
              href="/"
              className="font-serif text-xl font-semibold text-[var(--ink)]"
              onClick={() => setOpen(false)}
            >
              Lazy <span className="text-[var(--accent)]">Lands</span>
            </Link>
            <button
              ref={closeButtonRef}
              type="button"
              aria-label="Close menu"
              onClick={() => setOpen(false)}
              className="flex h-10 w-10 items-center justify-center border-2 border-[var(--border)] shadow-[2px_2px_0_var(--shadow)]"
            >
              <span className="font-mono text-lg leading-none">✕</span>
            </button>
          </div>

          <div className="flex flex-1 flex-col px-5 py-8">
            {navLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="border-b border-[var(--dotted)] py-4 font-serif text-2xl text-[var(--ink)] hover:text-[var(--accent)]"
              >
                {l.label}
              </Link>
            ))}

            <div className="mt-8 flex flex-col gap-3">
              <Button asChild variant="ghost">
                <Link href="/login" onClick={() => setOpen(false)}>
                  Sign in
                </Link>
              </Button>
              <Button asChild variant="accent">
                <Link href="/register" onClick={() => setOpen(false)}>
                  Start your chronicle →
                </Link>
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
