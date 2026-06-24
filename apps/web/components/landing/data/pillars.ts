import type { Pillar } from '../types'

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
