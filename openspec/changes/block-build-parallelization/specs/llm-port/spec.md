# Spec: llm-port

**Change**: block-build-parallelization
**Capability**: `llm-port` (modified)
**Track**: A (first slice)

---

## Overview

The `LlmProvider` protocol in `services/api/app/shared/llm/port.py` currently exposes a single
method, `complete(prompt: str) -> str`, and no implementation validates structured output. This
does not match the signature already documented in `docs/05-ai-system.md` and ADR-03. This spec
brings the port (and every implementation of it) in line with the documented contract:
`complete_text` for raw text and `complete_json` for schema-validated structured output.

This is the seam every AI use case (extraction, summarization, memory suggestion, generation)
depends on. No use case wiring changes as part of this slice — only the port contract and its
implementations (`fake-llm-oracle`, `openai-compatible-provider`).

---

## Functional requirements

### LP-001: `complete_text` method

`LlmProvider` MUST expose `async def complete_text(self, prompt: str) -> str`, returning the raw
text completion for the given prompt with no parsing or validation applied.

#### Scenario: Raw text completion is returned unmodified

- GIVEN an `LlmProvider` implementation and a prompt string
- WHEN `complete_text(prompt)` is awaited
- THEN the returned value is a `str` containing the provider's raw response with no JSON parsing
  applied

---

### LP-002: `complete_json` method signature

`LlmProvider` MUST expose `async def complete_json(self, prompt: str, schema: type[T]) -> T`
where `T` is bound to `pydantic.BaseModel` (`T = TypeVar("T", bound=BaseModel)`).

#### Scenario: `complete_json` returns an instance of the requested schema

- GIVEN an `LlmProvider` implementation, a prompt, and a Pydantic schema `S`
- WHEN `complete_json(prompt, S)` is awaited
- THEN the returned value is an instance of `S` (`isinstance(result, S)` is `True`)

---

### LP-003: JSON guard — code fence stripping

`complete_json` MUST tolerate raw provider output wrapped in Markdown code fences
(```` ```json ... ``` ```` or ```` ``` ... ``` ````) before attempting to parse it as JSON. This
guard applies to any implementation that talks to a real model (the fake oracle returns
already-clean fixtures and is exempt from needing the guard, but MUST NOT break if it is
applied).

#### Scenario: Code-fenced JSON is parsed successfully

- GIVEN a raw completion string wrapped in ` ```json\n{...}\n``` `
- WHEN `complete_json(prompt, schema)` is awaited
- THEN the fences are stripped before parsing and the result validates against `schema`

#### Scenario: Unfenced JSON with surrounding prose is not silently mangled

- GIVEN a raw completion string containing JSON preceded or followed by extra prose text
- WHEN `complete_json(prompt, schema)` is awaited
- THEN the guard extracts the JSON payload if safely recoverable, and raises the typed
  validation error (LP-004) if it cannot be recovered — it MUST NOT return a
  partially-parsed or semantically altered object

---

### LP-004: Typed validation error on malformed output

When the parsed payload does not validate against the requested Pydantic `schema` (missing
required fields, wrong types, or is not valid JSON at all after guard recovery),
`complete_json` MUST raise a typed, catchable exception (not let a raw `pydantic.ValidationError`
or `json.JSONDecodeError` leak as an unqualified exception type into calling use cases). The
exception type MUST be defined in `app.shared.llm` and MUST be documented so calling code can
catch it explicitly.

#### Scenario: Invalid JSON shape raises the typed error

- GIVEN a raw completion string that is syntactically valid JSON but missing a required field
  of `schema`
- WHEN `complete_json(prompt, schema)` is awaited
- THEN a typed `LlmProvider` validation error is raised (not a bare `pydantic.ValidationError`
  or unhandled exception), and the payload is NOT returned

#### Scenario: Non-JSON output raises the typed error

- GIVEN a raw completion string that is not valid JSON even after fence stripping
- WHEN `complete_json(prompt, schema)` is awaited
- THEN a typed `LlmProvider` validation error is raised

---

### LP-005: `complete` is removed

The old single-method `complete(prompt: str) -> str` MUST be removed from the `LlmProvider`
protocol. No implementation or caller in the codebase MUST reference `.complete(` after this
change lands (verified by `ruff check` / grep, not just by test pass).

#### Scenario: No caller references the removed method

- GIVEN the full `services/api` source tree after this change
- WHEN searching for `.complete(` (excluding `.complete_text(` / `.complete_json(`)
- THEN no match is found

---

## Non-functional requirements

### NFR-LP-1: Protocol-only change, no behavior change in unrelated modules

This slice touches only `app/shared/llm/**` and its direct test suite. No route, use case, or
domain module outside `shared/llm` changes behavior as part of this spec (existing AI use cases,
if any exist, are out of scope for rewiring here — see proposal Affected Areas).

### NFR-LP-2: Strict TDD

Every requirement above MUST have a failing test written before the corresponding
implementation change, per project Strict TDD policy.

---

## Acceptance criteria

1. `LlmProvider` exposes `complete_text(prompt: str) -> str` and
   `complete_json(prompt: str, schema: type[T]) -> T`. (LP-001, LP-002)
2. `complete_json` strips Markdown code fences before parsing. (LP-003)
3. Malformed or non-conforming output raises a typed, documented exception — never a bare
   `pydantic.ValidationError`/`json.JSONDecodeError` and never a silently wrong object.
   (LP-004)
4. `complete` no longer exists on the protocol or in any implementation. (LP-005)
5. All new/changed behavior has a failing test written first (Strict TDD).
