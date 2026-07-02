# Apply Progress: block-build-parallelization (Track A)

**Status**: ✅ COMPLETE — all 33 tasks across 6 phases
**Mode**: Strict TDD
**Date**: 2026-07-02

---

## Phase 1: JSON Guard + Validation Error — ✅ Complete

- [x] 1.1 RED: `tests/test_json_guard.py` — 7 scenarios pass (001a–g)
- [x] 1.2 RED: `tests/test_llm_errors.py` — 5 scenarios pass (002a–e)
- [x] 1.3 GREEN: Created `app/shared/llm/json_guard.py` — `parse_llm_json()`
- [x] 1.4 GREEN: Created `app/shared/llm/errors.py` — `LlmOutputValidationError(Exception)`
- [x] 1.5 Verified: 12/12 tests pass, lint clean

## Phase 2: Enriched Port — ✅ Complete

- [x] 2.1 RED: Extended `test_fake_llm.py` — 003a–c scenarios
- [x] 2.2 GREEN: Modified `port.py` — Protocol with `complete_text` + `complete_json`
- [x] 2.3 GREEN: Updated `fake.py` — renamed, added stubs
- [x] 2.4 GREEN: Updated existing test to `complete_text()`
- [x] 2.5 Verified: 5/5 port tests pass, 80 total suite, lint clean

## Phase 3: Per-Schema Fixture Fake — ✅ Complete

- [x] 3.1 RED: Expanded `test_fake_llm.py` — 004a–g scenarios
- [x] 3.2 RED: Determinism tests — 100 invocations + no-network-imports (006a–b)
- [x] 3.3 GREEN: Implemented `register(schema, payload)` in `fake.py`
- [x] 3.4 GREEN: Implemented `complete_json` routing through `parse_llm_json`
- [x] 3.5 Verified: 14/14 fake tests pass, 89 total suite, lint clean

## Phase 4: OpenAI-Compatible Adapter + Registry — ✅ Complete

- [x] 4.1 RED: Created `tests/test_openai_compatible.py` — 6 httpx-mocked scenarios
- [x] 4.2 RED: Created `tests/test_registry.py` — 6 registry scenarios
- [x] 4.3 GREEN: Created `app/shared/llm/providers/openai_compatible.py`
- [x] 4.4 GREEN: Created `app/shared/llm/providers/registry.py` — 2 providers + `build_provider()`
- [x] 4.5 Verified: 12/12 adapter+registry tests pass, 101 total suite, lint clean, no secrets

## Phase 5: Dev-Inference Lane — ✅ Complete

- [x] 5.1 RED: Created `tests/dev_inference/test_dev_inference.py` — skip-on-missing-key
- [x] 5.2 GREEN: Registered `dev_inference` marker in `pyproject.toml`
- [x] 5.3 GREEN: Modified `.github/workflows/ci.yml` — `-m "not dev_inference"`
- [x] 5.4 Verified: 101 selected / 1 deselected on `not dev_inference`; dev test correctly SKIPPED

## Phase 6: Cleanup & Gates — ✅ Complete

- [x] 6.1 Updated `.env.example` — 4 provider key names documented
- [x] 6.2 Full Suite Gate: 101 passed, 1 deselected (`-m "not dev_inference"`)
- [x] 6.3 Lint Gate: `ruff check app/ tests/` — zero errors
- [x] 6.4 Secret check: zero real-looking keys in `app/shared/llm/` or `tests/`

---

## TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|------------|-----|-------|-------------|----------|
| 1.1 | `tests/test_json_guard.py` | Unit | N/A (new) | ✅ Written | ✅ 7/7 | ✅ 7 cases | ➖ None needed |
| 1.2 | `tests/test_llm_errors.py` | Unit | N/A (new) | ✅ Written | ✅ 5/5 | ✅ 5 cases | ➖ None needed |
| 1.3 | `app/shared/llm/json_guard.py` | Unit | N/A (new) | — | ✅ Built | — | ✅ Clean |
| 1.4 | `app/shared/llm/errors.py` | Unit | N/A (new) | — | ✅ Built | — | ✅ Clean |
| 2.1 | `tests/test_fake_llm.py` | Unit | ✅ 76/76 | ✅ Written | ✅ 5/5 | ✅ 3 cases | ➖ None needed |
| 2.2 | `app/shared/llm/port.py` | Unit | ✅ 76/76 | — | ✅ Built | — | ✅ Clean |
| 2.3 | `app/shared/llm/providers/fake.py` | Unit | ✅ 76/76 | — | ✅ Built | — | ➖ None needed |
| 3.1 | `tests/test_fake_llm.py` (ext) | Unit | ✅ 80/80 | ✅ Written | ✅ 9/9 | ✅ 7 cases | ✅ Clean |
| 3.2 | `tests/test_fake_llm.py` (det) | Unit | ✅ 80/80 | ✅ Written | ✅ 2/2 | ✅ 100-loop | ✅ Clean |
| 3.3 | `app/shared/llm/providers/fake.py` (reg) | Unit | ✅ 80/80 | — | ✅ Built | — | ✅ Clean |
| 4.1 | `tests/test_openai_compatible.py` | Unit | N/A (new) | ✅ Written | ✅ 6/6 | ✅ 6 cases | ➖ None needed |
| 4.2 | `tests/test_registry.py` | Unit | N/A (new) | ✅ Written | ✅ 6/6 | ✅ 6 cases | ➖ None needed |
| 4.3 | `app/shared/llm/providers/openai_compatible.py` | Unit | N/A (new) | — | ✅ Built | — | ✅ Clean |
| 4.4 | `app/shared/llm/providers/registry.py` | Unit | N/A (new) | — | ✅ Built | — | ✅ Clean |
| 5.1 | `tests/dev_inference/test_dev_inference.py` | Dev | N/A (new) | ✅ Written | ✅ 1/1 (SKIP) | — | — |
| 5.2 | `pyproject.toml` | Config | N/A (mod) | — | ✅ Done | — | — |
| 5.3 | `.github/workflows/ci.yml` | Config | N/A (mod) | — | ✅ Done | — | — |
| 6.1 | `.env.example` | Config | N/A (mod) | — | ✅ Done | — | — |

### Test Summary
- **Total tests written**: 37 new tests
- **Total tests passing**: 101 (1 dev-inference deselected)
- **Layers used**: Unit (36), Dev/Integration (1)
- **Approval tests** (refactoring): None — no refactoring tasks
- **Pure functions created**: `parse_llm_json`, `_strip_fences_and_prose`

---

## Files Created/Modified

| File | Action | Phase |
|------|--------|-------|
| `services/api/app/shared/llm/json_guard.py` | Created | P1 |
| `services/api/app/shared/llm/errors.py` | Created | P1 |
| `services/api/app/shared/llm/port.py` | Modified | P2 |
| `services/api/app/shared/llm/providers/fake.py` | Modified | P2+P3 |
| `services/api/app/shared/llm/providers/openai_compatible.py` | Created | P4 |
| `services/api/app/shared/llm/providers/registry.py` | Created | P4 |
| `services/api/tests/test_json_guard.py` | Created | P1 |
| `services/api/tests/test_llm_errors.py` | Created | P1 |
| `services/api/tests/test_fake_llm.py` | Modified | P2+P3 |
| `services/api/tests/test_openai_compatible.py` | Created | P4 |
| `services/api/tests/test_registry.py` | Created | P4 |
| `services/api/tests/dev_inference/__init__.py` | Created | P5 |
| `services/api/tests/dev_inference/test_dev_inference.py` | Created | P5 |
| `services/api/pyproject.toml` | Modified | P5 |
| `.github/workflows/ci.yml` | Modified | P5 |
| `.env.example` | Modified | P6 |

**No `modules/*` files touched** — ADR-05 boundary preserved.

---

## Deviations from Design

None — implementation matches design.md and spec.md exactly.

## Issues Found

- `test_004g_no_modules_import` initially failed using `inspect.getsource()` because the word "modules" appeared in a docstring comment. Fixed by switching to `ast.parse()` which checks only actual import statements.
- Existing CI workflow already existed at `.github/workflows/ci.yml` — modified the backend test step instead of creating a new file (task 5.3 says "Create" but design says "Modify or create").

## Remaining Tasks

None — all 33 tasks complete. Ready for `sdd-verify`.
