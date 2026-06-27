import type { ContinuityStat, MemoryLoopItem, Pillar } from '../types'

export const pillars: Pillar[] = [
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

export const memoryLoop: MemoryLoopItem[] = [
  {
    label: 'Log',
    title: 'Session VII: the warehouse fire',
    body: 'The DM records what happened at the table, including consequences and private notes.',
  },
  {
    label: 'Review',
    title: 'The Scribe proposes memories',
    body: 'Each suggestion explains why it matters and keeps Accept, Edit and Dismiss visible.',
  },
  {
    label: 'Prepare',
    title: 'Only accepted memory returns',
    body: 'The next briefing uses confirmed context, not dismissed suggestions or private notes.',
  },
]

export const continuityStats: ContinuityStat[] = [
  { value: '5', label: 'NPCs in play' },
  { value: '4', label: 'Faction threads' },
  { value: '3', label: 'Open arcs' },
]
