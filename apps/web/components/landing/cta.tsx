'use client'

import { NavLink, PENDING_SLOT_OVERLAY } from '@/components/navigation/nav-link'
import { useTranslations } from 'next-intl'

import { Button } from '@/components/ui/button'
import { ViewEnter } from './motion'

/**
 * Final CTA section — accent block with register link and demo button.
 *
 * @returns {React.ReactElement} The CTA landing section element.
 */
export function LandCTA() {
  const t = useTranslations('Landing')

  return (
    <section
      id="early-access"
      className="mx-auto w-full max-w-[1420px] px-5 pb-[92px] pt-[20px] llg:px-10"
    >
      <div
        className="relative overflow-hidden border-2 border-[var(--border)]"
        style={{
          background: 'var(--accent)',
          color: 'var(--bg-contrast)',
          padding: '60px 48px',
          boxShadow: '10px 10px 0 var(--shadow)',
        }}
      >
        <div
          aria-hidden="true"
          className="absolute hidden border-2 border-[var(--bg-contrast)] p-4 font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--bg-contrast)] opacity-20 llg:block"
          style={{ top: 28, right: 28, width: 220, transform: 'rotate(2deg)' }}
        >
          <div className="border-b border-[var(--bg-contrast)] pb-2">
            {t('cta.cornerTitle')}
          </div>
          <div className="mt-3 font-serif text-2xl normal-case tracking-normal">
            {t('cta.cornerBeta')}
          </div>
          <div className="mt-3 border-t border-dashed border-[var(--bg-contrast)] pt-2">
            {t('cta.cornerReview')}
          </div>
        </div>

        <ViewEnter>
          <h2
            className="font-serif text-[13vw] llg:text-[72px]"
            style={{
              margin: 0,
              lineHeight: 0.95,
              letterSpacing: '-0.03em',
              maxWidth: 820,
            }}
          >
            {t('cta.title')}
          </h2>
          <p
            style={{
              fontSize: 18,
              marginTop: 18,
              maxWidth: 600,
              lineHeight: 1.5,
              fontFamily: '"Source Serif 4", serif',
            }}
          >
            {t('cta.body')}
          </p>
          <div className="mt-[30px] flex flex-wrap gap-3">
            <Button
              asChild
              variant="ink-inverted"
              className="px-[22px] py-[11px] text-[14.5px]"
            >
              <NavLink
                pendingSlotClassName={PENDING_SLOT_OVERLAY}
                href="/register"
              >
                {t('cta.cta')}
              </NavLink>
            </Button>
            <Button
              asChild
              variant="secondary"
              className="px-[22px] py-[11px] text-[14.5px]"
            >
              <NavLink pendingSlotClassName={PENDING_SLOT_OVERLAY} href="/demo">
                {t('cta.demoCta')}
              </NavLink>
            </Button>
          </div>
        </ViewEnter>
      </div>
    </section>
  )
}
