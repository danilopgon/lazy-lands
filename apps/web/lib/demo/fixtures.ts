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
 * Static, in-memory sample data powering the public `/demo` experience, in
 * both supported demo locales.
 *
 * Every fixture below is parsed through the exact same Zod schemas the real
 * API responses are validated with, so the demo can never drift from the
 * production contracts: an invalid fixture throws at module load (and is
 * caught by the demo fixtures test). No value here is ever sent to or fetched
 * from the API, Supabase, or any external service — the demo is entirely local.
 *
 * The scenario is the reference campaign from `PRODUCT.md` §8:
 * _Shadows over Phandalin_ (D&D 5e, low-magic intrigue).
 *
 * Stable, non-prose values (entity ids, dates, and enum-like fields —
 * `content_source`, `system`, `tone`, memory `type`/`importance`, arc
 * `priority`/`status`, section `origin`) are declared ONCE below and shared
 * by both locale bundles so they can never diverge. Only human-readable
 * prose is translated per locale.
 */

/** Stable identifier for the single demo campaign. */
export const DEMO_CAMPAIGN_ID = 'demo-phandalin'

/** Stable identifier for the pre-generated demo session draft. */
export const DEMO_GENERATED_SESSION_ID = 'demo-session-8'

/** Demo locales with a translated sample content bundle. */
export type DemoLocale = 'en' | 'es'

/** The demo's default locale, used as the fallback for any unknown locale. */
const DEFAULT_DEMO_LOCALE: DemoLocale = 'en'

/** Shared, non-prose entity ids — identical across every locale bundle. */
const IDS = {
  npc: {
    ander: 'demo-npc-ander',
    herman: 'demo-npc-herman',
    halia: 'demo-npc-halia',
    fibblestib: 'demo-npc-fibblestib',
    cryovain: 'demo-npc-cryovain',
  },
  faction: {
    blackbear: 'demo-faction-blackbear',
    crimson: 'demo-faction-crimson',
    zhentarim: 'demo-faction-zhentarim',
    gnomengarde: 'demo-faction-gnomengarde',
  },
  arc: {
    plans: 'demo-arc-plans',
    herman: 'demo-arc-herman',
    instability: 'demo-arc-instability',
    cryovain: 'demo-arc-cryovain',
  },
  session: {
    s5: 'demo-session-5',
    s6: 'demo-session-6',
    s7: 'demo-session-7',
  },
  memory: {
    herman: 'demo-memory-herman',
    halia: 'demo-memory-halia',
    core: 'demo-memory-core',
    gnomengarde: 'demo-memory-gnomengarde',
    manticore: 'demo-memory-manticore',
  },
} as const

/** Shared, non-prose dates — identical across every locale bundle. */
const DATES = {
  campaignUpdatedAt: '2026-07-10T18:30:00Z',
  session5: '2026-06-12T19:00:00Z',
  session6: '2026-06-26T19:00:00Z',
  session7: '2026-07-10T19:00:00Z',
  memoryHerman: '2026-06-12T19:30:00Z',
  memoryHalia: '2026-06-26T19:30:00Z',
  memoryCore: '2026-06-30T12:00:00Z',
  memoryGnomengarde: '2026-06-30T12:05:00Z',
  memoryManticore: '2026-07-10T19:30:00Z',
  generatedCreatedAt: '2026-07-11T09:00:00Z',
  generatedUpdatedAt: '2026-07-11T09:00:00Z',
} as const

/** The bundle a locale-aware demo screen renders from. */
export type DemoFixtures = {
  campaign: CampaignDetailResponse
  sessions: SessionResponse[]
  memoryFacts: MemoryFactResponse[]
  suggestions: MemorySuggestion[]
  generated: SessionDetail
}

/**
 * One locale's translated prose for the demo fixture bundle. Keys mirror the
 * shared {@link IDS} map; only the human-readable strings are per-locale, so
 * IDs, dates, and enum fields stay identical across every locale.
 */
type LocaleProse = {
  campaign: { title: string; description: string; worldState: string }
  system: string
  tone: string
  npcs: Record<
    keyof typeof IDS.npc,
    {
      name: string
      description: string
      currentState: string
      motivation: string
    }
  >
  factions: Record<
    keyof typeof IDS.faction,
    { name: string; description: string; currentStance: string; goals: string }
  >
  arcs: Record<keyof typeof IDS.arc, { title: string; description: string }>
  sessions: Record<
    keyof typeof IDS.session,
    { summary: string; consequences: string }
  >
  memoryFacts: Record<keyof typeof IDS.memory, { content: string }>
  suggestions: {
    content: string
    reason: string
    related: string[]
  }[]
  generated: {
    summary: string
    title: string
    sections: { label: string; body: string }[]
    continuityRelevance: Pick<
      Record<keyof typeof IDS.memory, string>,
      'herman' | 'halia' | 'core'
    >
  }
}

/**
 * Build and schema-validate one locale's demo fixture bundle.
 *
 * @param {LocaleProse} prose - The locale's translated prose, keyed by entity.
 * @returns {DemoFixtures} The validated, locale-specific fixture bundle.
 */
function buildFixtures(prose: LocaleProse): DemoFixtures {
  const campaignDetail: CampaignDetailResponse = {
    id: DEMO_CAMPAIGN_ID,
    title: prose.campaign.title,
    description: prose.campaign.description,
    world_state: prose.campaign.worldState,
    system: prose.system,
    tone: prose.tone,
    updated_at: DATES.campaignUpdatedAt,
    npcs: [
      {
        id: IDS.npc.ander,
        name: prose.npcs.ander.name,
        description: prose.npcs.ander.description,
        current_state: prose.npcs.ander.currentState,
        motivation: prose.npcs.ander.motivation,
        content_source: 'llm',
      },
      {
        id: IDS.npc.herman,
        name: prose.npcs.herman.name,
        description: prose.npcs.herman.description,
        current_state: prose.npcs.herman.currentState,
        motivation: prose.npcs.herman.motivation,
        content_source: 'edited',
      },
      {
        id: IDS.npc.halia,
        name: prose.npcs.halia.name,
        description: prose.npcs.halia.description,
        current_state: prose.npcs.halia.currentState,
        motivation: prose.npcs.halia.motivation,
        content_source: 'manual',
      },
      {
        id: IDS.npc.fibblestib,
        name: prose.npcs.fibblestib.name,
        description: prose.npcs.fibblestib.description,
        current_state: prose.npcs.fibblestib.currentState,
        motivation: prose.npcs.fibblestib.motivation,
        content_source: 'llm',
      },
      {
        id: IDS.npc.cryovain,
        name: prose.npcs.cryovain.name,
        description: prose.npcs.cryovain.description,
        current_state: prose.npcs.cryovain.currentState,
        motivation: prose.npcs.cryovain.motivation,
        content_source: 'llm',
      },
    ],
    factions: [
      {
        id: IDS.faction.blackbear,
        name: prose.factions.blackbear.name,
        description: prose.factions.blackbear.description,
        current_stance: prose.factions.blackbear.currentStance,
        goals: prose.factions.blackbear.goals,
        content_source: 'llm',
      },
      {
        id: IDS.faction.crimson,
        name: prose.factions.crimson.name,
        description: prose.factions.crimson.description,
        current_stance: prose.factions.crimson.currentStance,
        goals: prose.factions.crimson.goals,
        content_source: 'llm',
      },
      {
        id: IDS.faction.zhentarim,
        name: prose.factions.zhentarim.name,
        description: prose.factions.zhentarim.description,
        current_stance: prose.factions.zhentarim.currentStance,
        goals: prose.factions.zhentarim.goals,
        content_source: 'manual',
      },
      {
        id: IDS.faction.gnomengarde,
        name: prose.factions.gnomengarde.name,
        description: prose.factions.gnomengarde.description,
        current_stance: prose.factions.gnomengarde.currentStance,
        goals: prose.factions.gnomengarde.goals,
        content_source: 'llm',
      },
    ],
    arcs: [
      {
        id: IDS.arc.plans,
        title: prose.arcs.plans.title,
        description: prose.arcs.plans.description,
        priority: 'high',
        status: 'active',
        content_source: 'llm',
      },
      {
        id: IDS.arc.herman,
        title: prose.arcs.herman.title,
        description: prose.arcs.herman.description,
        priority: 'medium',
        status: 'active',
        content_source: 'edited',
      },
      {
        id: IDS.arc.instability,
        title: prose.arcs.instability.title,
        description: prose.arcs.instability.description,
        priority: 'medium',
        status: 'dormant',
        content_source: 'llm',
      },
      {
        id: IDS.arc.cryovain,
        title: prose.arcs.cryovain.title,
        description: prose.arcs.cryovain.description,
        priority: 'high',
        status: 'active',
        content_source: 'llm',
      },
    ],
  }

  const sessions: SessionResponse[] = [
    {
      id: IDS.session.s5,
      session_number: 5,
      summary: prose.sessions.s5.summary,
      consequences: prose.sessions.s5.consequences,
      has_generated_content: false,
      created_at: DATES.session5,
    },
    {
      id: IDS.session.s6,
      session_number: 6,
      summary: prose.sessions.s6.summary,
      consequences: prose.sessions.s6.consequences,
      has_generated_content: false,
      created_at: DATES.session6,
    },
    {
      id: IDS.session.s7,
      session_number: 7,
      summary: prose.sessions.s7.summary,
      consequences: prose.sessions.s7.consequences,
      has_generated_content: false,
      created_at: DATES.session7,
    },
  ]

  const memoryFacts: MemoryFactResponse[] = [
    {
      id: IDS.memory.herman,
      campaign_id: DEMO_CAMPAIGN_ID,
      source_session_id: IDS.session.s5,
      content: prose.memoryFacts.herman.content,
      type: 'consequence',
      importance: 'high',
      status: 'active',
      created_at: DATES.memoryHerman,
      updated_at: DATES.memoryHerman,
    },
    {
      id: IDS.memory.halia,
      campaign_id: DEMO_CAMPAIGN_ID,
      source_session_id: IDS.session.s6,
      content: prose.memoryFacts.halia.content,
      type: 'relationship',
      importance: 'medium',
      status: 'active',
      created_at: DATES.memoryHalia,
      updated_at: DATES.memoryHalia,
    },
    {
      id: IDS.memory.core,
      campaign_id: DEMO_CAMPAIGN_ID,
      source_session_id: null,
      content: prose.memoryFacts.core.content,
      type: 'item',
      importance: 'high',
      status: 'active',
      created_at: DATES.memoryCore,
      updated_at: DATES.memoryCore,
    },
    {
      id: IDS.memory.gnomengarde,
      campaign_id: DEMO_CAMPAIGN_ID,
      source_session_id: null,
      content: prose.memoryFacts.gnomengarde.content,
      type: 'secret',
      importance: 'medium',
      status: 'active',
      created_at: DATES.memoryGnomengarde,
      updated_at: DATES.memoryGnomengarde,
    },
    {
      id: IDS.memory.manticore,
      campaign_id: DEMO_CAMPAIGN_ID,
      source_session_id: IDS.session.s7,
      content: prose.memoryFacts.manticore.content,
      type: 'tension',
      importance: 'low',
      status: 'active',
      created_at: DATES.memoryManticore,
      updated_at: DATES.memoryManticore,
    },
  ]

  const [suggestion1, suggestion2, suggestion3] = prose.suggestions
  const memorySuggestions: MemorySuggestion[] = [
    {
      content: suggestion1.content,
      type: 'consequence',
      importance: 'high',
      reason: suggestion1.reason,
      related: suggestion1.related,
    },
    {
      content: suggestion2.content,
      type: 'item',
      importance: 'high',
      reason: suggestion2.reason,
      related: suggestion2.related,
    },
    {
      content: suggestion3.content,
      type: 'relationship',
      importance: 'medium',
      reason: suggestion3.reason,
      related: suggestion3.related,
    },
  ]

  const [synopsis, goal, opening, beats, encounters, factions, arcs] =
    prose.generated.sections
  const generatedSession: SessionDetail = {
    id: DEMO_GENERATED_SESSION_ID,
    campaign_id: DEMO_CAMPAIGN_ID,
    session_number: 8,
    summary: prose.generated.summary,
    consequences: null,
    generated_content: {
      title: prose.generated.title,
      sections: [
        {
          id: 'synopsis',
          label: synopsis.label,
          body: synopsis.body,
          origin: 'scribe',
        },
        { id: 'goal', label: goal.label, body: goal.body, origin: 'scribe' },
        {
          id: 'opening',
          label: opening.label,
          body: opening.body,
          origin: 'scribe',
        },
        { id: 'beats', label: beats.label, body: beats.body, origin: 'scribe' },
        {
          id: 'encounters',
          label: encounters.label,
          body: encounters.body,
          origin: 'scribe',
        },
        {
          id: 'factions',
          label: factions.label,
          body: factions.body,
          origin: 'scribe',
        },
        { id: 'arcs', label: arcs.label, body: arcs.body, origin: 'scribe' },
      ],
      continuity_links: [
        {
          memory_fact_id: IDS.memory.herman,
          relevance: prose.generated.continuityRelevance.herman,
        },
        {
          memory_fact_id: IDS.memory.halia,
          relevance: prose.generated.continuityRelevance.halia,
        },
        {
          memory_fact_id: IDS.memory.core,
          relevance: prose.generated.continuityRelevance.core,
        },
      ],
    },
    trace_json: null,
    created_at: DATES.generatedCreatedAt,
    updated_at: DATES.generatedUpdatedAt,
  }

  return {
    campaign: campaignDetailResponseSchema.parse(campaignDetail),
    sessions: sessions.map((session) => sessionResponseSchema.parse(session)),
    memoryFacts: memoryFacts.map((fact) =>
      memoryFactResponseSchema.parse(fact)
    ),
    suggestions: memorySuggestions.map((suggestion) =>
      memorySuggestionSchema.parse(suggestion)
    ),
    generated: sessionDetailSchema.parse(generatedSession),
  }
}

const en = buildFixtures({
  campaign: {
    title: 'Shadows over Phandalin',
    description:
      'A low-magic intrigue campaign where a stolen anti-dragon weapon plan pulls three guilds into open conflict.',
    worldState:
      'Phandalin sits uneasy. The theft of the anti-dragon weapon plans has the Black Bear Guild and the Crimson Blades circling each other, and a young white dragon, Cryovain, has begun testing the roads to the north. The party is trusted by some, watched by all.',
  },
  system: 'D&D 5e',
  tone: 'Low-magic intrigue',
  npcs: {
    ander: {
      name: 'Ander Margaster',
      description:
        'A cautious merchant lord who bankrolls the Black Bear Guild while pretending neutrality.',
      currentState:
        'Quietly funding a search for the stolen plans, terrified of being exposed.',
      motivation: 'Protect his fortune and his family name above all else.',
    },
    herman: {
      name: 'Robert Herman',
      description:
        'A disgraced captain of the town guard, publicly humiliated by the party three sessions ago.',
      currentState: 'Nursing his grievance in silence; has not yet retaliated.',
      motivation:
        'Restore his standing and repay the humiliation with interest.',
    },
    halia: {
      name: 'Halia Thornton',
      description:
        'Master of the Miners Exchange and the ambitious hand behind the Black Bear Guild.',
      currentState:
        'Weighing whether the party is an asset or a liability after a mixed first impression.',
      motivation:
        'Consolidate control of Phandalin through leverage, not force.',
    },
    fibblestib: {
      name: 'Fibblestib',
      description:
        'A frantic gnome artificer from Gnomengarde who understands the anti-dragon weapon better than anyone.',
      currentState:
        'Convinced the arcane instability is spreading and no one will listen.',
      motivation:
        'Prove the danger is real before Gnomengarde tears itself apart.',
    },
    cryovain: {
      name: 'Cryovain',
      description:
        'A young white dragon staking a claim over the northern reaches of the region.',
      currentState:
        'Growing bolder, testing the roads and the villages nearest the mountains.',
      motivation: 'Establish an unchallenged hunting territory.',
    },
  },
  factions: {
    blackbear: {
      name: 'Black Bear Guild',
      description:
        'A merchants-and-miners cartel that wants Phandalin under quiet economic control.',
      currentStance:
        'Cautiously courting the party while hunting for the stolen plans.',
      goals: 'Recover the anti-dragon plans and turn them into leverage.',
    },
    crimson: {
      name: 'Crimson Blades',
      description:
        'A mercenary company that suspects the Black Bear Guild orchestrated the theft.',
      currentStance: 'Openly hostile to the Guild; wary of the party.',
      goals: 'Seize the plans first and sell them to the highest bidder.',
    },
    zhentarim: {
      name: 'Zhentarim Contacts',
      description:
        'A shadow network offering the party information — at a price that always compounds.',
      currentStance: 'Neutral, transactional, patient.',
      goals:
        'Insert themselves as the indispensable middlemen of the conflict.',
    },
    gnomengarde: {
      name: 'Gnomengarde Inventors',
      description:
        'The reclusive tinkers who designed the weapon and now fear their own creation.',
      currentStance:
        'Fractured; some want the party as allies, others want secrecy.',
      goals: 'Contain the arcane instability before it becomes public.',
    },
  },
  arcs: {
    plans: {
      title: 'Recover the stolen anti-dragon plans',
      description:
        'The plans changed hands during the raid on the caravan and are now somewhere in Phandalin.',
    },
    herman: {
      title: "Robert Herman's revenge",
      description:
        'Herman was humiliated in public and has the connections to make the party pay quietly.',
    },
    instability: {
      title: 'Gnomengarde arcane instability',
      description:
        'The weapon needs a stable arcane core, and the instability at Gnomengarde may run deeper than a single device.',
    },
    cryovain: {
      title: "Cryovain's pressure over the region",
      description:
        'A young white dragon is pressing on the northern roads, raising the stakes of the guild conflict.',
    },
  },
  sessions: {
    s5: {
      summary:
        'The party exposed Captain Herman in front of the town council, turning the crowd against him.',
      consequences:
        'Herman was stripped of his commission and left the meeting in disgrace.',
    },
    s6: {
      summary:
        'Negotiations with Halia Thornton went sideways — two PCs won her favor, two badly damaged it.',
      consequences:
        'The Black Bear Guild now treats the party as a divided, unpredictable asset.',
    },
    s7: {
      summary:
        'A detour through the foothills ended with the party sparing a cornered manticore rather than killing it.',
      consequences:
        'The manticore fled north, toward Cryovain’s growing territory.',
    },
  },
  memoryFacts: {
    herman: {
      content:
        'Robert Herman was publicly humiliated by the party and has not yet retaliated.',
    },
    halia: {
      content:
        'Two party members earned Halia Thornton’s favor while two damaged it, leaving the Guild ambivalent.',
    },
    core: {
      content: 'The anti-dragon weapon needs a stable arcane core to function.',
    },
    gnomengarde: {
      content:
        'The Gnomengarde instability may run deeper than a single failed device.',
    },
    manticore: {
      content: 'The party spared a manticore that fled north and may return.',
    },
  },
  suggestions: [
    {
      content:
        'The party publicly accused the Crimson Blades of orchestrating the caravan raid.',
      reason:
        'This shifts the Crimson Blades from wary to openly antagonistic and changes who the party can safely deal with.',
      related: ['Crimson Blades', 'Black Bear Guild'],
    },
    {
      content:
        'Fibblestib entrusted the party with a fragment of the weapon schematic.',
      reason:
        'A physical piece of the anti-dragon plans is now in play, giving the party leverage in the guild conflict.',
      related: ['Fibblestib', 'Recover the stolen anti-dragon plans'],
    },
    {
      content:
        'Halia Thornton offered the party a private meeting, favor unresolved.',
      reason:
        'Her ambivalence is turning into a concrete opportunity the DM may want the next session to build on.',
      related: ['Halia Thornton', 'Black Bear Guild'],
    },
  ],
  generated: {
    summary:
      'The party is drawn into a tense parley between the guilds while Cryovain’s shadow lengthens over the northern roads.',
    title: 'The Parley at the Miners Exchange',
    sections: [
      {
        label: 'Synopsis',
        body: 'With a schematic fragment in hand, the party is summoned to the Miners Exchange, where Halia Thornton means to broker a fragile truce — and where the Crimson Blades intend to make sure no truce holds.',
      },
      {
        label: 'Session goal',
        body: 'Force the party to decide who holds the anti-dragon plans, and at what political cost, before Cryovain forces everyone’s hand.',
      },
      {
        label: 'Opening scene',
        body: 'A cold morning at the Miners Exchange. Halia waits at the head of a long table; Crimson Blades lieutenants line the far wall. The schematic fragment feels heavier than it should.',
      },
      {
        label: 'Key beats',
        body: '- The parley opens civil, then curdles as accusations about the caravan raid surface.\n- Fibblestib arrives uninvited, insisting the instability is spreading.\n- A rider brings word that Cryovain has been sighted over the north road.',
      },
      {
        label: 'Encounters',
        body: 'A social encounter (the parley) that can tip into a skirmish if the party mishandles Herman’s planted informant among the guards.',
      },
      {
        label: 'Faction reactions',
        body: 'The Black Bear Guild pushes for control of the plans; the Crimson Blades stall for a chance to seize them; the Zhentarim quietly offer the party an exit — for a price.',
      },
      {
        label: 'Arc progression',
        body: 'Recovering the stolen plans advances toward a decision point; Cryovain’s pressure escalates from rumor to immediate threat.',
      },
    ],
    continuityRelevance: {
      herman:
        'Herman’s unretaliated humiliation seeds the planted informant among the guards.',
      halia:
        'Halia’s ambivalence sets the fragile, self-interested tone of the parley.',
      core: 'The need for a stable arcane core is why the schematic fragment matters.',
    },
  },
})

const es = buildFixtures({
  campaign: {
    title: 'Sombras sobre Phandalin',
    description:
      'Una campaña de intriga de baja magia en la que el plan robado de un arma antidragón arrastra a tres gremios a un conflicto abierto.',
    worldState:
      'Phandalin vive con inquietud. El robo de los planos del arma antidragón ha puesto al Gremio del Oso Negro y a las Hojas Carmesí a acecharse mutuamente, y un joven dragón blanco, Cryovain, ha empezado a tantear los caminos del norte. La partida cuenta con la confianza de algunos y la vigilancia de todos.',
  },
  system: 'D&D 5e',
  tone: 'Low-magic intrigue',
  npcs: {
    ander: {
      name: 'Ander Margaster',
      description:
        'Un cauteloso señor mercader que financia al Gremio del Oso Negro mientras finge neutralidad.',
      currentState:
        'Financia en secreto la búsqueda de los planos robados, aterrado de que lo descubran.',
      motivation:
        'Proteger su fortuna y el nombre de su familia por encima de todo.',
    },
    herman: {
      name: 'Robert Herman',
      description:
        'Un capitán deshonrado de la guardia de la ciudad, humillado públicamente por la partida hace tres sesiones.',
      currentState: 'Rumia su rencor en silencio; todavía no se ha vengado.',
      motivation: 'Recuperar su posición y devolver la humillación con creces.',
    },
    halia: {
      name: 'Halia Thornton',
      description:
        'Dueña de la Lonja de Mineros y la mano ambiciosa tras el Gremio del Oso Negro.',
      currentState:
        'Sopesando si la partida es un activo o un lastre tras una primera impresión ambigua.',
      motivation:
        'Consolidar el control de Phandalin mediante influencia, no por la fuerza.',
    },
    fibblestib: {
      name: 'Fibblestib',
      description:
        'Un frenético artífice gnomo de Gnomengarde que entiende el arma antidragón mejor que nadie.',
      currentState:
        'Convencido de que la inestabilidad arcana se está propagando y de que nadie le escucha.',
      motivation:
        'Demostrar que el peligro es real antes de que Gnomengarde se desmorone.',
    },
    cryovain: {
      name: 'Cryovain',
      description:
        'Un joven dragón blanco que reclama para sí los confines norteños de la región.',
      currentState:
        'Cada vez más audaz, tantea los caminos y las aldeas más cercanas a las montañas.',
      motivation: 'Establecer un territorio de caza sin rivales.',
    },
  },
  factions: {
    blackbear: {
      name: 'Gremio del Oso Negro',
      description:
        'Un cartel de mercaderes y mineros que quiere Phandalin bajo un control económico discreto.',
      currentStance:
        'Corteja con cautela a la partida mientras busca los planos robados.',
      goals: 'Recuperar los planos antidragón y convertirlos en influencia.',
    },
    crimson: {
      name: 'Hojas Carmesí',
      description:
        'Una compañía mercenaria que sospecha que el Gremio del Oso Negro orquestó el robo.',
      currentStance:
        'Abiertamente hostil hacia el Gremio; recelosa de la partida.',
      goals: 'Hacerse con los planos primero y venderlos al mejor postor.',
    },
    zhentarim: {
      name: 'Contactos Zhentarim',
      description:
        'Una red en la sombra que ofrece información a la partida, a un precio que siempre crece.',
      currentStance: 'Neutral, transaccional, paciente.',
      goals: 'Convertirse en el intermediario imprescindible del conflicto.',
    },
    gnomengarde: {
      name: 'Inventores de Gnomengarde',
      description:
        'Los reclusos artesanos que diseñaron el arma y ahora temen su propia creación.',
      currentStance:
        'Divididos; unos quieren a la partida como aliada, otros prefieren el secretismo.',
      goals: 'Contener la inestabilidad arcana antes de que se haga pública.',
    },
  },
  arcs: {
    plans: {
      title: 'Recuperar los planos antidragón robados',
      description:
        'Los planos cambiaron de manos durante el asalto a la caravana y ahora están en algún lugar de Phandalin.',
    },
    herman: {
      title: 'La venganza de Robert Herman',
      description:
        'Herman fue humillado en público y tiene los contactos para hacer pagar a la partida discretamente.',
    },
    instability: {
      title: 'Inestabilidad arcana de Gnomengarde',
      description:
        'El arma necesita un núcleo arcano estable, y la inestabilidad en Gnomengarde podría ser más profunda que un simple fallo del dispositivo.',
    },
    cryovain: {
      title: 'La presión de Cryovain sobre la región',
      description:
        'Un joven dragón blanco presiona los caminos del norte, elevando la tensión del conflicto entre gremios.',
    },
  },
  sessions: {
    s5: {
      summary:
        'La partida expuso al capitán Herman ante el consejo de la ciudad, poniendo a la multitud en su contra.',
      consequences:
        'Herman fue destituido de su cargo y abandonó la reunión deshonrado.',
    },
    s6: {
      summary:
        'Las negociaciones con Halia Thornton se torcieron: dos PJ se ganaron su favor, dos lo dañaron gravemente.',
      consequences:
        'El Gremio del Oso Negro ahora ve a la partida como un activo dividido e impredecible.',
    },
    s7: {
      summary:
        'Un desvío por las estribaciones terminó con la partida perdonando a una mantícora acorralada en lugar de matarla.',
      consequences:
        'La mantícora huyó hacia el norte, hacia el territorio creciente de Cryovain.',
    },
  },
  memoryFacts: {
    herman: {
      content:
        'Robert Herman fue humillado públicamente por la partida y todavía no se ha vengado.',
    },
    halia: {
      content:
        'Dos miembros de la partida se ganaron el favor de Halia Thornton mientras que otros dos lo dañaron, dejando al Gremio dividido.',
    },
    core: {
      content:
        'El arma antidragón necesita un núcleo arcano estable para funcionar.',
    },
    gnomengarde: {
      content:
        'La inestabilidad de Gnomengarde podría ser más profunda que un simple dispositivo fallido.',
    },
    manticore: {
      content:
        'La partida perdonó a una mantícora que huyó al norte y podría regresar.',
    },
  },
  suggestions: [
    {
      content:
        'La partida acusó públicamente a las Hojas Carmesí de orquestar el asalto a la caravana.',
      reason:
        'Esto convierte a las Hojas Carmesí de recelosas en abiertamente antagonistas y cambia con quién puede tratar la partida con seguridad.',
      related: ['Hojas Carmesí', 'Gremio del Oso Negro'],
    },
    {
      content:
        'Fibblestib confió a la partida un fragmento del esquema del arma.',
      reason:
        'Una pieza física de los planos antidragón ya está en juego, dando a la partida influencia en el conflicto entre gremios.',
      related: ['Fibblestib', 'Recuperar los planos antidragón robados'],
    },
    {
      content:
        'Halia Thornton le ofreció a la partida una reunión privada, con su favor aún sin resolver.',
      reason:
        'Su ambivalencia se está convirtiendo en una oportunidad concreta que el DJ quizá quiera desarrollar en la próxima sesión.',
      related: ['Halia Thornton', 'Gremio del Oso Negro'],
    },
  ],
  generated: {
    summary:
      'La partida se ve arrastrada a una tensa negociación entre los gremios mientras la sombra de Cryovain se alarga sobre los caminos del norte.',
    title: 'La negociación en la Lonja de Mineros',
    sections: [
      {
        label: 'Sinopsis',
        body: 'Con un fragmento del esquema en mano, la partida es convocada a la Lonja de Mineros, donde Halia Thornton pretende negociar una tregua frágil, y donde las Hojas Carmesí están decididas a que ninguna tregua se sostenga.',
      },
      {
        label: 'Objetivo de la sesión',
        body: 'Obligar a la partida a decidir quién se queda con los planos antidragón, y a qué coste político, antes de que Cryovain fuerce la mano de todos.',
      },
      {
        label: 'Escena inicial',
        body: 'Una mañana fría en la Lonja de Mineros. Halia espera a la cabecera de una larga mesa; los lugartenientes de las Hojas Carmesí se alinean junto a la pared del fondo. El fragmento del esquema pesa más de lo que debería.',
      },
      {
        label: 'Momentos clave',
        body: '- La negociación empieza civilizada y se agria cuando salen a la luz las acusaciones sobre el asalto a la caravana.\n- Fibblestib aparece sin ser invitado, insistiendo en que la inestabilidad se está propagando.\n- Un jinete trae noticias de que han avistado a Cryovain sobre el camino del norte.',
      },
      {
        label: 'Encuentros',
        body: 'Un encuentro social (la negociación) que puede degenerar en enfrentamiento si la partida gestiona mal al informante que Herman ha infiltrado entre los guardias.',
      },
      {
        label: 'Reacciones de los gremios',
        body: 'El Gremio del Oso Negro presiona por el control de los planos; las Hojas Carmesí dan largas a la espera de una oportunidad para hacerse con ellos; los Zhentarim, en silencio, ofrecen a la partida una salida, a cambio de un precio.',
      },
      {
        label: 'Progresión de los arcos',
        body: 'Recuperar los planos robados avanza hacia un punto de decisión; la presión de Cryovain escala de rumor a amenaza inmediata.',
      },
    ],
    continuityRelevance: {
      herman:
        'La humillación no vengada de Herman siembra al informante infiltrado entre los guardias.',
      halia:
        'La ambivalencia de Halia marca el tono frágil e interesado de la negociación.',
      core: 'La necesidad de un núcleo arcano estable es la razón por la que importa el fragmento del esquema.',
    },
  },
})

/** Every demo locale's fully validated fixture bundle. */
export const fixturesByLocale: Record<DemoLocale, DemoFixtures> = { en, es }

/**
 * Resolve the demo fixture bundle for a given locale, falling back to the
 * default ({@link DEFAULT_DEMO_LOCALE}) for any unsupported value.
 *
 * @param {string} locale - The active route locale.
 * @returns {DemoFixtures} The matching (or fallback) fixture bundle.
 */
export function getDemoFixtures(locale: string): DemoFixtures {
  return locale in fixturesByLocale
    ? fixturesByLocale[locale as DemoLocale]
    : fixturesByLocale[DEFAULT_DEMO_LOCALE]
}

// Backward-compatible top-level exports — the en bundle, for callers (tests,
// and any locale-agnostic embedding) that don't need locale selection.
/** The demo campaign detail, validated against the production read schema (en). */
export const demoCampaign = fixturesByLocale.en.campaign
/** The demo session history, validated against the production read schema (en). */
export const demoSessions = fixturesByLocale.en.sessions
/** The demo active memories, validated against the production read schema (en). */
export const demoMemoryFacts = fixturesByLocale.en.memoryFacts
/** The demo Scribe memory proposals, validated against the production schema (en). */
export const demoMemorySuggestions = fixturesByLocale.en.suggestions
/** The demo pre-generated session draft, validated against the production schema (en). */
export const demoGeneratedSession = fixturesByLocale.en.generated
