const pillars = [
  {
    glyph: '◆',
    eyebrow: '01 · Remember',
    title: 'Campaign memory',
    body: 'Track NPCs, factions and events across sessions. Nothing leaks out between session 3 and session 17.',
    bullets: [
      'NPC entries with status & motivation',
      'Faction posture, session over session',
      'A timeline of consequences',
    ],
    accent: false,
  },
  {
    glyph: '✒',
    eyebrow: '02 · Prepare',
    title: 'Session briefings',
    body: 'A contextual draft before every session: synopsis, relevant NPCs, faction reactions and narrative hooks.',
    bullets: [
      'An editable draft, never the final word',
      'Built only from memories you accepted',
      'Export to PDF, private notes excluded',
    ],
    accent: true,
  },
  {
    glyph: '↝',
    eyebrow: '03 · Continuity',
    title: 'Nothing slips',
    body: 'Dormant arcs resurface before your players forget them. The world reacts to what they actually did.',
    bullets: [
      'Arcs that need attention, flagged',
      'Faction reactions carried forward',
      'Accepted memories feed every draft',
    ],
    accent: false,
  },
]

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
