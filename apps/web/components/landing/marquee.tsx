'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'

/**
 * Infinite CSS-animation marquee — pauses on hover/focus for accessibility.
 *
 * @returns {React.ReactElement} The marquee landing section element.
 */
export function LandMarquee() {
  const [paused, setPaused] = useState(false)
  const t = useTranslations('Landing')
  const marqueeItems = t.raw('marquee') as string[]
  const all = [...marqueeItems, ...marqueeItems]
  return (
    <div
      className="overflow-hidden border-y-2 border-[var(--border)] bg-[var(--ink)] py-[13px]"
      tabIndex={0}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div
        className="[animation-duration:30s] llg:[animation-duration:46s]"
        style={{
          // The track must shrink-wrap to its content: a block-level flex box
          // defaults to the parent's width (the viewport), so translateX(-50%)
          // would be half the viewport — not half the content — and the loop
          // resets after ~2 messages. `max-content` makes -50% equal one set.
          width: 'max-content',
          // No flex `gap` here: a flex gap is also inserted at the seam between
          // the two copies, so translateX(-50%) lands half a gap short of one
          // full set and the loop visibly jumps back each cycle. Instead each
          // item carries its own trailing gap (marginRight), so -50% equals
          // exactly one set and the loop is seamless.
          display: 'flex',
          whiteSpace: 'nowrap',
          animationName: 'll-marquee',
          animationTimingFunction: 'linear',
          animationIterationCount: 'infinite',
          fontFamily: '"Source Serif 4", serif',
          fontSize: 26,
          willChange: 'transform',
          animationPlayState: paused ? 'paused' : 'running',
        }}
      >
        {all.map((item, i) => (
          <span
            key={i}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 36,
              marginRight: 36,
              color: 'var(--bg)',
            }}
          >
            {item}
            <span style={{ color: 'var(--accent)' }}>✦</span>
          </span>
        ))}
      </div>
    </div>
  )
}
