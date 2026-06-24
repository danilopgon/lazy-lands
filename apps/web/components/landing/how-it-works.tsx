const steps = [
  {
    n: '01',
    title: 'Create your campaign',
    body: "Name it, pick a system, paste the premise. The Scribe drafts your NPCs, factions and arcs for you to review, every one, before it's canon.",
    glyph: '◆',
  },
  {
    n: '02',
    title: 'Log each session',
    body: 'After the table clears, write what happened. The Scribe proposes the memories worth keeping. You accept, edit or dismiss.',
    glyph: '✒',
  },
  {
    n: '03',
    title: 'Prepare the next',
    body: 'Hit Prepare. Get a briefing built on everything you accepted. Edit it. Print it. Run it.',
    glyph: '↝',
  },
]

export function LandHowItWorks() {
  return (
    <section
      id="how"
      className="border-y-2 border-[var(--border)] py-[88px]"
      style={{ background: 'var(--ink)', color: 'var(--bg)' }}
    >
      <div className="mx-auto w-full max-w-[1180px] px-5 llg:px-10">
        <div
          className="mb-[14px] font-mono text-[10px] uppercase tracking-[0.1em]"
          style={{ color: 'var(--accent)' }}
        >
          / how it works
        </div>
        <h2
          className="font-serif"
          style={{
            fontSize: 60,
            margin: 0,
            lineHeight: 0.95,
            letterSpacing: '-0.025em',
            color: 'var(--bg)',
          }}
        >
          Three steps. Not one more.
        </h2>

        <div className="mt-[56px] grid grid-cols-1 gap-8 llg:grid-cols-3 llg:gap-8">
          {steps.map((s) => (
            <div key={s.n}>
              <div className="mb-4 flex items-baseline gap-[14px]">
                <div
                  className="font-serif"
                  style={{
                    fontSize: 84,
                    lineHeight: 1,
                    color: 'var(--accent)',
                    letterSpacing: '-0.04em',
                  }}
                >
                  {s.n}
                </div>
                <div
                  style={{
                    flex: 1,
                    height: 2,
                    background: 'var(--bg)',
                    opacity: 0.35,
                  }}
                />
                <span style={{ fontSize: 24 }}>{s.glyph}</span>
              </div>
              <h3
                className="font-serif"
                style={{
                  fontSize: 28,
                  margin: '0 0 10px',
                  color: 'var(--bg)',
                  lineHeight: 1.0,
                }}
              >
                {s.title}
              </h3>
              <p
                style={{
                  fontSize: 14.5,
                  lineHeight: 1.5,
                  color: 'rgba(236,228,211,0.72)',
                  margin: 0,
                }}
              >
                {s.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
