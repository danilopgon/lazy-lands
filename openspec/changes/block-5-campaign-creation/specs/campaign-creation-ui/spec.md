# Spec: campaign-creation-ui

**Change**: block-5-campaign-creation
**Capability**: `campaign-creation-ui` (new)

---

## Overview

Two new Next.js screens give the DM the onboarding workflow: `/campaigns/new` (free-text
premise form) and `/campaigns/new/review` (editable proposal review). Both reuse the
existing `apiFetch` client (`apps/web/lib/api.ts`), which already injects the Supabase
JWT. This spec covers observable UI behavior only — visual styling follows `DESIGN.md`
and the `handoff/` prototypes as references, not as literal implementation.

**Arcs are in scope**: the review screen renders, and lets the DM edit/remove/add, an
arcs section — matching the `views-review.jsx` prototype and `PRODUCT.md`'s
`/campaigns/new/review` description.

---

## Functional requirements

### CUI-001: `/campaigns/new` — free-text premise form

#### CUI-001.1: Form field

| Field | Type | Validation rule |
|-------|------|-----------------|
| Premise | `<textarea>` | Required; between 100 and 8000 characters (mirrors backend `Field(min_length=100, max_length=8000)`) |

The screen MUST display a visible character counter (current length / 8000) next to the
textarea, updating as the DM types.

Client-side validation MUST run before calling `POST /campaigns/extract`.

#### CUI-001.2: Validation errors never discard typed text

If the premise fails client-side validation (empty, under 100 characters, or over 8000
characters), or if the
backend returns a validation/LLM error, the textarea's content MUST remain exactly as
the DM typed it. No error path may clear or truncate the field.

#### CUI-001.3: Submit behavior

On submit with a premise of 100–8000 characters:
1. Call `apiFetch('/campaigns/extract', { method: 'POST', body: { raw_text } })`.
2. On success: navigate to `/campaigns/new/review`, passing the extracted payload as
   local state (no server-side draft).
3. On error (validation or LLM failure): display an error message in the DOM; the form
   remains interactive and the typed premise is preserved (CUI-001.2).

#### CUI-001.4: Loading state

While the extract call is in flight, the submit control MUST be disabled and a loading
indicator MUST be visible.

#### Scenario: Successful extraction navigates to review

- GIVEN the DM has typed a premise of 100–8000 characters
- WHEN the form is submitted and `POST /campaigns/extract` succeeds
- THEN the browser navigates to `/campaigns/new/review` with the extracted data
  available to that screen

#### Scenario: Premise under 100 characters blocks submission client-side

- GIVEN the DM has typed fewer than 100 characters
- WHEN the DM attempts to submit
- THEN a validation error is visible, no network call is made, and the typed text
  remains in the textarea

#### Scenario: Premise over 8000 characters blocks submission client-side

- GIVEN the DM has typed more than 8000 characters
- WHEN the DM attempts to submit
- THEN a validation error is visible, no network call is made, and the typed text
  remains in the textarea

#### Scenario: Backend error preserves typed premise

- GIVEN the DM has typed a valid premise and submitted
- WHEN `POST /campaigns/extract` returns an error (e.g. LLM validation failure)
- THEN an error message is shown, the DM remains on `/campaigns/new`, and the textarea
  still contains the exact text the DM typed

---

### CUI-002: `/campaigns/new/review` — editable proposal review

#### CUI-002.1: Rendered sections

The screen MUST render, from the extracted payload held as local component state:
title, description, world state, NPCs (each with name/description/current_state/
motivation), factions (each with name/description/current_stance/goals), and arcs (each
with title/description/priority). Arcs MUST be presented as an editable/removable/
addable section alongside NPCs and factions, matching `PRODUCT.md`'s
`/campaigns/new/review` description.

#### CUI-002.2: Provenance badges

Every NPC, faction, and arc item MUST display a provenance indicator reflecting its
`content_source`: `✦ Scribe` when `content_source` is `"llm"`, `✎ Edited` when it is
`"edited"` or `"manual"` (per `docs/03-domain-model.md`'s `ContentSource` value object).
For arcs, this badge is backed by a persisted `content_source` column on `arcs` — the
same provenance treatment as `npcs`/`factions` (see `campaign-persistence` spec).

#### CUI-002.3: Edit flips content_source

When the DM edits any field of an NPC, faction, or arc item that currently has
`content_source: "llm"`, that item's `content_source` MUST flip to `"edited"` and its
badge MUST update accordingly on the next render. Items already `"edited"` remain
`"edited"`.

#### CUI-002.4: Add and remove items

The DM MUST be able to remove any NPC, faction, or arc item, and add new NPC/faction/arc
items. Items added by the DM MUST be created with `content_source: "manual"` (they did
not originate from the Scribe and were not edits of a Scribe proposal) and MUST display
the `✎ Edited` badge (manual and edited share the same DM-authored badge treatment). A
newly added arc MUST default `priority` to `"medium"` when the DM does not set one.

#### CUI-002.5: Confirm and create

On confirmation, the screen MUST call
`apiFetch('/campaigns', { method: 'POST', body: reviewedPayload })` with the current
local-state payload (title, description, world_state, npcs, factions, arcs — each item
carrying its current `content_source`).

#### CUI-002.6: Success — redirect

On a successful `POST /campaigns` response (`{ id }`), the browser MUST navigate to the
campaign detail route for that id (the Block 6 destination screen itself is out of
scope here — only the redirect target/URL shape is required).

#### CUI-002.7: Failure — payload preserved, retryable

If `POST /campaigns` returns an error, the screen MUST display an error message, remain
on `/campaigns/new/review`, and preserve the DM's current reviewed payload (including any
edits, additions, or removals already made) so the DM can retry without re-doing review
work.

#### Scenario: Scribe-proposed NPC shows the Scribe badge

- GIVEN the review screen renders an NPC from the extracted payload with
  `content_source: "llm"`
- WHEN the screen is displayed
- THEN that NPC shows the `✦ Scribe` badge

#### Scenario: Editing a Scribe-proposed item flips its badge

- GIVEN an NPC on the review screen with `content_source: "llm"` and the `✦ Scribe`
  badge
- WHEN the DM edits any field of that NPC
- THEN the NPC's `content_source` becomes `"edited"` and its badge changes to `✎ Edited`

#### Scenario: DM-added faction is marked as DM-authored

- GIVEN the review screen
- WHEN the DM adds a new faction via the add-item control
- THEN the new faction has `content_source: "manual"` and displays the `✎ Edited` badge

#### Scenario: DM-added arc is marked as DM-authored

- GIVEN the review screen
- WHEN the DM adds a new arc via the add-item control
- THEN the new arc has `content_source: "manual"`, `priority: "medium"` by default, and
  displays the `✎ Edited` badge

#### Scenario: Successful save redirects to the campaign

- GIVEN the DM has reviewed the proposal and clicks confirm
- WHEN `POST /campaigns` returns `{ id }` successfully
- THEN the browser navigates to the campaign detail route for that id

#### Scenario: Save failure preserves the DM's review state

- GIVEN the DM has edited, removed, and added items on the review screen
- WHEN `POST /campaigns` fails
- THEN an error message is shown, the DM remains on the review screen, and every edit/
  removal/addition already made is still present in local state (nothing is reset)

---

## Non-functional requirements

### NFR-CUI-1: Reuse of `apiFetch`

Both screens MUST use the existing `apiFetch` client for backend calls. No new fetch
wrapper or duplicate JWT-injection logic MUST be introduced.

### NFR-CUI-2: No server-side draft state between screens

Consistent with the stateless `/campaigns/extract` contract, the extracted payload MUST
be held only as frontend local state between `/campaigns/new` and
`/campaigns/new/review` — no server-side draft persistence.

---

## Acceptance criteria

1. `/campaigns/new` enforces a 100–8000 character client-side range (with a visible
   char counter) before calling `POST /campaigns/extract`, and never discards typed text
   on any error path. (CUI-001)
2. A successful extraction navigates to `/campaigns/new/review` with the extracted
   payload available as local state. (CUI-001.3)
3. `/campaigns/new/review` renders title, description, world state, NPCs, factions, and
   arcs from local state. (CUI-002.1)
4. Every NPC/faction/arc item shows the correct provenance badge (`✦ Scribe` for `llm`,
   `✎ Edited` for `edited`/`manual`), and editing a `llm` item flips it to `edited`.
   (CUI-002.2, CUI-002.3)
5. The DM can add and remove NPC/faction/arc items; added items are `content_source:
   "manual"` and show the `✎ Edited` badge. (CUI-002.4)
6. Confirming calls `POST /campaigns` with the current reviewed local-state payload,
   including arcs. (CUI-002.5)
7. A successful save redirects to the campaign detail route for the returned id.
   (CUI-002.6)
8. A failed save preserves all DM edits/additions/removals already made in local state.
   (CUI-002.7)
