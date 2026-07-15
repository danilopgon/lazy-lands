'use client'

import { useCallback, useEffect, useRef } from 'react'
import { useTranslations } from 'next-intl'

import 'driver.js/dist/driver.css'

/** localStorage key marking that the guided tour has auto-run once. */
const TOUR_SEEN_KEY = 'lazylands-demo-tour-seen'

/**
 * Guided product tour for the demo, powered by driver.js. It highlights the
 * key surfaces on the campaign screen (world state, stats, memory, prepare) and
 * auto-runs once per browser; a visible button lets the DM replay it anytime.
 *
 * driver.js touches `document` on construction, so it is imported lazily inside
 * the click/auto-run handler to keep the module import server-safe.
 *
 * @returns {React.ReactElement} The replay-tour button element.
 */
export function DemoTour() {
  const t = useTranslations('Demo.tour')
  const autoStarted = useRef(false)

  const start = useCallback(async () => {
    if (typeof document === 'undefined') return
    const { driver } = await import('driver.js')
    driver({
      showProgress: true,
      nextBtnText: t('next'),
      prevBtnText: t('prev'),
      doneBtnText: t('done'),
      steps: [
        {
          popover: { title: t('welcomeTitle'), description: t('welcomeBody') },
        },
        {
          element: '[data-tour="world-state"]',
          popover: {
            title: t('worldStateTitle'),
            description: t('worldStateBody'),
          },
        },
        {
          element: '[data-tour="stats"]',
          popover: { title: t('statsTitle'), description: t('statsBody') },
        },
        {
          element: '[data-tour="memory"]',
          popover: { title: t('memoryTitle'), description: t('memoryBody') },
        },
        {
          element: '[data-tour="prepare"]',
          popover: { title: t('prepareTitle'), description: t('prepareBody') },
        },
        {
          popover: { title: t('outroTitle'), description: t('outroBody') },
        },
      ],
    }).drive()
  }, [t])

  useEffect(() => {
    if (autoStarted.current) return
    autoStarted.current = true

    let seen = false
    try {
      seen = window.localStorage.getItem(TOUR_SEEN_KEY) === '1'
    } catch {
      // Private mode / disabled storage — treat as unseen but never crash.
    }
    if (seen) return

    const timer = window.setTimeout(() => {
      try {
        window.localStorage.setItem(TOUR_SEEN_KEY, '1')
      } catch {
        // Ignore storage failures; the tour simply may auto-run again later.
      }
      void start()
    }, 500)

    return () => window.clearTimeout(timer)
  }, [start])

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
