# Tasks: Block Build Parallelization — Track A

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~650–750 |
| 800-line budget risk | Medium |
| Chained PRs recommended | No |
| Delivery strategy | single-pr-default |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: N/A
400-line budget risk: Medium
Implementation status: ✅ COMPLETE — all 33 tasks done

## Phase 1: JSON Guard + Validation Error (LLM-SEAM-001, -002) — Commit 1

- [x] 1.1 RED: `tests/test_json_guard.py` — 7 scenarios (001a–g: valid, fenced, prose-wrapped, invalid→error, type/schema mismatch)
- [x] 1.2 RED: `tests/test_llm_errors.py` — 5 scenarios (002a–e: constructor, repr, pydantic/json causes, default retryable)
- [x] 1.3 GREEN: Create `app/shared/llm/json_guard.py` — `parse_llm_json(raw, schema) -> T` (strip fences+prose, json.loads, model_validate; catch→LlmOutputValidationError)
- [x] 1.4 GREEN: Create `app/shared/llm/errors.py` — `LlmOutputValidationError(Exception)` with schema_name, raw_output, retryable=True; set __cause__
- [x] 1.5 Verify: `uv run pytest tests/test_json_guard.py tests/test_llm_errors.py` + `uv run ruff check`
- [x] 1.6 Commit: `feat(llm): add parse_llm_json guard and LlmOutputValidationError`

## Phase 2: Enriched Port (LLM-SEAM-003) — Commit 2

- [x] 2.1 RED: Extend `tests/test_fake_llm.py` — assert complete_text/complete_json exist, old complete() absent (003a–c)
- [x] 2.2 GREEN: Modify `port.py` — `complete(prompt)` → `complete_text(prompt) -> str` + `complete_json(prompt, schema: type[T]) -> T` (TypeVar bound=BaseModel)
- [x] 2.3 GREEN: Update `fake.py` — rename complete→complete_text, add complete_json stub, remove old complete
- [x] 2.4 GREEN: Update existing test — `provider.complete()` → `provider.complete_text()` assert isinstance str
- [x] 2.5 Verify: `uv run pytest` + `uv run ruff check`
- [x] 2.6 Commit: `feat(llm): enrich LlmProvider port with complete_text and complete_json`

## Phase 3: Per-Schema Fixture Fake (LLM-SEAM-004, -006) — Commit 3

- [x] 3.1 RED: Expand `tests/test_fake_llm.py` — 004a–g: complete_text echo, register+complete_json, invalid fixture→error, fenced fixture, unregistered→error, old complete absent, no modules import
- [x] 3.2 RED: Determinism — 100 identical invocations same result; no httpx/socket/random imports (006a–b)
- [x] 3.3 GREEN: Implement `register(schema, payload)` → dict[type, dict]; `complete_text` returns prompt-echo string
- [x] 3.4 GREEN: Implement `complete_json` — lookup→dump JSON→route through parse_llm_json; raise on unregistered
- [x] 3.5 Verify: `uv run pytest tests/test_fake_llm.py` + `uv run ruff check`
- [x] 3.6 Commit: `feat(llm): add per-schema fixture fake with register() API`

## Phase 4: OpenAI-Compatible Adapter + Registry (LLM-SEAM-005, -008, -009) — Commit 4

- [x] 4.1 RED: `tests/test_openai_compatible.py` — 6 mocked-httpx scenarios (005a–f): text completion, JSON+fences→guard, invalid JSON→error, schema mismatch, injected client, no openai import
- [x] 4.2 RED: `tests/test_registry.py` — 6 scenarios (008a–f): 4 entries×3 fields, build_provider constructs, missing key→error, URLs end /v1 or /openai/, no modules import
- [x] 4.3 GREEN: Create `app/shared/llm/providers/openai_compatible.py` — `OpenAiCompatibleProvider(base_url, api_key, model, http_client=None)`; POST /chat/completions; complete_json→parse_llm_json
- [x] 4.4 GREEN: Create `app/shared/llm/providers/registry.py` — PROVIDERS dict (gemini/groq) + `build_provider()`; fail-loud on missing key
- [x] 4.5 Verify: `uv run pytest tests/test_openai_compatible.py tests/test_registry.py` + ruff + grep for secrets
- [x] 4.6 Commit: `feat(llm): add OpenAI-compatible provider adapter and registry`

## Phase 5: Dev-Inference Lane (LLM-SEAM-010) — Commit 5

- [x] 5.1 RED: `tests/dev_inference/test_dev_inference.py` — @pytest.mark.dev_inference: build provider from env, minimal prompt roundtrip, skip-on-missing-key (010d)
- [x] 5.2 GREEN: Register `dev_inference` marker in `pyproject.toml` [tool.pytest.ini_options]
- [x] 5.3 GREEN: Modify `.github/workflows/ci.yml` — backend test step: `uv run pytest -m "not dev_inference"`
- [x] 5.4 Verify: `uv run pytest -m "not dev_inference"` excludes dev tests; `uv run pytest -m dev_inference` runs them
- [x] 5.5 Commit: `feat(llm): add opt-in dev-inference lane with CI exclusion`

## Phase 6: Cleanup & Gates — Commit 6

- [x] 6.1 Update `.env.example` — add GEMINI_API_KEY, GROQ_API_KEY, CEREBRAS_API_KEY, OPENROUTER_API_KEY (names only; LLM-SEAM-009)
- [x] 6.2 Full Suite Gate: `uv run pytest -m "not dev_inference"` — all tests pass
- [x] 6.3 Lint Gate: `uv run ruff check app/ tests/` — zero errors
- [x] 6.4 Commit: `chore: update .env.example and final verification gates`

## Dependency Map

```
Phase 1 ──► Phase 2 ──┬──► Phase 3 ──► Phase 5 ──► Phase 6
                       └──► Phase 4 ──┘
After Phase 2: Phase 3 (fake) and Phase 4 (adapter) are parallelizable — both implement LlmProvider independently using Phase 1's guard.
```
