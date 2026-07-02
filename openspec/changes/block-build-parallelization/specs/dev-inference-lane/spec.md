# Spec: dev-inference-lane

**Change**: block-build-parallelization
**Capability**: `dev-inference-lane` (new)
**Track**: A (first slice)

---

## Overview

An opt-in pytest suite, marked `@pytest.mark.dev_inference`, that drives the real
`openai-compatible-provider` adapter against a live registry entry (Gemini/Groq/Cerebras/
OpenRouter free tier) to validate prompt/JSON-contract conformance for the four AI output
schemas. It is advisory — it validates that prompts actually produce parseable, schema-valid
output from a real model — and it is explicitly excluded from the default CI run.

This is not a product feature and is never wired into any request path.

---

## Functional requirements

### DI-001: Marker registration and default exclusion

The `dev_inference` marker MUST be registered in `services/api/pyproject.toml`
(`[tool.pytest.ini_options].markers`) to avoid `PytestUnknownMarkWarning`. The default CI test
command MUST run with `-m "not dev_inference"` (or an equivalent addopts configuration) so tests
marked `dev_inference` never execute in the default/CI run.

#### Scenario: Default test run skips the dev-inference suite

- GIVEN the project's default CI pytest invocation
- WHEN it is run with no API keys present in the environment
- THEN all tests marked `dev_inference` are deselected/skipped, and the run passes (no failure,
  no error, no attempted network call)

#### Scenario: Explicit opt-in runs the suite

- GIVEN at least one provider's API key is set in the environment
- WHEN pytest is invoked with `-m dev_inference` explicitly
- THEN the dev-inference tests execute and make real calls to the configured provider

---

### DI-002: Coverage of the four prompt templates

The suite MUST iterate the four prompt templates (extract campaign, summarize campaign, suggest
memory facts, generate next session) against a real model via the registry, and validate that
each response — after JSON guard processing — parses and validates against its corresponding
output schema.

#### Scenario: A real model's extraction response validates

- GIVEN the `extract_campaign` prompt rendered with representative sample input, and a
  configured registry provider with a valid key
- WHEN the response is passed through `complete_json(prompt, ExtractCampaignOutput)`
- THEN the result validates against `ExtractCampaignOutput`, or the test reports the specific
  validation failure (schema mismatch) rather than crashing opaquely

---

### DI-003: Fence-stripping conformance against real output

The suite MUST include at least one case per schema that specifically checks the response is
recoverable by the JSON guard even when the real model wraps output in Markdown code fences
(a common behavior of several free-tier models).

#### Scenario: Real fenced output is recovered

- GIVEN a real model response wrapped in ` ```json ... ``` ` fences for one of the four schemas
- WHEN `complete_json` processes it
- THEN the result validates against the target schema

---

### DI-004: Pydantic failure-path conformance

The suite MUST include at least one case that intentionally exercises a real model response that
fails schema validation (e.g. by prompting for an edge case likely to produce malformed output,
or by feeding a deliberately malformed captured response through the guard), asserting the typed
validation error from `llm-port` (LP-004) is raised rather than a raw exception or a silently
wrong object.

#### Scenario: Malformed real-world-shaped output raises the typed error

- GIVEN a response payload shaped like realistic malformed model output (missing required
  field)
- WHEN it is processed through `complete_json`
- THEN the typed `LlmProvider` validation error is raised

---

### DI-005: Context ceiling awareness

The suite MUST include at least one case documenting/asserting behavior near Block 8's
~2,000-token estimated context ceiling for the `generate_session` prompt — either by measuring
the rendered prompt's approximate token/character size against the ceiling, or by asserting the
real model still returns a schema-valid response at representative context size. This is
advisory instrumentation, not a hard gate.

#### Scenario: Generate-session prompt size is measured against the ceiling

- GIVEN a representative `generate_session` prompt rendered with realistic campaign context
  (summary, NPCs, factions, arcs, active MemoryFacts)
- WHEN the suite runs
- THEN the rendered prompt's estimated size relative to the ~2,000-token ceiling is reported
  (pass/fail is advisory, not blocking the suite)

---

### DI-006: No production wiring

Nothing in `app/main.py`, route registration, or any request-handling path MUST reference the
dev-inference suite or require it to pass. The suite lives entirely under the test tree (or
`services/api/scripts/` per the proposal's stated fallback) and has no runtime dependency from
application code.

#### Scenario: Application starts with the dev-inference suite absent

- GIVEN the `dev-inference-lane` test files are deleted
- WHEN the FastAPI application is started and `GET /health` is called
- THEN the application starts and responds normally — no import or runtime error references
  the missing suite

---

## Non-functional requirements

### NFR-DI-1: Advisory, non-blocking

A failure in the `dev_inference`-marked suite MUST NOT fail the default CI pipeline, MUST NOT
block a PR merge gate, and MUST NOT be a required check. It exists to surface prompt drift or
provider quirks for the developer to act on manually.

### NFR-DI-2: No secret required for the default run

The default CI run and default local `pytest` invocation MUST succeed with zero API keys set in
the environment (per DI-001's first scenario).

### NFR-DI-3: Strict TDD applies to the guard/schema logic exercised, not to model output

Strict TDD governs the deterministic code this suite exercises (the JSON guard, schema
validation, provider adapter) — those already have failing-test-first coverage via `llm-port`
and `openai-compatible-provider`. The dev-inference suite itself is exploratory/advisory
verification against a non-deterministic real model and does not need to follow red→green in
the same sense, but MUST still be written with clear pass/fail assertions, not silent
best-effort logging.

---

## Acceptance criteria

1. `dev_inference` marker is registered; default CI run excludes it via `-m "not dev_inference"`
   (or equivalent) and passes with zero API keys set. (DI-001)
2. All four prompt templates have at least one dev-inference case validating real-model output
   against their schema. (DI-002)
3. At least one case per schema validates fence-stripping against real fenced output. (DI-003)
4. At least one case asserts the typed validation error on malformed real-shaped output. (DI-004)
5. At least one case measures/reports the `generate_session` prompt size against the ~2,000-token
   ceiling. (DI-005)
6. No application startup path or production route depends on the dev-inference suite. (DI-006)
7. `ruff check` passes on the dev-inference suite code.
