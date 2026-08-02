'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'

import { usePathname } from '@/i18n/navigation'
import { NavLink } from '@/components/navigation/nav-link'

import { Button } from '@/components/ui/button'
import { LanguageSwitcher } from '@/components/i18n/language-switcher'
import { navLinks } from './data'

/**
 * Sticky top navigation — desktop links + accessible mobile hamburger with focus trap.
 *
 * @returns {React.ReactElement} The top navigation element with desktop and mobile variants.
 */
export function PublicTop() {
  const [openedAt, setOpenedAt] = useState<string | null>(null)
  const t = useTranslations('Nav')
  const tl = useTranslations('Landing')
  const menuButtonRef = useRef<HTMLButtonElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const shouldRestoreFocusRef = useRef(true)
  const pathname = usePathname()
  // Tied to the route it was opened on, so the arriving route closes it without
  // an effect. Closing on click instead would unmount a chosen link's pending
  // affordance before its grace period, leaving a slow navigation silent.
  const open = openedAt !== null && openedAt === pathname

  /**
   * Close the mobile menu overlay, optionally restoring focus to the trigger.
   *
   * @param {object} [root0] - Optional close options.
   * @param {boolean} [root0.restoreFocus=true] - Whether to restore focus to the menu trigger.
   */
  function closeMenu({ restoreFocus = true }: { restoreFocus?: boolean } = {}) {
    shouldRestoreFocusRef.current = restoreFocus
    setOpenedAt(null)
  }

  useEffect(() => {
    if (!open) return

    const previous =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null
    const menuButton = menuButtonRef.current

    closeButtonRef.current?.focus()

    /**
     * Trap Tab/Shift+Tab within the mobile overlay and handle Escape.
     *
     * @param {KeyboardEvent} event - The keyboard event from the keydown listener.
     */
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        closeMenu()
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
      if (shouldRestoreFocusRef.current) {
        if (previous && document.contains(previous)) {
          previous.focus()
        } else {
          menuButton?.focus()
        }
      }
    }
  }, [open])

  const registerCta = (
    <>
      {t('registerShort')}
      <span className="sr-only"> {t('registerSrOnlySuffix')}</span>
    </>
  )

  return (
    <>
      <header className="flex items-center justify-between border-b-2 border-[var(--border)] px-4 py-4 llg:px-10">
        <NavLink
          href="/"
          className="font-serif text-xl font-semibold tracking-[-0.02em] text-[var(--ink)]"
        >
          Lazy <span className="text-[var(--accent)]">Lands</span>
        </NavLink>

        <nav aria-label={t('main')} className="flex items-center gap-3">
          {/* Desktop links */}
          <div className="hidden items-center gap-6 llg:flex">
            {navLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="font-mono text-[10.5px] uppercase tracking-[0.06em] text-[var(--ink-2)] hover:text-[var(--ink)]"
              >
                {tl(`nav.${l.key}`)}
              </Link>
            ))}
          </div>

          {/* Desktop auth */}
          <div className="hidden items-center gap-2 llg:flex">
            <LanguageSwitcher compact />
            <Button asChild variant="ghost" size="sm">
              <NavLink href="/login">{t('signIn')}</NavLink>
            </Button>
            <Button asChild variant="accent" size="sm">
              <NavLink href="/register">{registerCta}</NavLink>
            </Button>
          </div>

          {/* Mobile: CTA + hamburger */}
          <Button asChild variant="accent" size="sm" className="llg:hidden">
            <NavLink href="/register">{registerCta}</NavLink>
          </Button>

          <button
            ref={menuButtonRef}
            type="button"
            aria-label={open ? t('closeMenu') : t('openMenu')}
            aria-expanded={open}
            onClick={() => (open ? closeMenu() : setOpenedAt(pathname))}
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
          aria-label={t('mobileNavigation')}
          aria-modal="true"
          className="llg:hidden fixed inset-0 z-mobile-menu flex flex-col bg-[var(--paper)]"
        >
          <div className="flex items-center justify-between border-b-2 border-[var(--border)] px-4 py-4">
            <NavLink
              href="/"
              className="font-serif text-xl font-semibold text-[var(--ink)]"
            >
              Lazy <span className="text-[var(--accent)]">Lands</span>
            </NavLink>
            <button
              ref={closeButtonRef}
              type="button"
              aria-label={t('closeMenu')}
              onClick={() => closeMenu()}
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
                onClick={() => closeMenu({ restoreFocus: false })}
                className="border-b border-[var(--dotted)] py-4 font-serif text-2xl text-[var(--ink)] hover:text-[var(--accent)]"
              >
                {tl(`nav.${l.key}`)}
              </Link>
            ))}

            <div className="mt-8 flex flex-col gap-3">
              <LanguageSwitcher inline />
              <Button asChild variant="ghost">
                <NavLink href="/login">{t('signIn')}</NavLink>
              </Button>
              <Button asChild variant="accent">
                <NavLink href="/register">{t('register')} →</NavLink>
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
