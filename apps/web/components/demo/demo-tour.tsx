'use client'

import { useCallback, useEffect, useRef } from 'react'
import { useTranslations } from 'next-intl'

import 'driver.js/dist/driver.css'

/** localStorage key prefix marking that a screen's guided tour has auto-run once. */
const TOUR_SEEN_KEY_PREFIX = 'lazylands-demo-tour-seen'

/** One driver.js callout: an optional anchor plus its localized copy. */
export type DemoTourStep = {
  /** CSS selector for a `data-tour` anchor, or omitted for an unanchored popover. */
  element?: string
  title: string
  description: string
}

type DemoTourProps = {
  /**
   * Identifies this tour for its own auto-run/localStorage state, so each
   * demo screen's guided tour tracks "seen" independently of the others.
   */
  tourKey: string
  /** The localized callouts this screen's tour walks through, in order. */
  steps: DemoTourStep[]
}

/**
 * Guided product tour for a demo screen, powered by driver.js. Auto-runs once
 * per browser per `tourKey`; a visible button lets the DM replay it anytime.
 *
 * driver.js touches `document` on construction, so it is imported lazily
 * inside the click/auto-run handler to keep the module import server-safe.
 *
 * @param {object} root0 - The demo tour props.
 * @param {string} root0.tourKey - Identifies this screen's tour for its own seen-state.
 * @param {DemoTourStep[]} root0.steps - The localized callouts to walk through.
 * @returns {React.ReactElement} The replay-tour button element.
 */
export function DemoTour({ tourKey, steps }: DemoTourProps) {
  const t = useTranslations('Demo.tour')
  const autoStarted = useRef(false)
  const seenKey = `${TOUR_SEEN_KEY_PREFIX}-${tourKey}`

  const start = useCallback(async () => {
    if (typeof document === 'undefined') return
    const { driver } = await import('driver.js')
    driver({
      showProgress: true,
      nextBtnText: t('next'),
      prevBtnText: t('prev'),
      doneBtnText: t('done'),
      steps: steps.map((step) => ({
        element: step.element,
        popover: { title: step.title, description: step.description },
      })),
    }).drive()
  }, [t, steps])

  useEffect(() => {
    if (autoStarted.current) return

    let seen = false
    try {
      seen = window.localStorage.getItem(seenKey) === '1'
    } catch {
      // Private mode / disabled storage — treat as unseen but never crash.
    }
    if (seen) return

    const timer = window.setTimeout(() => {
      // Mark auto-run as done only once the timer actually fires. Setting it on
      // mount would let React Strict Mode's dev mount→unmount→remount (refs are
      // preserved, but the timer is cancelled on unmount) return early forever,
      // so the tour would never auto-run in development.
      autoStarted.current = true
      try {
        window.localStorage.setItem(seenKey, '1')
      } catch {
        // Ignore storage failures; the tour simply may auto-run again later.
      }
      void start()
    }, 500)

    return () => window.clearTimeout(timer)
  }, [start, seenKey])

  return (
    <div className="mb-4 flex justify-end">
      <button
        type="button"
        onClick={() => void start()}
        className="inline-flex items-center gap-2 border-2 border-[var(--border)] bg-[var(--paper)] px-3 py-2 font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--ink)] shadow-[3px_3px_0_var(--shadow)] transition-[transform,box-shadow] duration-100 ease-out hover:translate-x-[1.5px] hover:translate-y-[1.5px] hover:shadow-[1.5px_1.5px_0_var(--shadow)]"
      >
        <span aria-hidden="true">✦</span>
        {t('replay')}
      </button>
    </div>
  )
}
