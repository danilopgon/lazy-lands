import { Spec, BriefingMock } from './briefing-mock'

export function LandBriefing() {
  return (
    <section className="mx-auto w-full max-w-[1180px] px-5 py-[72px] llg:px-10">
      <div className="grid grid-cols-1 items-center gap-[56px] llg:grid-cols-2">
        {/* Left: copy + stats */}
        <div>
          <div className="mb-[14px] font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--accent)]">
            / the output
          </div>
          <h2
            className="font-serif text-[var(--ink)]"
            style={{
              fontSize: 46,
              margin: 0,
              lineHeight: 1.02,
              letterSpacing: '-0.022em',
            }}
          >
            A briefing that reads like your own prep, only faster.
          </h2>
          <p
            className="text-[var(--ink-2)]"
            style={{
              fontSize: 16.5,
              marginTop: 22,
              lineHeight: 1.55,
              fontFamily: '"Source Serif 4", serif',
            }}
          >
            Not a data dump. An ordered draft you can read five minutes before
            the session. Always a <em>draft</em>: you edit it, you decide what
            happens.
          </p>

          <div className="mt-[26px] grid grid-cols-2 gap-4">
            <Spec k="3 min" v="average prep time" />
            <Spec k="7 sessions" v="of context, never forgotten" />
            <Spec k="Canon" v="decided by you, not the Scribe" />
            <Spec k="Editable" v="it's a draft, not truth" />
          </div>
        </div>

        {/* Right: BriefingMock */}
        <BriefingMock />
      </div>
    </section>
  )
}
