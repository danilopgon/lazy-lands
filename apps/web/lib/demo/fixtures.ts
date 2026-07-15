import {
  campaignDetailResponseSchema,
  type CampaignDetailResponse,
} from '@/lib/campaigns/schemas'
import {
  memoryFactResponseSchema,
  type MemoryFactResponse,
} from '@/lib/memory/schemas'
import {
  memorySuggestionSchema,
  sessionDetailSchema,
  sessionResponseSchema,
  type MemorySuggestion,
  type SessionDetail,
  type SessionResponse,
} from '@/lib/sessions/schemas'

/**
 * Static, in-memory sample data powering the public `/demo` experience.
 *
 * Every fixture below is parsed through the exact same Zod schemas the real
 * API responses are validated with, so the demo can never drift from the
 * production contracts: an invalid fixture throws at module load (and is
 * caught by the demo fixtures test). No value here is ever sent to or fetched
 * from the API, Supabase, or any external service — the demo is entirely local.
 *
 * The scenario is the reference campaign from `PRODUCT.md` §8:
 * _Shadows over Phandalin_ (D&D 5e, low-magic intrigue).
 */

/** Stable identifier for the single demo campaign. */
export const DEMO_CAMPAIGN_ID = 'demo-phandalin'

/** Stable identifier for the pre-generated demo session draft. */
export const DEMO_GENERATED_SESSION_ID = 'demo-session-8'

const campaignDetail: CampaignDetailResponse = {
  id: DEMO_CAMPAIGN_ID,
  title: 'Shadows over Phandalin',
  description:
    'A low-magic intrigue campaign where a stolen anti-dragon weapon plan pulls three guilds into open conflict.',
  world_state:
    'Phandalin sits uneasy. The theft of the anti-dragon weapon plans has the Black Bear Guild and the Crimson Blades circling each other, and a young white dragon, Cryovain, has begun testing the roads to the north. The party is trusted by some, watched by all.',
  system: 'D&D 5e',
  tone: 'Low-magic intrigue',
  updated_at: '2026-07-10T18:30:00Z',
  npcs: [
    {
      id: 'demo-npc-ander',
      name: 'Ander Margaster',
      description:
        'A cautious merchant lord who bankrolls the Black Bear Guild while pretending neutrality.',
      current_state:
        'Quietly funding a search for the stolen plans, terrified of being exposed.',
      motivation: 'Protect his fortune and his family name above all else.',
      content_source: 'llm',
    },
    {
      id: 'demo-npc-herman',
      name: 'Robert Herman',
      description:
        'A disgraced captain of the town guard, publicly humiliated by the party three sessions ago.',
      current_state:
        'Nursing his grievance in silence; has not yet retaliated.',
      motivation:
        'Restore his standing and repay the humiliation with interest.',
      content_source: 'edited',
    },
    {
      id: 'demo-npc-halia',
      name: 'Halia Thornton',
      description:
        'Master of the Miners Exchange and the ambitious hand behind the Black Bear Guild.',
      current_state:
        'Weighing whether the party is an asset or a liability after a mixed first impression.',
      motivation:
        'Consolidate control of Phandalin through leverage, not force.',
      content_source: 'manual',
    },
    {
      id: 'demo-npc-fibblestib',
      name: 'Fibblestib',
      description:
        'A frantic gnome artificer from Gnomengarde who understands the anti-dragon weapon better than anyone.',
      current_state:
        'Convinced the arcane instability is spreading and no one will listen.',
      motivation:
        'Prove the danger is real before Gnomengarde tears itself apart.',
      content_source: 'llm',
    },
    {
      id: 'demo-npc-cryovain',
      name: 'Cryovain',
      description:
        'A young white dragon staking a claim over the northern reaches of the region.',
      current_state:
        'Growing bolder, testing the roads and the villages nearest the mountains.',
      motivation: 'Establish an unchallenged hunting territory.',
      content_source: 'llm',
    },
  ],
  factions: [
    {
      id: 'demo-faction-blackbear',
      name: 'Black Bear Guild',
      description:
        'A merchants-and-miners cartel that wants Phandalin under quiet economic control.',
      current_stance:
        'Cautiously courting the party while hunting for the stolen plans.',
      goals: 'Recover the anti-dragon plans and turn them into leverage.',
      content_source: 'llm',
    },
    {
      id: 'demo-faction-crimson',
      name: 'Crimson Blades',
      description:
        'A mercenary company that suspects the Black Bear Guild orchestrated the theft.',
      current_stance: 'Openly hostile to the Guild; wary of the party.',
      goals: 'Seize the plans first and sell them to the highest bidder.',
      content_source: 'llm',
    },
    {
      id: 'demo-faction-zhentarim',
      name: 'Zhentarim Contacts',
      description:
        'A shadow network offering the party information — at a price that always compounds.',
      current_stance: 'Neutral, transactional, patient.',
      goals:
        'Insert themselves as the indispensable middlemen of the conflict.',
      content_source: 'manual',
    },
    {
      id: 'demo-faction-gnomengarde',
      name: 'Gnomengarde Inventors',
      description:
        'The reclusive tinkers who designed the weapon and now fear their own creation.',
      current_stance:
        'Fractured; some want the party as allies, others want secrecy.',
      goals: 'Contain the arcane instability before it becomes public.',
      content_source: 'llm',
    },
  ],
  arcs: [
    {
      id: 'demo-arc-plans',
      title: 'Recover the stolen anti-dragon plans',
      description:
        'The plans changed hands during the raid on the caravan and are now somewhere in Phandalin.',
      priority: 'high',
      status: 'active',
      content_source: 'llm',
    },
    {
      id: 'demo-arc-herman',
      title: "Robert Herman's revenge",
      description:
        'Herman was humiliated in public and has the connections to make the party pay quietly.',
      priority: 'medium',
      status: 'active',
      content_source: 'edited',
    },
    {
      id: 'demo-arc-instability',
      title: 'Gnomengarde arcane instability',
      description:
        'The weapon needs a stable arcane core, and the instability at Gnomengarde may run deeper than a single device.',
      priority: 'medium',
      status: 'dormant',
      content_source: 'llm',
    },
    {
      id: 'demo-arc-cryovain',
      title: "Cryovain's pressure over the region",
      description:
        'A young white dragon is pressing on the northern roads, raising the stakes of the guild conflict.',
      priority: 'high',
      status: 'active',
      content_source: 'llm',
    },
  ],
}

const sessions: SessionResponse[] = [
  {
    id: 'demo-session-5',
    session_number: 5,
    summary:
      'The party exposed Captain Herman in front of the town council, turning the crowd against him.',
    consequences:
      'Herman was stripped of his commission and left the meeting in disgrace.',
    has_generated_content: false,
    created_at: '2026-06-12T19:00:00Z',
  },
  {
    id: 'demo-session-6',
    session_number: 6,
    summary:
      'Negotiations with Halia Thornton went sideways — two PCs won her favor, two badly damaged it.',
    consequences:
      'The Black Bear Guild now treats the party as a divided, unpredictable asset.',
    has_generated_content: false,
    created_at: '2026-06-26T19:00:00Z',
  },
  {
    id: 'demo-session-7',
    session_number: 7,
    summary:
      'A detour through the foothills ended with the party sparing a cornered manticore rather than killing it.',
    consequences:
      'The manticore fled north, toward Cryovain’s growing territory.',
    has_generated_content: false,
    created_at: '2026-07-10T19:00:00Z',
  },
]

const memoryFacts: MemoryFactResponse[] = [
  {
    id: 'demo-memory-herman',
    campaign_id: DEMO_CAMPAIGN_ID,
    source_session_id: 'demo-session-5',
    content:
      'Robert Herman was publicly humiliated by the party and has not yet retaliated.',
    type: 'consequence',
    importance: 'high',
    status: 'active',
    created_at: '2026-06-12T19:30:00Z',
    updated_at: '2026-06-12T19:30:00Z',
  },
  {
    id: 'demo-memory-halia',
    campaign_id: DEMO_CAMPAIGN_ID,
    source_session_id: 'demo-session-6',
    content:
      'Two party members earned Halia Thornton’s favor while two damaged it, leaving the Guild ambivalent.',
    type: 'relationship',
    importance: 'medium',
    status: 'active',
    created_at: '2026-06-26T19:30:00Z',
    updated_at: '2026-06-26T19:30:00Z',
  },
  {
    id: 'demo-memory-core',
    campaign_id: DEMO_CAMPAIGN_ID,
    source_session_id: null,
    content: 'The anti-dragon weapon needs a stable arcane core to function.',
    type: 'item',
    importance: 'high',
    status: 'active',
    created_at: '2026-06-30T12:00:00Z',
    updated_at: '2026-06-30T12:00:00Z',
  },
  {
    id: 'demo-memory-gnomengarde',
    campaign_id: DEMO_CAMPAIGN_ID,
    source_session_id: null,
    content:
      'The Gnomengarde instability may run deeper than a single failed device.',
    type: 'secret',
    importance: 'medium',
    status: 'active',
    created_at: '2026-06-30T12:05:00Z',
    updated_at: '2026-06-30T12:05:00Z',
  },
  {
    id: 'demo-memory-manticore',
    campaign_id: DEMO_CAMPAIGN_ID,
    source_session_id: 'demo-session-7',
    content: 'The party spared a manticore that fled north and may return.',
    type: 'tension',
    importance: 'low',
    status: 'active',
    created_at: '2026-07-10T19:30:00Z',
    updated_at: '2026-07-10T19:30:00Z',
  },
]

/**
 * Suggestions the demo Scribe "proposes" after the DM logs the sample session
 * on `/demo/sessions/new` — the exact `MemorySuggestion` shape the real
 * register-session endpoint returns.
 */
const memorySuggestions: MemorySuggestion[] = [
  {
    content:
      'The party publicly accused the Crimson Blades of orchestrating the caravan raid.',
    type: 'consequence',
    importance: 'high',
    reason:
      'This shifts the Crimson Blades from wary to openly antagonistic and changes who the party can safely deal with.',
    related: ['Crimson Blades', 'Black Bear Guild'],
  },
  {
    content:
      'Fibblestib entrusted the party with a fragment of the weapon schematic.',
    type: 'item',
    importance: 'high',
    reason:
      'A physical piece of the anti-dragon plans is now in play, giving the party leverage in the guild conflict.',
    related: ['Fibblestib', 'Recover the stolen anti-dragon plans'],
  },
  {
    content:
      'Halia Thornton offered the party a private meeting, favor unresolved.',
    type: 'relationship',
    importance: 'medium',
    reason:
      'Her ambivalence is turning into a concrete opportunity the DM may want the next session to build on.',
    related: ['Halia Thornton', 'Black Bear Guild'],
  },
]

const generatedSession: SessionDetail = {
  id: DEMO_GENERATED_SESSION_ID,
  campaign_id: DEMO_CAMPAIGN_ID,
  session_number: 8,
  summary:
    'The party is drawn into a tense parley between the guilds while Cryovain’s shadow lengthens over the northern roads.',
  consequences: null,
  generated_content: {
    title: 'The Parley at the Miners Exchange',
    sections: [
      {
        id: 'synopsis',
        label: 'Synopsis',
        body: 'With a schematic fragment in hand, the party is summoned to the Miners Exchange, where Halia Thornton means to broker a fragile truce — and where the Crimson Blades intend to make sure no truce holds.',
        origin: 'scribe',
      },
      {
        id: 'goal',
        label: 'Session goal',
        body: 'Force the party to decide who holds the anti-dragon plans, and at what political cost, before Cryovain forces everyone’s hand.',
        origin: 'scribe',
      },
      {
        id: 'opening',
        label: 'Opening scene',
        body: 'A cold morning at the Miners Exchange. Halia waits at the head of a long table; Crimson Blades lieutenants line the far wall. The schematic fragment feels heavier than it should.',
        origin: 'scribe',
      },
      {
        id: 'beats',
        label: 'Key beats',
        body: '- The parley opens civil, then curdles as accusations about the caravan raid surface.\n- Fibblestib arrives uninvited, insisting the instability is spreading.\n- A rider brings word that Cryovain has been sighted over the north road.',
        origin: 'scribe',
      },
      {
        id: 'encounters',
        label: 'Encounters',
        body: 'A social encounter (the parley) that can tip into a skirmish if the party mishandles Herman’s planted informant among the guards.',
        origin: 'scribe',
      },
      {
        id: 'factions',
        label: 'Faction reactions',
        body: 'The Black Bear Guild pushes for control of the plans; the Crimson Blades stall for a chance to seize them; the Zhentarim quietly offer the party an exit — for a price.',
        origin: 'scribe',
      },
      {
        id: 'arcs',
        label: 'Arc progression',
        body: 'Recovering the stolen plans advances toward a decision point; Cryovain’s pressure escalates from rumor to immediate threat.',
        origin: 'scribe',
      },
    ],
    continuity_links: [
      {
        memory_fact_id: 'demo-memory-herman',
        relevance:
          'Herman’s unretaliated humiliation seeds the planted informant among the guards.',
      },
      {
        memory_fact_id: 'demo-memory-halia',
        relevance:
          'Halia’s ambivalence sets the fragile, self-interested tone of the parley.',
      },
      {
        memory_fact_id: 'demo-memory-core',
        relevance:
          'The need for a stable arcane core is why the schematic fragment matters.',
      },
    ],
  },
  trace_json: null,
  created_at: '2026-07-11T09:00:00Z',
  updated_at: '2026-07-11T09:00:00Z',
}

/** The demo campaign detail, validated against the production read schema. */
export const demoCampaign: CampaignDetailResponse =
  campaignDetailResponseSchema.parse(campaignDetail)

/** The demo session history, validated against the production read schema. */
export const demoSessions: SessionResponse[] = sessions.map((session) =>
  sessionResponseSchema.parse(session)
)

/** The demo active memories, validated against the production read schema. */
export const demoMemoryFacts: MemoryFactResponse[] = memoryFacts.map((fact) =>
  memoryFactResponseSchema.parse(fact)
)

/** The demo Scribe memory proposals, validated against the production schema. */
export const demoMemorySuggestions: MemorySuggestion[] = memorySuggestions.map(
  (suggestion) => memorySuggestionSchema.parse(suggestion)
)

/** The demo pre-generated session draft, validated against the production schema. */
export const demoGeneratedSession: SessionDetail =
  sessionDetailSchema.parse(generatedSession)
