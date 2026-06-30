import { Spec, BriefingMock } from './briefing-mock'
import { ViewEnter } from './motion'

/**
 * Briefing section — side-by-side copy and tilted mock card.
 *
 * @returns {React.ReactElement} The briefing landing section element.
 */
export function LandBriefing() {
  return (
    <section className="mx-auto w-full max-w-[1420px] px-5 pb-[88px] pt-[56px] llg:px-10">
      <div className="grid grid-cols-1 items-center gap-[56px] llg:grid-cols-2">
        {/* Copy: first on mobile, second on desktop */}
        <ViewEnter className="llg:order-2">
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
            <Spec k="Accepted" v="memories feed the briefing" />
            <Spec k="Dismissed" v="suggestions stay out" />
            <Spec k="Private" v="notes never export" />
            <Spec k="Editable" v="draft first, canon later" />
          </div>
        </ViewEnter>

        {/* Mock card: second on mobile, first on desktop */}
        <div className="llg:order-1">
          <BriefingMock />
        </div>
      </div>
    </section>
  )
}
