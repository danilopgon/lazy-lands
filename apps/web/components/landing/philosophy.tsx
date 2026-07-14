'use client'

import { useTranslations } from 'next-intl'

import { ViewEnter } from './motion'

/**
 * Philosophy section — single pull-quote with attribution line.
 *
 * @returns {React.ReactElement} The philosophy landing section element.
 */
export function LandPhilosophy() {
  const t = useTranslations('Landing')

  return (
    <section className="mx-auto w-full max-w-[1420px] px-5 py-[56px] llg:px-10">
      <div className="mb-[40px] h-[1px] bg-[var(--border)]" />
      <ViewEnter>
        <blockquote
          className="m-0 font-serif text-[var(--ink)]"
          style={
            {
              fontSize: 34,
              lineHeight: 1.2,
              letterSpacing: '-0.012em',
              textWrap: 'balance',
            } as React.CSSProperties
          }
        >
          <span style={{ color: 'var(--accent)' }} aria-hidden="true">
            &ldquo;
          </span>
          {t('philosophy.quote')}
          <span style={{ color: 'var(--accent)' }} aria-hidden="true">
            &rdquo;
          </span>
        </blockquote>
        <cite
          className="mt-[18px] block font-mono uppercase not-italic tracking-[0.08em]"
          style={{ fontSize: 11, color: 'var(--accent-deep)' }}
        >
          {t('philosophy.caption')}
        </cite>
      </ViewEnter>
    </section>
  )
}
