import { pillars } from './data'

export function LandPillars() {
  return (
    <section
      id="product"
      className="mx-auto w-full max-w-[1180px] px-5 pb-[40px] pt-[92px] llg:px-10"
    >
      {/* Section header */}
      <div className="mb-12 max-w-[720px]">
        <div className="mb-[14px] font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--accent)]">
          / what it does
        </div>
        <h2
          className="font-serif text-[var(--ink)]"
          style={{
            fontSize: 52,
            margin: 0,
            lineHeight: 1.0,
            letterSpacing: '-0.025em',
          }}
        >
          Not a one-shot generator.
          <br />
          <em style={{ color: 'var(--mute)' }}>It&apos;s memory.</em>
        </h2>
      </div>

      {/* Pillars grid — single outer border */}
      <div
        className="grid grid-cols-1 llg:grid-cols-3"
        style={{
          border: '2px solid var(--border)',
          background: 'var(--border)',
          boxShadow: '8px 8px 0 var(--shadow)',
        }}
      >
        {pillars.map((p, i) => (
          <div
            key={p.eyebrow}
            style={{
              background: p.accent ? 'var(--accent-wash)' : 'var(--paper)',
              padding: '34px 28px',
              borderRight: i < 2 ? '2px solid var(--border)' : 'none',
              borderBottom: '2px solid var(--border)',
            }}
            className="last:border-b-0 llg:border-b-0"
          >
            {/* Icon — 50×50 bordered box */}
            <div
              style={{
                width: 50,
                height: 50,
                border: '2px solid var(--border)',
                background: 'var(--paper)',
                display: 'grid',
                placeItems: 'center',
                marginBottom: 20,
                fontSize: 22,
                color: 'var(--accent)',
                boxShadow: '3px 3px 0 var(--shadow)',
              }}
            >
              {p.glyph}
            </div>

            <div className="mb-[9px] font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--accent)]">
              {p.eyebrow}
            </div>
            <h3
              className="font-serif text-[var(--ink)]"
              style={{
                fontSize: 27,
                margin: '0 0 12px',
                lineHeight: 1.0,
                letterSpacing: '-0.01em',
              }}
            >
              {p.title}
            </h3>
            <p
              className="text-[var(--ink-2)]"
              style={{ fontSize: 14.5, marginBottom: 18, lineHeight: 1.5 }}
            >
              {p.body}
            </p>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {p.bullets.map((b) => (
                <li
                  key={b}
                  className="font-mono text-[var(--ink-2)]"
                  style={{
                    display: 'flex',
                    gap: 8,
                    fontSize: 11.5,
                    marginBottom: 7,
                    lineHeight: 1.4,
                  }}
                >
                  <span style={{ color: 'var(--accent)' }}>→</span>
                  {b}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  )
}
