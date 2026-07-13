# Quality Strategy

## Goal

The Lazy Lands MVP should be reliable enough to demo and defend as a real application.

The goal is not artificial coverage.

The goal is to protect the critical path:

Login → Create campaign → Register session → Accept memory → Generate next session.

## Quality principles

- Test critical flows first.
- Validate all AI outputs before showing or persisting them.
- Keep CI as a minimum quality gate.
- Protect private user data with RLS.
- Avoid logging sensitive campaign content.
- Prefer clear fallback behavior over silent failure.

## MVP quality gate

The project should pass:

- Frontend lint.
- Frontend typecheck.
- Frontend build.
- Backend Ruff.
- Backend pytest for critical logic.
- Pydantic validation tests.
- Manual or automated RLS checks.
- Smoke test for the demo path.

## Frontend testing

Recommended tools:

- Vitest.
- React Testing Library.
- Playwright for smoke tests.

Critical frontend tests:

- Registration/login form validation.
- Protected route redirect.
- New campaign text validation.
- Campaign extraction loading/error states.
- Register session form validation.
- Memory suggestions accept/reject/edit interactions.
- Generated session render.
- Copy generated session action.

### Responsive workspace verification

For any route opting into the `>=1440px` workspace tier, verify the following matrix before
release:

- 1440×900, 1536×960, and 1920×1080 for populated, loading, error, empty, success, and
  action-failure states where the route exposes them.
- English and Spanish at 1440×900, including no horizontal overflow or clipped controls.
- `prefers-reduced-motion: reduce` at 1440×900; existing motion gates must remain effective.
- Keyboard navigation keeps the existing DOM/focus order and every recovery/action control is
  reachable.
- At `<=900px`, eligible routes remain in normal document flow; auth, focused forms/review,
  legal pages, and the export preview remain bounded.

Use RTL for visible behavior, controls, and feedback. Use Playwright viewport checks and visual
review for composition and overflow; do not assert utility class names as behavior.

### Deterministic visual baselines

Campaign detail, generated-session, and Memory Review baselines use Chromium with fixed fixture
data, dates, locale, loaded fonts, intercepted mutations, and `data-motion="off"`. Capture English
and Spanish at 1440×900 and 900×900. The feature owner updates a baseline only after reviewing each
PNG diff; reviewers verify the viewport, fixture host, and motion mode. Focused RTL owns caps/order,
truthful links, deferred-note noninteractivity, and Memory Review action/failure behavior. These
snapshots deliberately avoid authenticated storage and broad end-to-end fixtures.

## Backend testing

Recommended tools:

- pytest.
- Ruff.
- mypy if it does not block delivery.

Critical backend tests:

- Auth dependency rejects missing token.
- Auth dependency rejects invalid token.
- Prompt builders include required context.
- Pydantic schemas accept valid AI outputs.
- Pydantic schemas reject invalid AI outputs.
- JSON guard handles Markdown-wrapped JSON.
- Generate session use case rejects invalid LLM output.
- Repository/use case ownership checks.

## AI testing

Minimum tests:

- `ExtractCampaignOutput` valid/invalid.
- `MemorySuggestionsOutput` valid/invalid.
- `GeneratedSessionOutput` valid/invalid.
- Prompt snapshot tests for major prompts.
- `FakeLlmProvider` with per-schema `register()` API for deterministic use-case tests.
  Routes fixtures through `parse_llm_json` so tests exercise the real validation path.
- Opt-in `@pytest.mark.dev_inference` lane for prompt validation against real providers
  (excluded from CI, auto-skips without API key).

## RLS checks

Must verify:

- Users cannot read campaigns from other users.
- Users cannot read child data from campaigns they do not own.
- Users cannot create sessions under campaigns they do not own.
- Users cannot accept memory facts under campaigns they do not own.

## Observability

Should include:

- `request_id` for backend requests.
- Structured logs for AI operations.
- Trace metadata for generation.
- Error logs for invalid LLM outputs.

Optional:

- Sentry frontend.
- Sentry backend.
- Release tags.
- Sanitized breadcrumbs.

## Definition of Done

A feature is done for the TFM MVP when:

- It works locally.
- It works in deployment.
- It has loading/error/success states when applicable.
- It validates user input.
- It validates AI output with Pydantic when applicable.
- It respects user ownership.
- It belongs to the demo path or supports an official deliverable.
- It is documented or traceable in README/docs.

## Living quality rules

The linting and guardrail rules in this project are **living** — they evolve as we detect
conventions and patterns during development and code review.

### How it works

- When a PR review catches a recurring pattern, we encode it as an automated check.
- The AI assistant can proactively suggest new rules based on observed codebase conventions.
- Rules live in `scripts/check-guardrails.mjs` and `apps/web/eslint.config.mjs`.
- The `pnpm lint:guardrails` script runs imperatively in CI, pre-commit, and `pnpm quality`.

### Current guardrails

| Guardrail | What it catches | Location |
|-----------|----------------|----------|
| `type` over `interface` | Prevents `interface` in frontend TS/TSX | ESLint rule |
| CSS planning references | Catches `OpenSpec`, `SDD`, `LAND-` in public CSS | `scripts/check-guardrails.mjs` |
| Inline landing static data | Catches large arrays/objects in landing `.tsx` | `scripts/check-guardrails.mjs` |
| Arbitrary z-index | Catches numeric Tailwind z classes in landing/layout/app | `scripts/check-guardrails.mjs` |

### Suggesting new rules

This list grows. If you see a pattern that should be automated, mention it. The AI can
implement the check, wire it into `lint:guardrails`, and update this table.

## What not to overdo

Do not block MVP delivery on:

- Full E2E coverage.
- High coverage numbers.
- Advanced tracing.
- Complete Sentry setup.
- PDF perfection.
- Complex visual polish.
