# Spec: campaign-extraction

**Change**: block-5-campaign-creation
**Capability**: `campaign-extraction` (new)

---

## Overview

`POST /campaigns/extract` lets an authenticated DM submit a free-text campaign premise and
receive a structured, editable scaffold proposed by the Scribe (title, description,
world state, NPCs, factions, arcs). The endpoint is **stateless**: it persists nothing. It
reuses the existing LLM seam (`complete_json` + `parse_llm_json` + `FakeLlmProvider`) so
the only Pydantic-validated path for LLM JSON output is exercised, per AGENTS.md's hard
rule that all LLM output must be validated before reaching the DM.

**Arcs are in scope for this capability.** `ExtractCampaignOutput` MUST include an
`arcs` field, matching `docs/06-api-contracts.md` and `PRODUCT.md`'s `/campaigns/new/review`
description.

---

## Functional requirements

### CE-001: `ExtractCampaignOutput` schema (including arcs)

A Pydantic model `ExtractCampaignOutput` MUST define the shape of extracted campaign
data with the following fields:

| Field | Type | Constraints |
|-------|------|-------------|
| `title` | `str` | non-empty |
| `description` | `str` | non-empty |
| `world_state` | `str` | non-empty |
| `npcs` | `list[NpcExtract]` | MAY be empty |
| `factions` | `list[FactionExtract]` | MAY be empty |
| `arcs` | `list[ArcExtract]` | MAY be empty |

`NpcExtract` MUST contain `name`, `description`, `current_state`, `motivation` (all
`str`). `FactionExtract` MUST contain `name`, `description`, `current_stance`, `goals`
(all `str`). `ArcExtract` MUST contain `title` (`str`), `description` (`str`), and
`priority` (one of `"high" | "medium" | "low"`, defaulting to `"medium"`, per the
Postgres `priority` enum). `ArcExtract` MUST NOT include a `status` field — arc status is
assigned on persistence (see `campaign-persistence` spec), not proposed by the LLM.

Every extracted NPC, faction, and arc item, once serialized in the HTTP response, MUST
carry a `content_source` value of `"llm"` (per `docs/03-domain-model.md`'s
`ContentSource` value object), signaling to the frontend that this item was proposed by
the Scribe and not yet touched by the DM. This `content_source` is an API/UI-level
provenance marker that is also persisted for every entity type this endpoint's output
feeds into, including arcs (see `campaign-persistence` spec for the arcs `content_source`
migration).

---

### CE-002: `POST /campaigns/extract` requires authentication

The endpoint MUST depend on `get_current_user`. Requests without a valid Supabase JWT
MUST be rejected before any LLM call is made.

#### Scenario: Unauthenticated request is rejected

- GIVEN no `Authorization` header (or an invalid/expired token)
- WHEN `POST /campaigns/extract` is called with any body
- THEN the response is HTTP 401 and no LLM call occurs

---

### CE-003: Request validation — premise length bounds

The request body MUST be `{ "raw_text": str }` with `raw_text` constrained to between 100
and 8000 characters inclusive (Pydantic `Field(min_length=100, max_length=8000)`). This
is the backend trust boundary; the frontend mirrors the same bounds (with a visible
character counter) for UX but MUST NOT be relied upon as the sole enforcement point. The
8000-character cap is a product/UX and cost/latency/extraction-quality decision — it is
well below the context-window limits of the configured LLM providers and is not intended
to model a token-budget constraint.

#### Scenario: Premise below 100 characters is rejected

- GIVEN an authenticated DM
- WHEN `POST /campaigns/extract` is called with `raw_text` shorter than 100 characters
- THEN the response is HTTP 422, no LLM call occurs, and no data is persisted

#### Scenario: Premise above 8000 characters is rejected

- GIVEN an authenticated DM
- WHEN `POST /campaigns/extract` is called with `raw_text` longer than 8000 characters
- THEN the response is HTTP 422, no LLM call occurs, and no data is persisted

#### Scenario: Premise within the 100–8000 character range is accepted for processing

- GIVEN an authenticated DM
- WHEN `POST /campaigns/extract` is called with `raw_text` between 100 and 8000
  characters (inclusive)
- THEN the request passes validation and proceeds to the extraction use case

---

### CE-004: Extraction use case — prompt render + LLM call

The extraction use case MUST render the versioned prompt template
`prompts/extract_campaign_v1.jinja` with the DM's `raw_text`, then call
`llm_provider.complete_json(prompt, ExtractCampaignOutput)` through the existing LLM
seam. It MUST NOT implement any bespoke JSON parsing or ad hoc validation outside
`parse_llm_json`.

#### Scenario: Happy path — valid premise produces a structured proposal

- GIVEN an authenticated DM and a `raw_text` premise between 100 and 8000 characters
  describing a campaign setting
- WHEN `POST /campaigns/extract` is called
- THEN the response is HTTP 200 with a body matching `ExtractCampaignOutput` (title,
  description, world_state, npcs, factions, arcs), and each npc/faction/arc entry
  carries `content_source: "llm"`

---

### CE-005: LLM output validation failure — no persistence, no raw leak

If the LLM's JSON output fails `parse_llm_json` validation against `ExtractCampaignOutput`
(malformed JSON, missing required fields, or wrong types), the endpoint MUST map the
resulting `LlmOutputValidationError` to a clear, retryable HTTP error. Nothing MUST be
persisted (the endpoint is already stateless, so this is automatically satisfied) and the
raw LLM output or full prompt text MUST NOT be included in the HTTP response body or in
any client-facing error, per `docs/05-ai-system.md` trace-metadata rules.

#### Scenario: Malformed LLM output surfaces as a retryable error

- GIVEN an authenticated DM and a valid `raw_text` premise
- WHEN the LLM provider returns JSON that does not satisfy `ExtractCampaignOutput`
  (e.g. missing `title`)
- THEN the response is a retryable HTTP error (4xx/5xx, not 200), the response body does
  NOT include the raw LLM output or the rendered prompt text, and no campaign/npc/
  faction/arc row is created anywhere

#### Scenario: Non-JSON LLM output surfaces as a retryable error

- GIVEN an authenticated DM and a valid `raw_text` premise
- WHEN the LLM provider returns a non-JSON string that `parse_llm_json` cannot parse
- THEN the response is a retryable HTTP error and no raw output is leaked to the client

---

### CE-006: Statelessness

`POST /campaigns/extract` MUST NOT write to `campaigns`, `npcs`, `factions`, or `arcs`
tables (or any other table) under any response path — success, validation failure, or
LLM failure.

#### Scenario: A successful extraction persists nothing

- GIVEN an authenticated DM and a valid premise
- WHEN `POST /campaigns/extract` returns HTTP 200
- THEN no row exists in `campaigns`, `npcs`, `factions`, or `arcs` attributable to this
  request

---

## Non-functional requirements

### NFR-CE-1: Reuse of the existing LLM seam

The use case MUST call `complete_json` and rely on `parse_llm_json` for validation. It
MUST NOT introduce a parallel JSON-parsing or schema-validation code path.

### NFR-CE-2: Test isolation via `FakeLlmProvider`

Use-case tests MUST register `ExtractCampaignOutput` fixtures via
`FakeLlmProvider.register(...)` and MUST NOT require network access or a live LLM
provider.

---

## Acceptance criteria

1. `ExtractCampaignOutput` (and its nested NPC/faction/arc models) exist as Pydantic
   models with the fields in CE-001, including `arcs`. (CE-001)
2. `POST /campaigns/extract` depends on `get_current_user`; unauthenticated requests are
   rejected with HTTP 401 before any LLM call. (CE-002)
3. `raw_text` is validated with `Field(min_length=100, max_length=8000)`; requests below
   100 or above 8000 characters are rejected with HTTP 422 and trigger no LLM call.
   (CE-003)
4. The extraction use case renders `prompts/extract_campaign_v1.jinja` and calls
   `complete_json(prompt, ExtractCampaignOutput)`. (CE-004)
5. A valid premise returns HTTP 200 with an `ExtractCampaignOutput`-shaped body where
   every npc/faction/arc item carries `content_source: "llm"`. (CE-004)
6. LLM output that fails schema validation results in a retryable error response that
   never includes raw LLM output or full prompt text, and persists nothing. (CE-005)
7. No response path for this endpoint writes to any database table. (CE-006)
