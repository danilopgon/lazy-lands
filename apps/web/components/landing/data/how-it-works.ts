import type { HowItWorksStep } from '../types'

export const howItWorksSteps: HowItWorksStep[] = [
  {
    n: '01',
    title: 'Create your campaign',
    body: "Name it, pick a system, paste the premise. The Scribe drafts your NPCs, factions and arcs for you to review, every one, before it's canon.",
    glyph: '◆',
    state:
      'Extraction review: NPCs, factions and arcs are editable before saving.',
  },
  {
    n: '02',
    title: 'Log each session',
    body: 'After the table clears, write what happened. The Scribe proposes the memories worth keeping. You accept, edit or dismiss.',
    glyph: '✒',
    state:
      'Memory review: suggested, accepted and dismissed states stay visible.',
  },
  {
    n: '03',
    title: 'Prepare the next',
    body: 'Hit Prepare. Get a briefing built on everything you accepted. Edit it. Print it. Run it.',
    glyph: '↝',
    state: 'Session draft: every section stays editable before export.',
  },
]
