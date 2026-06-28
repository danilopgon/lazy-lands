import { howItWorksSteps } from './data'
import { ViewEnter } from './motion'

export function LandHowItWorks() {
  return (
    <section
      id="how"
      className="border-y-2 border-[var(--border)] py-[88px]"
      style={{ background: 'var(--ink)', color: 'var(--bg)' }}
    >
      <div className="mx-auto w-full max-w-[1420px] px-5 llg:px-10">
        <ViewEnter>
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

          <div className="mt-[56px] grid grid-cols-1 llg:grid-cols-3">
            {howItWorksSteps.map((s, i) => (
              <div
                key={s.n}
                className={[
                  i === 0 ? 'llg:pr-8' : i === 2 ? 'llg:pl-8' : 'llg:px-8',
                  i > 0
                    ? 'mt-10 border-t-2 border-[var(--bg)] pt-10 llg:mt-0 llg:border-t-0 llg:border-l-2 llg:pt-0 flex flex-col h-full gap-4'
                    : 'flex flex-col h-full gap-4',
                ].join(' ')}
              >
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
                    color: 'var(--on-ink-muted)',
                    margin: 0,
                  }}
                >
                  {s.body}
                </p>
                <div className="mt-auto bg-[var(--bg)] p-3 text-[var(--ink)]">
                  <div className="font-mono text-[9.5px] uppercase tracking-[0.08em] text-[var(--mute)] ">
                    Product state
                  </div>
                  <div className="mt-2 font-serif text-[15px] leading-snug">
                    {s.state}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ViewEnter>
      </div>
    </section>
  )
}
