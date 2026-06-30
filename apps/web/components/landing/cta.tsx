import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { ComingSoonButton } from './coming-soon-button'
import { ViewEnter } from './motion'

/**
 * Final CTA section — accent block with register link and demo button.
 *
 * @returns {React.ReactElement} The CTA landing section element.
 */
export function LandCTA() {
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
            Chronicle entry
          </div>
          <div className="mt-3 font-serif text-2xl normal-case tracking-normal">
            Open beta
          </div>
          <div className="mt-3 border-t border-dashed border-[var(--bg-contrast)] pt-2">
            DM review required
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
            Start your first chronicle.
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
            Free while in early access. Start with one campaign and keep every
            accepted memory reviewable from the first session.
          </p>
          <div className="mt-[30px] flex flex-wrap gap-3">
            <Button
              asChild
              variant="ink-inverted"
              style={{ fontSize: 14.5, padding: '11px 22px' }}
            >
              <Link href="/register">Start your chronicle →</Link>
            </Button>
            <ComingSoonButton variant="secondary">
              Tour a demo campaign
            </ComingSoonButton>
          </div>
        </ViewEnter>
      </div>
    </section>
  )
}
