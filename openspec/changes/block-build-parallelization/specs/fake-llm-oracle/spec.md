# Spec: fake-llm-oracle

**Change**: block-build-parallelization
**Capability**: `fake-llm-oracle` (modified)
**Track**: A (first slice)

---

## Overview

`FakeLlmProvider` (`services/api/app/shared/llm/fake.py`) currently returns a single static
string (`'{"fake": true}'`) regardless of prompt or requested schema. This is not a useful
deterministic oracle for the four AI output schemas (`ExtractCampaignOutput`,
`CampaignSummaryOutput`, `MemorySuggestionsOutput`, `GeneratedSessionOutput`) that Block 5–8 use
cases will validate against.

This spec replaces the static fake with a **per-schema fixture provider**: given a requested
schema in `complete_json`, it returns a deterministic, schema-shaped fixture instance, parsed and
validated through the real Pydantic model — so use-case tests exercise the actual validation
path, not a bypass. `FakeLlmProvider` remains the deterministic unit/CI oracle; it makes no
network calls and its output never varies between runs.

> **Dependency note**: the four output schemas (`ExtractCampaignOutput`, `CampaignSummaryOutput`,
> `MemorySuggestionsOutput`, `GeneratedSessionOutput`) are documented in `docs/03-domain-model.md`
> and `docs/05-ai-system.md` but do not yet exist as Pydantic classes in `services/api/app`. This
> spec requires their creation as a prerequisite — scoped to field definitions matching the
> documented shape, with no additional business logic. They belong in `app/shared/llm/schemas.py`
> (or an equivalent shared module reachable by both the fake and future use cases) rather than a
> feature module, since they are shared AI I/O contracts, not domain entities.

---

## Functional requirements

### FO-001: `FakeLlmProvider` implements the enriched `LlmProvider` port

`FakeLlmProvider` MUST implement `complete_text` and `complete_json` per the `llm-port` spec. It
MUST NOT make any network call under any circumstance.

#### Scenario: `complete_text` returns a deterministic string

- GIVEN a `FakeLlmProvider` instance
- WHEN `complete_text(prompt)` is awaited twice with the same prompt
- THEN both calls return the identical string, and no network call is made

---

### FO-002: Per-schema deterministic fixtures

`complete_json(prompt, schema)` MUST return a fixture instance of `schema`, selected by the
requested schema type, for each of the four output schemas:

- `ExtractCampaignOutput`
- `CampaignSummaryOutput`
- `MemorySuggestionsOutput`
- `GeneratedSessionOutput`

Each fixture MUST satisfy every required field and rule documented for that schema in
`docs/05-ai-system.md` (e.g. `MemorySuggestionsOutput` fixture contains between 0 and 5
suggestions, each with a non-empty reason; `GeneratedSessionOutput` fixture progresses at least
one open arc field).

#### Scenario: Requesting `ExtractCampaignOutput` returns a valid fixture

- GIVEN a `FakeLlmProvider` instance
- WHEN `complete_json(prompt, ExtractCampaignOutput)` is awaited
- THEN the result is an `ExtractCampaignOutput` instance with title, description, initial world
  state, and at least one NPC or faction populated

#### Scenario: Requesting `CampaignSummaryOutput` returns a valid fixture

- GIVEN a `FakeLlmProvider` instance
- WHEN `complete_json(prompt, CampaignSummaryOutput)` is awaited
- THEN the result is a `CampaignSummaryOutput` instance with a non-empty updated accumulated
  summary and a summarized-up-to-session number

#### Scenario: Requesting `MemorySuggestionsOutput` returns a valid fixture

- GIVEN a `FakeLlmProvider` instance
- WHEN `complete_json(prompt, MemorySuggestionsOutput)` is awaited
- THEN the result is a `MemorySuggestionsOutput` instance with 0 to 5 suggestions, each carrying
  a reason string

#### Scenario: Requesting `GeneratedSessionOutput` returns a valid fixture

- GIVEN a `FakeLlmProvider` instance
- WHEN `complete_json(prompt, GeneratedSessionOutput)` is awaited
- THEN the result is a `GeneratedSessionOutput` instance with title, synopsis, main objective,
  and encounters populated

---

### FO-003: Fixtures are parsed and validated through real Pydantic models

The fake MUST NOT construct schema instances by bypassing validation (e.g.
`Model.model_construct()`) for its fixture path. It MUST build the fixture as a JSON/dict payload
and pass it through the schema's normal Pydantic validation (`Model.model_validate(...)` or
equivalent), the same code path a real provider's output would take.

#### Scenario: A deliberately malformed fixture would fail validation

- GIVEN the fixture-building code path for any of the four schemas
- WHEN the underlying fixture payload is missing a required field (simulated in a test)
- THEN Pydantic validation raises — proving the fake's fixtures pass through the same
  validation real provider output would, and are not exempt from it

---

### FO-004: Unrecognized schema request

`complete_json(prompt, schema)` MUST raise a clear, typed error (not return a wrong type or
`None`) when called with a schema outside the four supported output schemas, so tests fail loudly
rather than silently passing with an unrelated fixture.

#### Scenario: Unsupported schema raises rather than returning a mismatched fixture

- GIVEN a `FakeLlmProvider` instance and a Pydantic schema not among the four supported output
  schemas
- WHEN `complete_json(prompt, schema)` is awaited
- THEN a clear error is raised identifying the unsupported schema, and no fixture is returned

---

## Non-functional requirements

### NFR-FO-1: No network access, no timing variance

`FakeLlmProvider` MUST NOT perform any I/O. It remains safe to run in CI with no network access
and no environment variables set.

### NFR-FO-2: Backward-compatible for existing callers

Any existing test or use case currently depending on the old static `'{"fake": true}'` behavior
MUST be updated as part of this slice — this spec does not add a compatibility shim for the old
shape.

---

## Acceptance criteria

1. `FakeLlmProvider` implements `complete_text` and `complete_json` per `llm-port`. (FO-001)
2. `complete_json` returns a schema-appropriate fixture for each of the four output schemas.
   (FO-002)
3. Fixtures are constructed and validated through the real Pydantic schema, not bypassed.
   (FO-003)
4. Requesting an unsupported schema raises a clear, typed error. (FO-004)
5. The four output schemas exist as Pydantic `BaseModel` classes matching the documented shape
   in `docs/03-domain-model.md` / `docs/05-ai-system.md`, in a shared module reachable by
   `app/shared/llm`.
6. No network access occurs when using `FakeLlmProvider` in any test.
