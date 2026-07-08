# Campaign Summarization Specification

## Purpose

Keep a campaign's rolling `accumulated_summary` current as sessions are logged (ADR-01),
without requiring the DM to re-read every past session. Runs synchronously as part of
session registration, after the session row is persisted.

## Requirements

### Requirement: Summarize campaign after a session is registered

The system MUST run a `SummarizeCampaignUseCase` immediately after a session insert
succeeds, using as input the previous `accumulated_summary` plus all sessions with
`session_number` greater than `summarized_up_to_session` (self-healing: this recovers any
session whose summary step previously failed or was skipped, not just the newest one).

The use case's LLM output MUST be validated against a `CampaignSummaryOutput` Pydantic
model (`accumulated_summary: str`, 1–6000 chars) before it is stored. The system MUST set
`summarized_up_to_session` to the newest included `session_number`
app-side — this value MUST NOT be taken from the LLM output.

On success, `accumulated_summary` and `summarized_up_to_session` MUST be updated on the
campaign record (dict-at-repository-boundary; the frozen `Campaign` domain entity MUST NOT
be extended with these fields).

#### Scenario: First session establishes the summary

- GIVEN campaign `c1` has `accumulated_summary = ""` and `summarized_up_to_session = 0`
- WHEN session 1 is registered with a valid `summary`
- THEN `accumulated_summary` is updated to reflect session 1 and `summarized_up_to_session = 1`

#### Scenario: Later session folds into existing summary

- GIVEN campaign `c1` has an existing `accumulated_summary` and `summarized_up_to_session = 2`
- WHEN session 3 is registered
- THEN the summarization input includes the prior `accumulated_summary` plus session 3 only,
  and `summarized_up_to_session` becomes 3

#### Scenario: A previously skipped session is healed

- GIVEN `summarized_up_to_session = 1` but sessions 2 and 3 already exist unsummarized
  (a prior summarization attempt failed)
- WHEN session 4 is registered
- THEN the summarization input includes sessions 2, 3, and 4, and
  `summarized_up_to_session` becomes 4

### Requirement: LLM output validation and failure handling

Every summarization LLM call MUST have its output parsed and validated with
`CampaignSummaryOutput` before being stored (ADR-09); raw, unvalidated LLM output MUST
NEVER be persisted or returned to the client.

If the summarization step fails (LLM error or output that fails validation) AFTER the
session row was already persisted, the session registration response MUST still succeed
for the persisted session; the campaign's `accumulated_summary` simply remains
unchanged (to be healed by the next session's summarization run, per the Requirement
above). The session MUST NOT be rolled back or deleted due to a summarization failure.

#### Scenario: Invalid LLM output does not lose the session

- GIVEN a valid session is persisted
- WHEN the summarization LLM call returns output that fails `CampaignSummaryOutput`
  validation
- THEN the session remains persisted and retrievable, `accumulated_summary` is left
  unchanged, and no raw LLM output is stored or returned

#### Scenario: LLM call fails outright

- GIVEN a valid session is persisted
- WHEN the summarization LLM call raises a provider/network error
- THEN the session remains persisted, `accumulated_summary` is left unchanged, and the
  overall registration request does not surface a 5xx solely due to this failure
