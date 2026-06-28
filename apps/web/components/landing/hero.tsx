import Link from 'next/link'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ComingSoonButton } from './coming-soon-button'
import { HeroGraphSlot } from './hero-graph-slot'

export function LandHero() {
  return (
    <section className="relative flex w-full flex-col justify-center overflow-hidden py-12 llg:min-h-[calc(100dvh-150px)]">
      {/* One contained band: copy and graph share a single tight gutter and the
          same vertical centre, so they read as one composition — not two
          elements stranded in opposite corners. */}
      <div className="mx-auto grid w-full max-w-[1420px] grid-cols-1 items-center gap-y-12 px-6 llg:grid-cols-2 llg:gap-x-12 llg:px-10">
        {/* ── Copy ── */}
        <div className="llg:max-w-[560px]">
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
            className="ll-enter-3 mb-[32px] mt-[26px] max-w-[500px] text-[var(--ink-2)]"
            style={{
              fontSize: 18.5,
              lineHeight: 1.5,
              fontFamily: '"Source Serif 4", serif',
            }}
          >
            The companion that remembers every NPC, every faction and every
            consequence, so your next session starts from accepted memory, and
            the world remembers what your players did.
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
            <span>Open beta</span>
            <span>The Scribe proposes, you decide</span>
            <span>Free while in early access</span>
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
