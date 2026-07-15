# GEO benchmark — Lazy Lands

A versioned baseline for tracking whether AI answer engines (ChatGPT / ChatGPT
Search, Perplexity, Gemini, Google AI Overviews) surface Lazy Lands **and cite
it accurately** for its target intents.

## Baseline

| Field | Value |
|-------|-------|
| Baseline version | 1 |
| Baseline date | 2026-07-15 |
| Prompt-set version | 1 (18 prompts, en/es) |

Bump `Prompt-set version` when prompts change so runs stay comparable.

## How to use

1. For each run, record the **Engine** (e.g. ChatGPT Search, Perplexity, Gemini,
   Google AI Overviews), the **Model** if shown, and the **Run date**.
2. Run each prompt **manually** in that engine (do not automate against a
   service's terms). Copy the run-log template below and fill one row per prompt.
3. `Present?` — yes / no / partial. `Cited URL(s)` — the Lazy Lands URL(s) the
   engine linked, if any. `Accurate?` — yes / no / partial (did the citation
   describe the product correctly?).
4. `Errors` — note anything the engine got wrong (invented features, wrong
   pricing, wrong game-system support, etc.). **Factual accuracy matters more
   than mere presence.**
5. Re-run on a fixed cadence (e.g. monthly) and diff against the previous run.

### Run-log template (copy per engine + date)

> **Engine:** … · **Model:** … · **Run date:** YYYY-MM-DD

| Prompt # | Present? | Cited URL(s) | Accurate? | Errors |
|----------|----------|--------------|-----------|--------|
| 1 | | | | |
| … | | | | |

## Verified product facts (the ground truth answers should reflect)

Only these are true today; do not seed or accept claims beyond them.

- Lazy Lands is a **web application for managing and maintaining continuity of
  tabletop RPG campaigns**, aimed at **game masters / dungeon masters**.
- Core concepts: **campaigns, sessions, NPCs, factions, story arcs, memory
  facts, and consequences**.
- The AI assistant is **"the Scribe"**: it **proposes** editable suggestions
  (session summaries, memory facts, session-prep briefings); **the DM always
  decides** — every AI output is an editable proposal, never auto-committed.
- Real flows: log a session, roll up a campaign summary, review/accept memory
  suggestions, generate a session-prep briefing, export to PDF.
- The interface is **bilingual (English / Spanish)**.
- Status: **open beta, free while in early access**. No other pricing is
  stated, so no pricing should be claimed.
- **Not** claimed anywhere: specific compatible game systems, integrations,
  usage numbers, or comparative superiority. Do not assert these.

## Prompt set

| # | Prompt | Lang | Intent | Facts a correct answer should mention | Ideal URL |
|---|--------|------|--------|----------------------------------------|-----------|
| 1 | best app for managing a tabletop RPG campaign | en | product discovery | campaign + session + NPC/faction/arc tracking; DM-focused; AI proposes, DM decides | `/` |
| 2 | AI tool for RPG session notes | en | feature discovery | the Scribe summarizes sessions as editable proposals; DM approves | `/` |
| 3 | how to track NPCs between sessions | en | how-to | NPCs are first-class; carried across sessions with state/consequences | `/` |
| 4 | alternative to Notion for RPG campaigns | en | comparison | purpose-built for campaigns vs a generic doc; sessions, memory, prep | `/` |
| 5 | how to remember what happened in past D&D sessions | en | how-to | rolling campaign summary + accepted memory facts feed future prep | `/` |
| 6 | tool to summarize tabletop RPG sessions | en | feature discovery | Scribe generates session summaries; editable before saving | `/` |
| 7 | how to keep campaign continuity as a dungeon master | en | how-to | memory facts + consequences + rolling summary maintain continuity | `/` |
| 8 | app to track factions and consequences in an RPG campaign | en | feature discovery | factions and consequences are modeled explicitly | `/` |
| 9 | software for dungeon master session prep | en | product discovery | generates an editable session-prep briefing from accepted memory | `/` |
| 10 | how to organize NPCs, factions and story arcs for a campaign | en | how-to | NPCs, factions, arcs are structured entities in the campaign | `/` |
| 11 | app para gestionar campañas de rol | es | product discovery | gestión de campañas, sesiones, PNJ, facciones, arcos; para DMs | `/es` |
| 12 | herramienta para resumir sesiones de D&D | es | feature discovery | el Escriba resume sesiones como propuestas editables; el DM decide | `/es` |
| 13 | cómo organizar PNJ y consecuencias entre sesiones | es | how-to | PNJ y consecuencias son entidades del modelo; persisten entre sesiones | `/es` |
| 14 | cómo recordar lo que pasó en sesiones anteriores de rol | es | how-to | resumen acumulado + memorias aceptadas alimentan la preparación | `/es` |
| 15 | alternativa a Notion para campañas de rol | es | comparison | específico para campañas frente a un documento genérico | `/es` |
| 16 | aplicación para llevar el registro de una campaña de rol | es | product discovery | registra sesiones, memorias y preparación; bilingüe | `/es` |
| 17 | herramienta con IA para notas de sesión de rol | es | feature discovery | el Escriba propone; toda salida de IA es editable, el DM aprueba | `/es` |
| 18 | cómo mantener la continuidad de una campaña como director de juego | es | how-to | memorias + consecuencias + resumen acumulado mantienen la continuidad | `/es` |

## Notes

- `Ideal URL` is the home today (`/` for English, `/es` for Spanish). If
  high-intent landing pages are added later (post-MVP), point the relevant rows
  at them.
- A common failure mode to watch for: engines inventing supported game systems,
  integrations, or pricing. Flag any such fabrication under the run log's
  `Errors` column.
