'use client'

import { NavLink, PENDING_SLOT_OVERLAY } from '@/components/navigation/nav-link'
import { useTranslations } from 'next-intl'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { HeroGraphSlot } from './hero-graph-slot'

/**
 * Hero section — headline, sub-copy, CTAs, and the desktop graph slot.
 *
 * @returns {React.ReactElement} The hero landing section element.
 */
export function LandHero() {
  const t = useTranslations('Landing')

  return (
    <section className="relative flex w-full flex-col justify-center overflow-hidden py-12 llg:min-h-[calc(100dvh-150px)]">
      {/* One contained band: copy and graph share a single tight gutter and the
          same vertical centre, so they read as one composition — not two
          elements stranded in opposite corners. */}
      <div className="mx-auto grid w-full max-w-[1420px] grid-cols-1 items-center gap-y-12 px-6 llg:grid-cols-2 llg:gap-x-12 llg:px-10">
        {/* ── Copy ── */}
        <div className="llg:max-w-[560px]">
          <div className="ll-enter-1 flex flex-wrap gap-2">
            <Badge variant="accent">{t('hero.badgeBeta')}</Badge>
            <Badge variant="muted">{t('hero.badgeAudience')}</Badge>
          </div>

          <h1
            className="ll-enter-2 mt-6 font-serif font-semibold text-[13vw] leading-[0.94] tracking-[-0.035em] text-[var(--ink)] llg:text-[82px]"
            style={{ textWrap: 'balance' }}
          >
            {t.rich('hero.title', {
              break: () => <br />,
              accent: (chunks) => (
                <span
                  style={{
                    fontStyle: 'italic',
                    color: 'var(--accent)',
                    textDecoration: 'underline',
                    textDecorationColor: 'var(--ink)',
                    textDecorationThickness: '5px',
                    textUnderlineOffset: '8px',
                    textDecorationSkipInk: 'none',
                  }}
                >
                  {chunks}
                </span>
              ),
            })}
          </h1>

          <p
            className="ll-enter-3 mb-[32px] mt-[26px] max-w-[500px] text-[var(--ink-2)]"
            style={{
              fontSize: 18.5,
              lineHeight: 1.5,
              fontFamily: '"Source Serif 4", serif',
            }}
          >
            {t('hero.body')}
          </p>

          <div className="ll-enter-4 flex flex-wrap items-center gap-3">
            <Button
              asChild
              variant="accent"
              className="px-[22px] py-[11px] text-[14.5px]"
            >
              <NavLink
                pendingSlotClassName={PENDING_SLOT_OVERLAY}
                href="/register"
              >
                {t('hero.cta')}
              </NavLink>
            </Button>
            <Button
              asChild
              variant="secondary"
              className="px-[22px] py-[11px] text-[14.5px]"
            >
              <NavLink pendingSlotClassName={PENDING_SLOT_OVERLAY} href="/demo">
                {t('hero.demoCta')}
              </NavLink>
            </Button>
          </div>

          <div className="ll-enter-5 mt-[30px] flex flex-wrap gap-[22px] font-mono text-[11px] uppercase tracking-[0.04em] text-[var(--mute)]">
            <span>{t('hero.metaBeta')}</span>
            <span>{t('hero.metaScribe')}</span>
            <span>{t('hero.metaFree')}</span>
          </div>
        </div>

        {/* ── Graph — a square plate sized by its own column, so it sits right
            beside the copy on a shared grid. Desktop-only and lazy-loaded so
            mobile never ships the animation code (see HeroGraphSlot). ── */}
        <HeroGraphSlot />
      </div>
    </section>
  )
}
