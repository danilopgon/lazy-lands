// Lazy Lands — full mock dataset for the prototype
window.LLD = {
  user: { name: "Dani", initials: "DM", email: "dm@lazylands.app" },

  campaigns: [
    {
      id: "phandalin",
      name: "Sombras sobre Phandalin",
      system: "D&D 5e",
      tone: "Low-magic intrigue",
      sessions: 7, npcs: 5, factions: 4, memories: 5, arcs: 4,
      updated: "2 days ago",
      status: "Memories pending review",
      statusKind: "accent",
    },
    {
      id: "saltroad",
      name: "The Salt Road",
      system: "Forbidden Lands",
      tone: "Grim survival",
      sessions: 2, npcs: 3, factions: 1, memories: 2, arcs: 2,
      updated: "3 weeks ago",
      status: "Up to date",
      statusKind: "muted",
    },
  ],

  worldState:
    "Cryovain circles the Sword Mountains and Phandalin's militia is stretched thin. The Black Bear Guild has gone quiet since the warehouse fire, and word of the stolen anti-dragon plans has reached Zhentarim ears.",

  metrics: [
    { label: "Active NPCs", value: 5, to: "npcs" },
    { label: "Factions", value: 4, to: "factions" },
    { label: "Open arcs", value: 4, to: "arcs" },
    { label: "Active memories", value: 5, to: "memory" },
    { label: "Sessions logged", value: 7, to: "detail" },
  ],

  sessions: [
    { id: "s7", num: 7, numeral: "VII", title: "The Warehouse Fire", date: "Jun 9", note: "4 memories pending review" },
    { id: "s6", num: 6, numeral: "VI", title: "Favors in Gnomengarde", date: "Jun 1", note: "3 memories accepted" },
    { id: "s5", num: 5, numeral: "V", title: "A Manticore's Bargain", date: "May 24", note: "2 memories accepted" },
    { id: "s4", num: 4, numeral: "IV", title: "Humiliation at the Miner's Exchange", date: "May 17", note: "2 memories accepted" },
  ],

  npcs: [
    {
      id: "ander", name: "Ander Margaster", origin: "scribe",
      desc: "Disgraced noble bankrolling the recovery of the anti-dragon plans. Charming in public, ruthless in ledgers.",
      status: "Active", motivation: "Restore his family name before his creditors find him.",
      relation: "Wary ally", faction: "Crimson Blades", sessions: "S2 · S5 · S7",
    },
    {
      id: "robert", name: "Robert Herman", origin: "edited",
      desc: "Former caravan master whose business the party dismantled. Smiles too easily now.",
      status: "Scheming", motivation: "Repay his public humiliation in kind, with interest.",
      relation: "Hostile (concealed)", faction: "Black Bear Guild", sessions: "S3 · S4 · S7",
    },
    {
      id: "halia", name: "Halia Thornton", origin: "scribe",
      desc: "Guildmaster of the Miner's Exchange and quiet Zhentarim hand. Trades in favors, not coin.",
      status: "Active", motivation: "Turn Phandalin's chaos into a Zhentarim foothold.",
      relation: "Split: favors two PCs, distrusts two", faction: "Zhentarim Contacts", sessions: "S3 · S6",
    },
    {
      id: "fibblestib", name: "Fibblestib", origin: "scribe",
      desc: "Co-inventor of Gnomengarde's arcane core. Speaks in half-finished equations.",
      status: "Anxious", motivation: "Stabilize the core before the king notices it is failing.",
      relation: "Friendly", faction: "Gnomengarde Inventors", sessions: "S6",
    },
    {
      id: "cryovain", name: "Cryovain", origin: "edited",
      desc: "Young white dragon nesting on Icespire Peak. Hunts wider every week.",
      status: "Threat", motivation: "Claim the Sword Mountains as undisputed territory.",
      relation: "Enemy", faction: "—", sessions: "S1 · S5",
    },
  ],

  factions: [
    {
      id: "blackbear", name: "Black Bear Guild", origin: "scribe",
      desc: "Smugglers' guild operating out of the Phandalin warehouse district.",
      posture: "Hostile", objective: "Recover face and cargo lost in the warehouse fire.",
      influence: "Local muscle, dwindling coin", npcs: "Robert Herman",
      arcs: "Robert Herman's revenge", lastReaction: "Went silent after the fire. Too silent. (S7)",
    },
    {
      id: "crimson", name: "Crimson Blades", origin: "scribe",
      desc: "Mercenary company hired to escort the anti-dragon plans, before they were stolen.",
      posture: "Transactional", objective: "Complete the contract; collect the second half of payment.",
      influence: "Forty blades, one airship", npcs: "Ander Margaster",
      arcs: "Recover the stolen anti-dragon plans", lastReaction: "Offered the party a joint operation. (S7)",
    },
    {
      id: "zhentarim", name: "Zhentarim Contacts", origin: "edited",
      desc: "A quiet web of agents trading in leverage across the Triboar Trail.",
      posture: "Opportunistic", objective: "Own whoever ends up holding the anti-dragon weapon.",
      influence: "Coin, secrets, couriers", npcs: "Halia Thornton",
      arcs: "Recover the stolen anti-dragon plans", lastReaction: "Halia asked pointed questions about the fire. (S6)",
    },
    {
      id: "gnomengarde", name: "Gnomengarde Inventors", origin: "scribe",
      desc: "Reclusive gnome workshop-court beneath the falls, source of the arcane core.",
      posture: "Friendly", objective: "Keep the core's instability secret until it is fixed.",
      influence: "Unmatched artifice, no soldiers", npcs: "Fibblestib",
      arcs: "Gnomengarde arcane instability", lastReaction: "Sent the party a humming, unlabeled crate. (S7)",
    },
  ],

  arcs: [
    {
      id: "plans", title: "Recover the stolen anti-dragon plans", origin: "scribe",
      desc: "The schematics for a dragon-slaying ballista vanished in transit. Every faction wants them first.",
      priority: "High", status: "Active", npcs: "Ander Margaster · Halia Thornton",
      factions: "Crimson Blades · Zhentarim", lastSession: "S7", include: true,
      note: "Advanced last session",
    },
    {
      id: "revenge", title: "Robert Herman's revenge", origin: "scribe",
      desc: "Publicly humiliated at the Miner's Exchange, Herman has been patient. Patience is the worrying part.",
      priority: "High", status: "Dormant", npcs: "Robert Herman",
      factions: "Black Bear Guild", lastSession: "S4", include: true,
      note: "Untouched for 3 sessions",
    },
    {
      id: "instability", title: "Gnomengarde arcane instability", origin: "edited",
      desc: "The core under Gnomengarde is failing, and the anti-dragon weapon needs it stable.",
      priority: "Medium", status: "Active", npcs: "Fibblestib",
      factions: "Gnomengarde Inventors", lastSession: "S6", include: true,
      note: "New consequence suggested",
    },
    {
      id: "cryovain-arc", title: "Cryovain's pressure over the region", origin: "scribe",
      desc: "Attacks creep closer to Phandalin. The town can absorb two more raids, maybe three.",
      priority: "Medium", status: "Active", npcs: "Cryovain",
      factions: "—", lastSession: "S5", include: false,
      note: "Excluded from next generation",
    },
  ],

  memories: [
    { id: "m1", type: "Consequence", text: "Robert Herman was publicly humiliated and has not retaliated yet.", origin: "Session 4", related: "Robert Herman" },
    { id: "m2", type: "Relationship", text: "Two party members earned Halia Thornton's favor; two damaged their reputation.", origin: "Session 3", related: "Halia Thornton" },
    { id: "m3", type: "Fact", text: "The anti-dragon weapon requires a stable arcane core.", origin: "Session 6", related: "Gnomengarde Inventors" },
    { id: "m4", type: "Secret", text: "The instability beneath Gnomengarde may have deeper consequences.", origin: "Session 6", related: "Fibblestib" },
    { id: "m5", type: "Fact", text: "The party spared a manticore that may return later.", origin: "Session 5", related: "—" },
  ],

  suggestions: [
    {
      id: "g1", type: "Consequence", importance: "High", origin: "Session 7 · The Warehouse Fire",
      text: "Halia Thornton now knows the party started the warehouse fire, and she has not yet decided how to use it.",
      why: "Halia's favor was already split across the party. This gives her leverage over the half she distrusts.",
      related: ["Halia Thornton", "Black Bear Guild"],
    },
    {
      id: "g2", type: "Fact", importance: "Medium", origin: "Session 7 · The Warehouse Fire",
      text: "The crate recovered from the warehouse bears Gnomengarde workshop marks.",
      why: "It ties the smugglers to the failing core: two open arcs may be one arc.",
      related: ["Gnomengarde Inventors", "Black Bear Guild"],
    },
    {
      id: "g3", type: "Relationship", importance: "Medium", origin: "Session 7 · The Warehouse Fire",
      text: "Ander Margaster covered for the party when the militia asked about the fire.",
      why: "He will expect repayment, likely in the form of help recovering the plans.",
      related: ["Ander Margaster"],
    },
    {
      id: "g4", type: "Secret", importance: "Low", origin: "Session 7 · The Warehouse Fire",
      text: "A dockhand saw Robert Herman near the warehouse an hour before the fire started.",
      why: "May be nothing. May be Herman's patience finally ending.",
      related: ["Robert Herman"],
    },
  ],

  // Extraction draft shown at /campaigns/new/review
  extraction: {
    summary:
      "A frontier mining town caught between a hunting dragon, smuggler guilds and quiet Zhentarim ambition. The party arrives as hired escorts and stays as the only people everyone wants to use.",
    world:
      "Phandalin prospers nervously. Cryovain hunts the Sword Mountains, the Black Bear Guild runs the warehouse district, and plans for an anti-dragon weapon are moving north under mercenary guard.",
    npcs: [
      { name: "Ander Margaster", note: "Disgraced noble bankrolling the weapon" },
      { name: "Halia Thornton", note: "Guildmaster, quiet Zhentarim hand" },
      { name: "Cryovain", note: "Young white dragon, escalating threat" },
    ],
    factions: [
      { name: "Black Bear Guild", note: "Smugglers, hostile posture" },
      { name: "Crimson Blades", note: "Mercenary escort company" },
    ],
    arcs: [
      { name: "Recover the stolen anti-dragon plans", note: "High priority" },
      { name: "Cryovain's pressure over the region", note: "Medium priority" },
    ],
  },

  // Generated proposal for next session (S8)
  generated: {
    id: "s8", num: 8, title: "The Quiet Ledger",
    sections: [
      { id: "synopsis", label: "Synopsis", origin: "scribe", body: "Halia Thornton calls in the party for a private audience at the Miner's Exchange. She knows about the fire, and offers silence in exchange for retrieving the Gnomengarde-marked crate's twin before the Black Bear Guild moves it out of town. Meanwhile, Herman's patience runs out." },
      { id: "goal", label: "Session goal", origin: "scribe", body: "Force the party to choose between Halia's protection and exposing her leverage, while Herman's first move lands." },
      { id: "opening", label: "Opening scene", origin: "scribe", body: "Dawn at the Miner's Exchange. Halia serves tea with two cups too few. On the table: a dock manifest with one line circled, and a small Gnomengarde gear, still warm." },
      { id: "beats", label: "Main beats", origin: "scribe", body: "• Halia's offer: silence for the twin crate, delivered unopened.\n• The warehouse district at night: Black Bear lookouts, one bribable, one loyal.\n• The crate hums. Fibblestib's marks are on the inside, not the outside.\n• Herman's move: the dockhand witness turns up at the militia barracks, or floats in the harbor, if the party stalled." },
      { id: "encounters", label: "Encounters", origin: "scribe", body: "• Rooftop chase across the warehouse district (skill challenge, DC 13 ladder).\n• Black Bear enforcers + a hired manticore handler. The manticore the party spared recognizes them.\n• Optional: Crimson Blades patrol intercepts whoever carries the crate." },
      { id: "factions", label: "Faction reactions", origin: "scribe", body: "• Zhentarim: Halia tightens her grip regardless of outcome.\n• Black Bear Guild: open hostility if the crate is taken; Herman steps into guild leadership.\n• Gnomengarde: panic if the crate is opened; it is a piece of the failing core." },
      { id: "arcs", label: "Arc progression", origin: "scribe", body: "• Anti-dragon plans: the crate links the plans to Gnomengarde's core (major step).\n• Herman's revenge: moves from dormant to active. First strike lands this session.\n• Arcane instability: surfaces in town for the first time." },
    ],
    memoriesUsed: ["m1", "m2", "m3", "m5"],
    privateNotes: "If the party sides with Halia too easily, have Herman's witness implicate THEM instead. Keep Cryovain off-screen: one distant roar at the end, max.",
  },
};
