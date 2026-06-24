import Link from 'next/link'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ComingSoonButton } from './coming-soon-button'
import { HeroCollage } from './hero-collage'

export function LandHero() {
  return (
    <section className="mx-auto w-full max-w-[1180px] px-5 pb-[44px] pt-[52px] llg:px-10">
      <div className="grid grid-cols-1 items-center gap-12 llg:grid-cols-[1.05fr_0.95fr]">
        <div>
          <div className="ll-enter-1 flex flex-wrap gap-2">
            <Badge variant="accent">✦ Open beta</Badge>
            <Badge variant="muted">
              For DMs who actually run long campaigns
            </Badge>
          </div>

          <h1
            className="ll-enter-2 mt-6 font-serif font-semibold text-[13vw] leading-[0.94] tracking-[-0.035em] text-[var(--ink)] llg:text-[82px]"
            style={{ textWrap: 'balance' }}
          >
            Your campaign,
            <br />
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
              without the amnesia
            </span>
            .
          </h1>

          <p
            className="ll-enter-3 mt-[26px] mb-[32px] max-w-[500px] text-[var(--ink-2)]"
            style={{
              fontSize: 18.5,
              lineHeight: 1.5,
              fontFamily: '"Source Serif 4", serif',
            }}
          >
            The companion that remembers every NPC, every faction and every
            consequence, so you prep the next session in minutes, and the world
            remembers what your players did.
          </p>

          <div className="ll-enter-4 flex flex-wrap items-center gap-3">
            <Button
              asChild
              variant="accent"
              style={{ fontSize: 14.5, padding: '11px 22px' }}
            >
              <Link href="/register">Start your chronicle →</Link>
            </Button>
            <ComingSoonButton>✦ See it on a real campaign</ComingSoonButton>
          </div>

          <div className="ll-enter-5 mt-[30px] flex flex-wrap gap-[22px] font-mono text-[11px] uppercase tracking-[0.04em] text-[var(--mute)]">
            <span>✓ No card</span>
            <span>✓ AI-assisted, DM-controlled</span>
            <span>✓ Export anytime</span>
          </div>
        </div>

        <HeroCollage />
      </div>
    </section>
  )
}
