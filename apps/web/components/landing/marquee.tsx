import { marqueeItems } from './data'

export function LandMarquee() {
  const all = [...marqueeItems, ...marqueeItems]
  return (
    <div className="overflow-hidden border-y-2 border-[var(--border)] bg-[var(--ink)] py-[13px]">
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
