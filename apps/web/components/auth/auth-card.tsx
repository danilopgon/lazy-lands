'use client'

import type { ReactNode } from 'react'
import { NavLink } from '@/components/navigation/nav-link'
import { useTranslations } from 'next-intl'

/** Tailwind className string for the shared auth back-to-home link. */
export const authBackHomeClass =
  'mb-6 inline-flex rounded-none border-2 border-[var(--border)] px-3 py-2 font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--accent-deep)] shadow-[3px_3px_0_var(--shadow)] transition-transform hover:translate-x-[1.5px] hover:translate-y-[1.5px] hover:shadow-[1.5px_1.5px_0_var(--shadow)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--paper)] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none motion-reduce:transition-none motion-reduce:hover:translate-x-0 motion-reduce:hover:translate-y-0 motion-reduce:hover:shadow-[3px_3px_0_var(--shadow)] motion-reduce:active:translate-x-0 motion-reduce:active:translate-y-0'

/**
 * Shared frame for all auth pages — neo-brutalist paper card centered on the
 * background canvas. Zero border-radius throughout; hard ink shadow at 6 6 0.
 *
 * @param {object}   props          - Component props.
 * @param {ReactNode} props.children - Card body content.
 * @returns {React.ReactElement} The auth page shell with centered card.
 */
export function AuthCard({ children }: { children: ReactNode }) {
  const t = useTranslations('Auth')

  return (
    <main
      id="main-content"
      className="flex min-h-[100dvh] flex-col items-center justify-center bg-[var(--bg)] px-6 py-16"
    >
      <div className="w-full max-w-[440px] rounded-none border-2 border-[var(--border)] bg-[var(--paper)] p-8 shadow-[6px_6px_0_var(--shadow)]">
        <NavLink href="/" className={authBackHomeClass}>
          {t('backHome')}
        </NavLink>
        {children}
      </div>
    </main>
  )
}

/**
 * Tailwind className string for auth Input elements — flat border, accent focus
 * shadow, no ring. Apply via `className` on the shadcn Input component.
 */
export const authInputClass =
  'rounded-none border-2 border-[var(--border)] bg-[var(--paper)] focus-visible:border-[var(--accent)] focus-visible:shadow-[3px_3px_0_var(--accent)] focus-visible:ring-0'

/**
 * Tailwind className string for the primary auth submit Button — tactile press
 * micro-interaction with reduced-motion fallback. Apply via `className` on the
 * shadcn Button component.
 */
export const authButtonClass =
  'rounded-none border-2 border-[var(--border)] bg-[var(--ink)] text-[var(--paper)] shadow-[3px_3px_0_var(--shadow)] transition-transform active:translate-x-[3px] active:translate-y-[3px] active:shadow-none motion-reduce:transition-none motion-reduce:active:translate-x-0 motion-reduce:active:translate-y-0 motion-reduce:active:shadow-[3px_3px_0_var(--shadow)]'
