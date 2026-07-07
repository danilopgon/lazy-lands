'use client'

import { useTranslations } from 'next-intl'

import { Spec, BriefingMock } from './briefing-mock'
import { ViewEnter } from './motion'

type BriefingSpec = { k: string; v: string }

/**
 * Briefing section — side-by-side copy and tilted mock card.
 *
 * @returns {React.ReactElement} The briefing landing section element.
 */
export function LandBriefing() {
  const t = useTranslations('Landing')
  const specs = t.raw('briefing.specs') as BriefingSpec[]

  return (
    <section className="mx-auto w-full max-w-[1420px] px-5 pb-[88px] pt-[56px] llg:px-10">
      <div className="grid grid-cols-1 items-center gap-[56px] llg:grid-cols-2">
        {/* Copy: first on mobile, second on desktop */}
        <ViewEnter className="llg:order-2">
          <h2
            className="font-serif text-[var(--ink)]"
            style={{
              fontSize: 46,
              margin: 0,
              lineHeight: 1.02,
              letterSpacing: '-0.022em',
            }}
          >
            {t('briefing.title')}
          </h2>
          <p
            className="text-[var(--ink-2)]"
            style={{
              fontSize: 16.5,
              marginTop: 22,
              lineHeight: 1.55,
              fontFamily: '"Source Serif 4", serif',
            }}
          >
            {t.rich('briefing.body', { em: (chunks) => <em>{chunks}</em> })}
          </p>

          <div className="mt-[26px] grid grid-cols-2 gap-4">
            {specs.map((spec) => (
              <Spec key={spec.k} k={spec.k} v={spec.v} />
            ))}
          </div>
        </ViewEnter>

        {/* Mock card: second on mobile, first on desktop */}
        <div className="llg:order-1">
          <BriefingMock />
        </div>
      </div>
    </section>
  )
}
