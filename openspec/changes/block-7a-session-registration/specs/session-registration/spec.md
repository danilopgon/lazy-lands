# Session Registration Specification

## Purpose

Let a DM persist what happened in a played session and read the chronological session
history for a campaign. Server-assigned sequential numbering, ownership enforcement, and
persistence-first ordering relative to downstream LLM steps (summarization, memory
suggestion — specified separately).

## Requirements

### Requirement: Register a session

The system MUST expose `POST /campaigns/{campaign_id}/sessions` accepting
`{ summary: string (required), consequences: string (optional) }`. Unknown fields (including
a client-supplied `session_number`) MUST be ignored — stripped by the request model rather
than rejected with 422 — and there is no client-side concatenation of additional free-text
fields into `summary`/`consequences`.

The system MUST assign `session_number` server-side as `MAX(session_number) + 1` scoped to
`campaign_id` (1 if no prior sessions exist). A client-supplied `session_number` MUST be
ignored; the server-computed value always wins.

The system MUST persist the session row BEFORE running summarization or suggestion
(persistence-first). If the insert itself fails, the request MUST fail and no session is
created. If a downstream LLM step fails after the insert succeeds, the session row MUST
remain persisted (see `campaign-summarization` and `memory-suggestions` for degrade
behavior).

On success the endpoint MUST return `{ session_id, session_number, memory_suggestions }`
(`memory_suggestions` per `memory-suggestions` capability, 0–5 items, empty on downstream
degrade).

#### Scenario: First session for a campaign

- GIVEN campaign `c1` has no sessions
- WHEN the owner calls `POST /campaigns/c1/sessions` with `{ "summary": "The party arrived at the ruins." }`
- THEN the response is 201 with `session_number = 1` and a `session_id`

#### Scenario: Sequential numbering

- GIVEN campaign `c1` already has a session with `session_number = 1`
- WHEN the owner registers another session
- THEN the new session's `session_number = 2`

#### Scenario: Summary is required

- GIVEN the owner submits `POST /campaigns/c1/sessions` with an empty or missing `summary`
- WHEN the request is validated
- THEN the response is 422 and no session row is created

#### Scenario: `session_number` is never client-supplied

- GIVEN the owner submits a payload containing `session_number: 99`
- WHEN the request is processed
- THEN the field is ignored and the server-computed sequential value is used instead

#### Scenario: Downstream LLM failure does not lose the session

- GIVEN a valid `summary` is submitted and the session insert succeeds
- WHEN the summarization or suggestion step raises an unrecoverable error
- THEN the response still reflects the persisted `session_id`/`session_number` (per the
  endpoint's degrade contract in `campaign-summarization`/`memory-suggestions`) and the
  session row is retrievable via `GET /campaigns/{campaign_id}/sessions` afterward

### Requirement: Read session history

The system MUST expose `GET /campaigns/{campaign_id}/sessions` returning all sessions for
the campaign ordered chronologically (ascending `session_number`), scoped to the
requesting user's ownership.

#### Scenario: Chronological history

- GIVEN campaign `c1` has sessions numbered 1, 2, 3
- WHEN the owner calls `GET /campaigns/c1/sessions`
- THEN the response is 200 with the 3 sessions ordered `1, 2, 3`

#### Scenario: No sessions yet

- GIVEN campaign `c1` has 0 sessions
- WHEN the owner calls `GET /campaigns/c1/sessions`
- THEN the response is 200 with an empty array

### Requirement: Ownership enforced on every session operation

The system MUST apply the app-layer ownership pre-check (`get_campaign`, copied from the
campaigns module) before any session read or write. A forged or foreign `campaign_id`
MUST return 404, never 403 or 500. Unauthenticated requests MUST return 401. RLS on
`sessions` (already defined in the initial schema migration) is verified, not built, by
this change.

#### Scenario: Foreign campaign id

- GIVEN campaign `c1` belongs to user A
- WHEN user B calls `POST /campaigns/c1/sessions` or `GET /campaigns/c1/sessions`
- THEN the response is 404

#### Scenario: Unauthenticated request

- GIVEN no valid Supabase JWT is provided
- WHEN either sessions endpoint is called
- THEN the response is 401

#### Scenario: RLS blocks cross-user reads at the data layer

- GIVEN campaign `c1` belongs to user A
- WHEN user B's per-user Supabase client queries `c1`'s sessions directly
- THEN RLS returns zero rows, independent of the API layer's own ownership check
