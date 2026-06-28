import { ViewEnter } from './motion'

export function LandPhilosophy() {
  return (
    <section className="mx-auto w-full max-w-[1420px] px-5 py-[56px] llg:px-10">
      <div className="mb-[40px] h-[1px] bg-[var(--border)]" />
      <ViewEnter>
        <div
          className="font-serif text-[var(--ink)]"
          style={
            {
              fontSize: 34,
              lineHeight: 1.2,
              letterSpacing: '-0.012em',
              textWrap: 'balance',
            } as React.CSSProperties
          }
        >
          <span style={{ color: 'var(--accent)' }}>&ldquo;</span>
          The Scribe is a draft, never the author. Nothing reaches your table
          until you&apos;ve made it canon.
          <span style={{ color: 'var(--accent)' }}>&rdquo;</span>
        </div>
        <div
          className="mt-[18px] font-mono uppercase tracking-[0.08em]"
          style={{ fontSize: 11, color: 'var(--accent-deep)' }}
        >
          The whole philosophy, in one line
        </div>
      </ViewEnter>
    </section>
  )
}
