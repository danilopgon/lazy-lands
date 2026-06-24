import { NodeGraph } from './node-graph'

export function HeroCollage() {
  return (
    <div
      aria-hidden="true"
      className="relative hidden llg:block"
      style={{ height: 500 }}
    >
      <div className="absolute inset-0 overflow-hidden border-2 border-[var(--border)] bg-[var(--paper-2)] shadow-[8px_8px_0_var(--shadow)]">
        <NodeGraph />
      </div>

      <div
        className="absolute border-2 border-[var(--border)] bg-[var(--paper)] p-4 shadow-[6px_6px_0_var(--accent)]"
        style={{
          right: -22,
          bottom: -22,
          width: 286,
          transform: 'rotate(-2deg)',
        }}
      >
        <div className="mb-[5px] font-mono text-[9.5px] uppercase tracking-[0.08em] text-[var(--accent)]">
          Briefing · Session VIII
        </div>
        <div className="mb-[9px] font-serif text-[21px] font-semibold leading-[1.05]">
          The Quiet Ledger
        </div>
        <div className="mb-[9px] font-mono text-[10px] text-[var(--mute)]">
          5 NPCs · 4 factions · 1 grudge resurfacing
        </div>
        <div className="mb-[9px] h-[2px] bg-[var(--ink)]" />
        <div className="font-serif text-[12.5px] leading-[1.4]">
          Halia calls in the party. She knows they started the warehouse fire.
          <span className="ml-1 bg-[var(--accent-wash)] px-1 font-semibold text-[var(--accent-deep)]">
            memory in play
          </span>
        </div>
      </div>

      <div
        className="absolute border-2 border-[var(--border)] p-3 shadow-[3px_3px_0_var(--shadow)]"
        style={{
          left: -16,
          top: 16,
          width: 162,
          background: 'var(--accent)',
          color: '#FBF4EC',
          transform: 'rotate(-4deg)',
        }}
      >
        <div className="mb-[5px] font-mono text-[9px] uppercase tracking-[0.1em] opacity-85">
          Don&apos;t forget
        </div>
        <div className="font-serif text-[12.5px] leading-[1.3]">
          Halia favors two of them, and distrusts the other two.
        </div>
      </div>
    </div>
  )
}
