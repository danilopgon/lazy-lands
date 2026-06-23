# Lazy Lands — Product Criteria

> Lazy Lands is a **Campaign Companion for Dungeon Masters**. It helps a DM prepare sessions
> while keeping narrative continuity between games. This document captures the product
> principles, the core flow, the screen inventory and the non-negotiable behaviors the
> prototype established. Pair it with `DESIGN.md` (the visual system) when initializing the build.

---

## Register

product

Lazy Lands is primarily a task-focused application surface. The landing page belongs to the
product flow as the entry point, but future design work should default to the product register:
clarity, trust, reviewability, and DM control matter more than campaign-style marketing flourish.

---

## 1. What it is, in one line

> _Your campaign, without the amnesia._ Persistent, **reviewable** memory for your NPCs,
> factions and consequences — so the world remembers what your players did, and the next
> session is built on it.

Primary user: a Dungeon Master preparing sessions across a long-running campaign.

---

## 2. Product principles (non-negotiable)

These three principles drove every screen. They are constraints, not suggestions.

### P1 — The DM always has the last word

**The AI never decides what is canon.** Everything generated is presented as an _editable proposal_. The interface must never imply the AI made a final decision. Sanctioned action verbs: **Review, Edit, Accept, Dismiss, Save changes, Confirm as active memory.** Avoid language like “done / generated / added” for AI output until the DM has confirmed it.

### P2 — Narrative continuity is the core value

The app must let the DM _see the thread_: what happened last session, which NPCs changed, which factions are reacting, which arcs are still open, and which accepted memories will influence the next session. Continuity is the product — surfacing it is the job, not generating one-shots.

### P3 — Memory is reviewable; nothing is automatic

The memory loop is strict and must be preserved:

1. DM logs a session.
2. The AI (“the Scribe”) **proposes** memories.
3. DM **accepts, edits, or dismisses** each one.
4. **Only accepted memories** feed future generation. Dismissed suggestions and private notes never re-enter the model context.

---

## 3. The Scribe — the AI’s persona & rules

The AI is personified as **“the Scribe”** — a chronicler/scribe with a light personality who _proposes_, never decides. Copy convention: _“The Scribe proposes…”_, _“noted in the margins”_, _“stamped into the chronicle”_.

Hard rules for any AI surface:

- Always tagged with **provenance**: `✦ Scribe` (AI-authored, untouched) vs `✎ Edited by you` (human-modified). The moment a DM edits AI content, its badge flips.
- Always carries **Accept / Edit / Dismiss** affordances until confirmed.
- Suggestions show **why it may matter** and which entities they touch — the DM should never have to guess the Scribe’s reasoning.
- Private DM notes are **never** sent to the Scribe and **never** exported to PDF.

---

## 4. Core flow

```
Landing → Register/Login → Create campaign (paste premise)
   → AI extraction review (edit before saving) → Campaign detail
        ↻ per session:
        Log session → Review suggested memories (accept/edit/dismiss)
        → Prepare next session (choose context + direction)
        → Generated session draft (editable) → Export PDF
```

The landing page is **part of the product and the entry point of the flow** — not a detached marketing asset.

---

## 5. Screen inventory (MVP)

Route map as implemented in the prototype (hash-router; real build should use real routes):

| Route                                   | Screen               | Key criteria                                                                                                                                                                                             |
| --------------------------------------- | -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/`                                     | Landing              | Explains what/who/why + the flow; hero, how-it-works, benefits, app preview, final CTA.                                                                                                                  |
| `/login`                                | Login                | Email + password; link to register; **error state** for bad credentials.                                                                                                                                 |
| `/register`                             | Register             | Email + password + confirm; min-length validation; → onboarding (create campaign).                                                                                                                       |
| `/campaigns`                            | Dashboard            | Campaign cards (name, system, #sessions/NPCs/factions/memories/arcs, last update, status); search; create; **empty state**.                                                                              |
| `/campaigns/new`                        | Create campaign      | Name, system, tone, free-text premise, optional details; **char counter + 100-char min**; “Analyze”; loading.                                                                                            |
| `/campaigns/new/review`                 | Extraction review    | Summary, world state, NPCs, factions, arcs — each **editable / removable / addable**; AI-vs-edited marked; confirm to create.                                                                            |
| `/campaigns/[id]`                       | Campaign detail      | World state, metrics, recent sessions, recent active memories, arcs needing attention, primary actions.                                                                                                  |
| `/campaigns/[id]/npcs`                  | NPCs                 | Per NPC: name, description, status, motivation, party relation, faction, related sessions, origin. CRUD + filter.                                                                                        |
| `/campaigns/[id]/factions`              | Factions             | Per faction: description, posture, objective, influence, related NPCs/arcs, last reaction. CRUD + change posture.                                                                                        |
| `/campaigns/[id]/arcs`                  | Open arcs            | Per arc: title, description, priority, status (active/paused/resolved/dismissed), related entities, last session, **include in next generation** toggle.                                                 |
| `/campaigns/[id]/sessions/new`          | Log session          | Title, number, summary, consequences, world/NPC/faction changes, arcs touched, private notes. **Summary required**; save+process loading; error preserves text.                                          |
| `/campaigns/[id]/memory/review`         | Review memories      | Suggestions (type, content, importance, source, related entities, _why_); accept/edit/dismiss; accepted-memories section; empty state.                                                                   |
| `/campaigns/[id]/prepare`               | Prepare next session | Shows context that will be used (summary, last session, world, NPCs, factions, open arcs, accepted memories); optional goal/tone/pace/difficulty/instructions; generate w/ loading.                      |
| `/campaigns/[id]/sessions/[sid]`        | Generated session    | Editable draft: title, synopsis, goal, opening scene, beats, encounters, faction reactions, arc progression, memories used, private notes. Per-section edit/regenerate; distinguishes AI/edited/private. |
| `/campaigns/[id]/sessions/[sid]/export` | PDF export           | Preview, include/exclude toggles, notice that the **edited** version exports, download, back-to-edit. **Excludes private notes.**                                                                        |
| `/campaigns/[id]/settings`              | Settings             | Campaign name, system, default tone, AI config placeholder, danger zone (delete w/ typed confirmation).                                                                                                  |

---

## 6. Required states

Every data surface must handle three states. The prototype demonstrates all of them.

**Loading** (the Scribe is working): analyzing campaign · saving session · generating memories · preparing session · exporting PDF. Use the animated quill + mono caption.

**Empty**: no campaigns · no NPCs · no factions · no arcs · no memories · no sessions. Each is a deliberate, encouraging empty state — never a blank region.

**Error**: bad login · insufficient text (<100 chars) · AI processing failure · invalid AI response · PDF export failure. **Critical:** errors during writing/generation must **never lose the DM’s typed input** — the text stays, retry is offered.

---

## 7. Entity model (informs the schema)

- **Campaign** — name, system, tone, world state, metrics, timestamps, status.
- **Session** — number, title, summary, consequences, world/NPC/faction changes, arcs touched, private notes.
- **NPC** — name, description, status, motivation, party relation, faction (opt), related sessions, **origin** (scribe|edited).
- **Faction** — name, description, posture, objective, influence, related NPCs/arcs, last reaction, origin.
- **Arc** — title, description, priority, status (active|paused|resolved|dismissed), related NPCs/factions, last session, **includeInGeneration** flag, origin.
- **Memory** — type (fact|consequence|relationship|secret), content, importance, source session, related entities, state (suggested|accepted|dismissed|edited).
- **Generated session** — sectioned draft, each section with origin (scribe|edited); list of memories used; private notes (export-excluded).

`origin`/provenance is on every AI-touchable entity — it powers principle P1 and the `✦/✎` badges.

---

## 8. Reference mock data

The prototype ships a coherent example campaign — reuse it for demos, fixtures and tests.

- **Campaign:** _Sombras sobre Phandalin_ (D&D 5e, magic intrigue, 7 sessions).
- **NPCs:** Ander Margaster, Robert Herman, Halia Thornton, Fibblestib, Cryovain.
- **Factions:** Black Bear Guild, Crimson Blades, Zhentarim Contacts, Gnomengarde Inventors.
- **Arcs:** Recover the stolen anti-dragon plans · Robert Herman’s revenge · Gnomengarde arcane instability · Cryovain’s pressure over the region.
- **Memories (accepted):** Herman publicly humiliated, not yet retaliated · two PCs earned Halia’s favor, two damaged it · the anti-dragon weapon needs a stable arcane core · the Gnomengarde instability may run deeper · the party spared a manticore that may return.

Full structured data: `handoff/app/data.js` in the prototype bundle.

---

## 9. Demo / build intent

This package is a **visual + behavioral base for development**, realistic enough to validate the MVP flow and hand to engineering. The prototype’s React-in-browser setup is a fidelity reference, **not** the production stack — rebuild against your real framework using `DESIGN.md` tokens. UI copy is in **English**; the system is bilingual-friendly but ship copy in English unless decided otherwise.

---

## 10. Current frontend implementation status

`apps/web` is the production Next.js target. It currently implements the Block 0 scaffold:

- `/` renders the product landing page using the Print Chronicle palette, fonts, hard borders and ink shadows.
- `/login`, `/register` and `/dashboard` are stable placeholder routes, not finished product flows.
- Authentication, protected campaign data, campaign creation, memory review and session generation are still governed by the MVP screen inventory above and the SDD docs under `docs/`.

Do not treat placeholders as product behavior. They exist to keep navigation and smoke tests stable while the real flows are implemented.
