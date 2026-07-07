'use client'

import { useTranslations } from 'next-intl'

import { Badge } from '@/components/ui/badge'

import type { NpcRowProps, SpecProps } from './types'

/**
 * Single NPC row in the briefing mock — name, role, and status badge.
 *
 * @param {object} root0 - The NPC row props.
 * @param {string} root0.name - The NPC display name.
 * @param {string} root0.role - The NPC role or title.
 * @param {boolean} [root0.accent=false] - Whether to render with accent styling (active status).
 * @returns {React.ReactElement} The NPC row element.
 */
function NpcRow({ name, role, accent = false }: NpcRowProps) {
  const t = useTranslations('Landing')

  return (
    <div className="flex items-center justify-between border-b border-dashed border-[var(--dotted)] py-[6px] last:border-0">
      <div>
        <div className="text-[13.5px] font-semibold">{name}</div>
        <div className="font-mono text-[10.5px] text-[var(--mute)]">{role}</div>
      </div>
      <Badge variant={accent ? 'accent' : 'muted'}>
        {accent ? t('mock.statusActive') : t('mock.statusInPlay')}
      </Badge>
    </div>
  )
}

/**
 * Key-value spec line used in the briefing mock grid.
 *
 * @param {object} root0 - The spec props.
 * @param {string} root0.k - The spec key (label).
 * @param {string} root0.v - The spec value (description).
 * @returns {React.ReactElement} The spec line element.
 */
export function Spec({ k, v }: SpecProps) {
  return (
    <div style={{ borderTop: '2px solid var(--border)', paddingTop: 12 }}>
      <div className="font-serif text-[23px] font-semibold">{k}</div>
      <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.06em] text-[var(--mute)]">
        {v}
      </div>
    </div>
  )
}

/**
 * Static briefing card mock — rotated paper card with hardcoded session data.
 *
 * @returns {React.ReactElement} The briefing mock card element.
 */
export function BriefingMock() {
  const t = useTranslations('Landing')
  const npcs = t.raw('mock.npcs') as NpcRowProps[]

  return (
    <div
      className="border-2 border-[var(--border)] bg-[var(--paper)] p-[26px] shadow-[8px_8px_0_var(--shadow)]"
      style={{ transform: 'rotate(1deg)' }}
    >
      <div className="mb-3 flex items-start justify-between">
        <div>
          <div className="font-mono text-[9.5px] uppercase tracking-[0.08em] text-[var(--accent)]">
            {t('mock.label')}
          </div>
          <h3
            className="mt-[5px] font-serif font-semibold leading-[1.0]"
            style={{ fontSize: 30 }}
          >
            {t('mock.title')}
          </h3>
        </div>
        <Badge variant="muted">{t('mock.draft')}</Badge>
      </div>

      <div className="h-[2px] bg-[var(--ink)]" />

      <div className="mt-[14px]">
        <div className="mb-[6px] font-mono text-[9.5px] uppercase tracking-[0.08em] text-[var(--mute)]">
          {t('mock.synopsisLabel')}
        </div>
        <p className="m-0 font-serif text-[13.5px] leading-[1.5]">
          {t.rich('mock.synopsis', {
            u: (chunks) => <span className="underline">{chunks}</span>,
          })}
        </p>
      </div>

      <div className="mt-[16px]">
        <div className="mb-[8px] font-mono text-[9.5px] uppercase tracking-[0.08em] text-[var(--mute)]">
          {t('mock.npcsLabel')}
        </div>
        {npcs.map((npc) => (
          <NpcRow
            key={npc.name}
            name={npc.name}
            role={npc.role}
            accent={npc.accent}
          />
        ))}
      </div>

      <div className="mt-[16px] border-2 border-[var(--accent)] bg-[var(--accent-wash)] p-3">
        <div className="mb-1 flex items-center gap-[6px] font-mono text-[9.5px] uppercase tracking-[0.08em] text-[var(--accent-deep)]">
          {t('mock.memoryLabel')}
        </div>
        <div className="font-serif text-[12.5px] leading-[1.4]">
          {t.rich('mock.memory', { em: (chunks) => <em>{chunks}</em> })}
        </div>
      </div>
    </div>
  )
}
