'use client'

import { useState } from 'react'

import { marqueeItems } from './data'

export function LandMarquee() {
  const [paused, setPaused] = useState(false)
  const all = [...marqueeItems, ...marqueeItems]
  return (
    <div
      className="overflow-hidden border-y-2 border-[var(--border)] bg-[var(--ink)] py-[13px]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div
        className="[animation-duration:18s] llg:[animation-duration:38s]"
        style={{
          display: 'flex',
          gap: 36,
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
        {all.map((t, i) => (
          <span
            key={i}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 36,
              color: 'var(--bg)',
            }}
          >
            {t}
            <span style={{ color: 'var(--accent)' }}>✦</span>
          </span>
        ))}
      </div>
    </div>
  )
}
