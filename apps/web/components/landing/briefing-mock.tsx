import { Badge } from '@/components/ui/badge'

interface NpcRowProps {
  name: string
  role: string
  accent?: boolean
}

function NpcRow({ name, role, accent = false }: NpcRowProps) {
  return (
    <div className="flex items-center justify-between border-b border-dashed border-[var(--dotted)] py-[6px] last:border-0">
      <div>
        <div className="text-[13.5px] font-semibold">{name}</div>
        <div className="font-mono text-[10.5px] text-[var(--mute)]">{role}</div>
      </div>
      <Badge variant={accent ? 'accent' : 'muted'}>
        {accent ? 'active' : 'in play'}
      </Badge>
    </div>
  )
}

export interface SpecProps {
  k: string
  v: string
}

export function Spec({ k, v }: SpecProps) {
  return (
    <div style={{ borderLeft: '3px solid var(--accent)', paddingLeft: 14 }}>
      <div className="font-serif text-[23px] font-semibold">{k}</div>
      <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.06em] text-[var(--mute)]">
        {v}
      </div>
    </div>
  )
}

export function BriefingMock() {
  return (
    <div
      className="border-2 border-[var(--border)] bg-[var(--paper)] p-[26px] shadow-[8px_8px_0_var(--shadow)]"
      style={{ transform: 'rotate(1deg)' }}
    >
      <div className="mb-3 flex items-start justify-between">
        <div>
          <div className="font-mono text-[9.5px] uppercase tracking-[0.08em] text-[var(--accent)]">
            Briefing · Session VIII
          </div>
          <h3
            className="mt-[5px] font-serif font-semibold leading-[1.0]"
            style={{ fontSize: 30 }}
          >
            The Quiet Ledger
          </h3>
        </div>
        <Badge variant="muted">draft</Badge>
      </div>

      <div className="h-[2px] bg-[var(--ink)]" />

      <div className="mt-[14px]">
        <div className="mb-[6px] font-mono text-[9.5px] uppercase tracking-[0.08em] text-[var(--mute)]">
          01 / Synopsis
        </div>
        <p className="m-0 font-serif text-[13.5px] leading-[1.5]">
          Halia Thornton calls the party to the Miner&apos;s Exchange. She knows
          they started the <span className="underline">warehouse fire</span>,
          and offers silence in exchange for one quiet job.
        </p>
      </div>

      <div className="mt-[16px]">
        <div className="mb-[8px] font-mono text-[9.5px] uppercase tracking-[0.08em] text-[var(--mute)]">
          02 / Key NPCs
        </div>
        <NpcRow name="Halia Thornton" role="Guildmaster · Zhentarim hand" />
        <NpcRow name="Ander Margaster" role="Wary ally · owes a favor" />
        <NpcRow name="Robert Herman" role="Patience finally ending" accent />
      </div>

      <div className="mt-[16px] border-2 border-[var(--accent)] bg-[var(--accent-wash)] p-3">
        <div className="mb-1 flex items-center gap-[6px] font-mono text-[9.5px] uppercase tracking-[0.08em] text-[var(--accent-deep)]">
          ✦ Memory in play
        </div>
        <div className="font-serif text-[12.5px] leading-[1.4]">
          You accepted in Session VII:{' '}
          <em>
            &ldquo;Two party members earned Halia&apos;s favor; two damaged
            it.&rdquo;
          </em>{' '}
          The Scribe built her offer around it.
        </div>
      </div>
    </div>
  )
}
