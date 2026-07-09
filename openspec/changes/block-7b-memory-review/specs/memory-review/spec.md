# Memory Review Specification

## Purpose

Let the DM review transient Scribe memory suggestions after session logging and persist only accepted content as active MemoryFacts.

## Requirements

### Requirement: MemoryFact API contracts

The system MUST expose `POST /campaigns/{campaign_id}/memory-facts`, `GET /campaigns/{campaign_id}/memory-facts?status=active`, and `PATCH /memory-facts/{id}`. Writes MUST use Pydantic validation, app-layer campaign ownership checks, per-user Supabase/RLS, and the existing `memory_facts` table. No new DDL is allowed.

#### Scenario: Owner accepts a suggestion
- GIVEN campaign `c1` and session `s1` belong to user A
- WHEN user A posts `{source_session_id:s1, content, type, importance}`
- THEN the response is 201 with `status="active"`

#### Scenario: Non-owner cannot write
- GIVEN campaign `c1` belongs to user A
- WHEN user B posts a memory fact under `c1`
- THEN the write MUST NOT apply and the response is 404

#### Scenario: Retire archives, not deletes
- GIVEN memory fact `m1` is active and owned by user A
- WHEN user A patches `{status:"archived"}`
- THEN `m1` is archived and active reads exclude it

### Requirement: Transient suggestion handoff

The system MUST carry `memory_suggestions` from session-save success to `/campaigns/[id]/memory/review` with campaign/session-scoped client storage. Raw suggestions MUST NOT auto-persist and dismissed suggestions MUST NOT call the API.

#### Scenario: Session save opens review
- GIVEN `POST /campaigns/c1/sessions` returns suggestions
- WHEN the form succeeds
- THEN the app stores a scoped validated draft and navigates to `/campaigns/c1/memory/review`

#### Scenario: Direct visit has safe empty state
- GIVEN no valid scoped draft exists
- WHEN `/campaigns/c1/memory/review` loads
- THEN pending suggestions are empty and no suggestion is persisted

### Requirement: Memory Review UI

The review route MUST follow `MemoryReview` handoff: app shell, campaign nav, breadcrumb, medium page, headrow, 16px stacked hard-bordered cards, dashed empty card, separator, footer actions, EN/ES localized copy, no hard-coded UI literals, and no UI em dashes.

Each suggestion card MUST show Scribe/source origin, type, importance, content, reason, related/touches, and actions: Accept as memory, Edit & accept, Dismiss. Edit MUST show a textarea seeded with content, type marker, editing state, Save & accept, and Cancel; only edited content persists.

#### Scenario: Accept and edit
- GIVEN pending suggestion `p1`
- WHEN the DM accepts or saves edited text
- THEN a MemoryFact is created, `p1` is removed, and accepted feedback renders

#### Scenario: Dismiss
- GIVEN pending suggestion `p1`
- WHEN the DM dismisses it
- THEN no API request is sent and strike/slide feedback removes the card

### Requirement: Active memories section

The route MUST load active memories and show count, help text equivalent to “These feed every future session draft”, rows with type, edited marker when applicable, content, accepted/source metadata, related text, and Retire.

#### Scenario: Active memories states
- GIVEN active memories are loading, empty, erroring, or loaded
- WHEN the route renders
- THEN it shows LoadingScribe, retryable notice, “No memories yet”, or rows respectively

### Requirement: Handoff states and motion

The UI MUST support loading, backend error with retry, empty pending, empty active, accepted/retired success feedback, disabled busy controls, `.ll-stamp`, `.ll-strike`/slide-out, button press physics, route/section entrance where available, and reduced-motion/`data-motion` compliance.

#### Scenario: Busy controls
- GIVEN an accept, edit-save, dismiss, or retire action is in flight
- WHEN controls are displayed
- THEN affected controls are disabled until request/animation completion
