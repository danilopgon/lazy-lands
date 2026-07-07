'use client'

import { useTranslations } from 'next-intl'

import { OriginBadge } from '@/components/ui/origin-badge'
import { SectionHeader } from '@/components/ui/section-header'
import { StatLedger } from '@/components/ui/stat-ledger'

import { ViewEnter } from './motion'

type MemoryLoopItem = { label: string; title: string; body: string }
type ContinuityStat = { value: string; label: string }

/**
 * Product pillars section — memory loop steps and continuity stats with a "memory in play" callout.
 *
 * @returns {React.ReactElement} The pillars landing section element.
 */
export function LandPillars() {
  const t = useTranslations('Landing')
  const memoryLoop = t.raw('pillars.loop') as MemoryLoopItem[]
  const continuityStats = t.raw('pillars.stats') as ContinuityStat[]

  return (
    <section
      id="product"
      className="mx-auto w-full max-w-[1420px] px-5 pb-[48px] pt-[88px] llg:px-10"
    >
      <div className="mb-10 max-w-[700px]">
        <SectionHeader
          kicker={t('pillars.kicker')}
          title={t('pillars.title')}
          description={t('pillars.description')}
        />
      </div>

      <div className="grid grid-cols-1 gap-8 llg:grid-cols-[1.2fr_0.8fr]">
        <ViewEnter>
          <div className="border-y-[3px] border-[var(--line-strong)] bg-[color-mix(in_srgb,var(--paper)_72%,transparent)]">
            {memoryLoop.map((item, index) => (
              <article
                key={item.label}
                className="grid grid-cols-[110px_1fr] items-start gap-6 border-b border-[var(--line)] px-4 py-6 last:border-b-0 llg:grid-cols-[126px_1fr] llg:px-5"
              >
                <div className="pt-[3px]">
                  <div className="mb-1 font-mono text-[9.5px] font-semibold uppercase tracking-[0.1em] text-[var(--accent-deep)]">
                    0{index + 1}
                  </div>
                  <div className="font-mono text-[18px] font-semibold uppercase leading-none tracking-[0.02em] text-[var(--ink)]">
                    {item.label}
                  </div>
                </div>
                <div>
                  <h3 className="font-serif text-[24px] font-semibold leading-tight tracking-[-0.015em] text-[var(--ink)]">
                    {item.title}
                  </h3>
                  <p className="mt-2 max-w-[58ch] text-sm leading-relaxed text-[var(--ink-2)]">
                    {item.body}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </ViewEnter>

        <ViewEnter delay={120}>
          <div className="space-y-5">
            <StatLedger items={continuityStats} />
            <div className="border-2 border-[var(--accent)] bg-[var(--accent-wash)] p-5">
              <div className="flex items-center justify-between gap-4">
                <h3 className="font-serif text-2xl font-semibold text-[var(--ink)]">
                  {t('pillars.memoryPlayTitle')}
                </h3>
                <OriginBadge origin="scribe" />
              </div>
              <p className="mt-3 font-serif text-[15px] leading-relaxed text-[var(--ink)]">
                {t('pillars.memoryPlayBody')}
              </p>
              <div className="mt-4 flex flex-wrap gap-2 font-mono text-[10px] uppercase tracking-[0.06em] text-[var(--accent-deep)]">
                <span className="border border-[var(--accent)] bg-[var(--paper)] px-2 py-1">
                  {t('pillars.tagAccepted')}
                </span>
                <span className="border border-[var(--accent)] bg-[var(--paper)] px-2 py-1">
                  {t('pillars.tagNpc')}
                </span>
                <span className="border border-[var(--accent)] bg-[var(--paper)] px-2 py-1">
                  {t('pillars.tagSession')}
                </span>
              </div>
            </div>
          </div>
        </ViewEnter>
      </div>
    </section>
  )
}
