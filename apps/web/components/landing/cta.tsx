import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { ComingSoonButton } from './coming-soon-button'

export function LandCTA() {
  return (
    <section
      id="pricing"
      className="mx-auto w-full max-w-[1180px] px-5 pb-[92px] pt-[20px] llg:px-10"
    >
      <div
        className="relative overflow-hidden border-2 border-[var(--border)]"
        style={{
          background: 'var(--accent)',
          color: '#FBF4EC',
          padding: '60px 48px',
          boxShadow: '10px 10px 0 var(--shadow)',
        }}
      >
        {/* Decorative concentric circles */}
        <div
          aria-hidden="true"
          className="absolute"
          style={{ top: -40, right: -40, opacity: 0.14 }}
        >
          <svg width="300" height="300" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="40"
              fill="none"
              stroke="#FBF4EC"
              strokeWidth="1"
            />
            <circle
              cx="50"
              cy="50"
              r="28"
              fill="none"
              stroke="#FBF4EC"
              strokeWidth="1"
            />
            <circle
              cx="50"
              cy="50"
              r="16"
              fill="none"
              stroke="#FBF4EC"
              strokeWidth="1"
            />
            <path
              d="M50 6 L50 94 M6 50 L94 50 M20 20 L80 80 M20 80 L80 20"
              stroke="#FBF4EC"
              strokeWidth="0.5"
            />
          </svg>
        </div>

        <div className="relative">
          <div
            className="mb-3 font-mono text-[10px] uppercase tracking-[0.1em]"
            style={{ color: '#FBF4EC' }}
          >
            / start now
          </div>
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
            Free while in early access. Bring one campaign or five. No card, no
            session limit, no excuses.
          </p>
          <div className="mt-[30px] flex flex-wrap gap-3">
            <Button
              asChild
              style={{
                background: 'var(--ink)',
                color: '#FBF4EC',
                borderColor: 'var(--ink)',
                fontSize: 14.5,
                padding: '11px 22px',
                boxShadow: '4px 4px 0 rgba(0,0,0,0.3)',
              }}
            >
              <Link href="/register">Create account →</Link>
            </Button>
            <ComingSoonButton variant="secondary">
              Tour a demo campaign
            </ComingSoonButton>
          </div>
        </div>
      </div>
    </section>
  )
}
