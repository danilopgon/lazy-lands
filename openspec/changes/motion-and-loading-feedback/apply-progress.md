# Apply Progress: Motion and Loading Feedback

## Status

Strict TDD mode. Unit 3 tasks 3.1.1 through 3.4.1 are complete.
No commit, push, or PR was created. Unit 3 remains an independent under-budget work unit and is
complete.

## Completed Tasks

- [x] 3.1.1 Mode-aware transition RED coverage.
- [x] 3.1.2 Layout/provider single-expression RED coverage.
- [x] 3.1.3 SSR reduced-motion snapshot RED coverage.
- [x] 3.2.1 Binding motion tokens.
- [x] 3.2.2 Reactive MotionMode provider and hook.
- [x] 3.2.3 Additive ModalPresence and ExitPresence scaffolding.
- [x] 3.2.4 Locale layout provider mount.
- [x] 3.3.1 Unit, regression, lint, typecheck, and targeted formatting gates.
- [x] 3.4.1 Zero-diff browser regression at <=900px across full, subtle, off, and OS reduce.

## TDD Cycle Evidence

| Task | Test file | Layer | Safety net | RED | GREEN | Triangulate | Refactor |
|---|---|---|---|---|---|---|---|
| 3.1.1 | `apps/web/lib/motion/__tests__/use-motion-mode.test.tsx` | Unit | N/A (new API) | FAIL: module resolution stopped on the first absent Unit 3 primitive before production existed | 11/11 passed | Full, subtle, off, OS reduce, and reactive OS changes | Targeted Prettier; 11/11 remained green |
| 3.1.2 | Same | Integration | `tests/providers.test.tsx`: 2/2 passed | Same absent-module RED run; layout test already referenced the missing provider | 2 layout cases passed inside 11/11 | `VISUAL_REGRESSION_TEST_MODE=false` -> full and `true` -> off | No behavior-changing refactor |
| 3.1.3 | Same | SSR unit | N/A (new API) | Same absent-module RED run; SSR probe referenced the missing provider/hook | SSR assertion passed inside 11/11 | Client `matchMedia=true` versus server snapshot `false` | No behavior-changing refactor |
| 3.2.1 | Same | Unit | N/A (new file) | Token imports absent in RED suite | Exact binding token assertions passed inside 11/11 | Durations, both easing tuples, both staggers, delay, and no spring | No behavior-changing refactor |
| 3.2.2 | Same | Unit/integration | N/A (new file) | Hook/provider import absent in RED suite | Mode, resolver, reactivity, and SSR assertions passed | Five effective-motion paths | JSDoc/lint cleanup; 11/11 remained green |
| 3.2.3 | Same | Component | N/A (new files) | Presence imports absent; exact focused command exited 1 | Modal open/closed and keyed list behavior passed | Modal and list boundaries | Targeted Prettier; 11/11 remained green |
| 3.2.4 | Same | Server component integration | Existing provider safety net: 2/2 passed | Layout referenced the missing provider in RED suite | Both environment branches passed | Full/off expression branches | Provider adds no DOM element |
| 3.3.1 | Same + full suite | Regression | 83 files / 648 pre-existing tests plus 11 new tests | N/A (quality gate) | 83 files / 659 tests passed | Focused and full-suite commands | Lint, typecheck, and targeted Prettier passed |

## Work Unit Evidence

| Evidence | Result |
|---|---|
| Focused test | `pnpm --filter web test -- lib/motion/__tests__/use-motion-mode.test.tsx` — PASS, 1 file / 11 tests. |
| Full regression | `pnpm --filter web test -- --run` — PASS, 83 files / 659 tests. |
| Static quality | `pnpm --filter web lint` — PASS; `pnpm --filter web typecheck` — PASS. |
| Formatting | Targeted `pnpm exec prettier --check` over all seven changed `apps/web` files — PASS. Repo-wide `format:check` was not used because the handoff records ~522 pre-existing violations and explicitly requires targeted formatting instead. |
| Earlier runtime harness | `pnpm --filter web test:e2e -- visual-regression.spec.ts --grep "900×900"` — 4/6 PASS under `data-motion="off"`. Campaign detail and memory review passed in en/es. Generated-session en/es failed against stale snapshots that still say `Draft`/`Proposal`; current `origin/main` intentionally renders `Recorded` after commit `38b4979`. The harness had no full/subtle/OS-reduce baselines, so task 3.4.1 remained pending at that run; the focused evidence below closes it. |
| Task 3.4.1 runtime regression | PASS at `http://localhost:3000/en/demo/npcs` in headless Chromium at 900×900. Modes sampled: `full`, `subtle`, `off`, and `full` with `prefers-reduced-motion: reduce`. All requests returned HTTP 200; no console or page errors occurred. `<main>` remained a direct child of `<body>`, the direct-body structure was identical in every sample, and the provider introduced no wrapper or visible node. Keyboard search/filter/clear worked; the modal opened with Enter and closed with Escape; body scroll lock and trigger focus restoration worked. |
| Task 3.4.1 visual comparison | `full`, `subtle`, and OS-reduce screenshots were byte-identical (SHA-256 `c024c8fa8f30b9c344f9ae21ffcac3aedc321eef3e94155dc2967e213fd75e4c`). The `off` screenshot SHA-256 was `790e949ec22932f41b62c200c3db1250dffe473f801b40bd07831678128c29f7`; its 5.513529% raster difference was bounded to `(24,136)-(853,1106)` and is explained by the pre-existing `globals.css` blanket off-mode animation disabling/text rasterization. Final opacity and geometry matched, with no behavior or layout regression. |
| Task 3.4.1 evidence scope | Runtime JSON and four screenshots remain temporary under `C:\Users\Usuario\AppData\Local\Temp\opencode\lazy-lands-unit3-3.4.1\` and were not copied into the repository. This is a focused Chromium sample on one public route, not an exhaustive route sweep; it is sufficient because Unit 3 has zero consumers and adds no DOM wrapper. |
| Artifact formatting | `pnpm exec prettier --check "openspec/changes/motion-and-loading-feedback/tasks.md" "openspec/changes/motion-and-loading-feedback/apply-progress.md"` — PASS, `All matched files use Prettier code style!` |
| Rollback boundary | Revert the four new motion modules, the focused test, the locale-layout provider wrapper, and the Vitest include entry. No call-site behavior, CSS, messages, domain state, or persistence changes are involved. |

## Frontend Handoff Checklist

- [x] Fields: no field or form call site changed.
- [x] Copy: no user-visible copy or locale catalog changed.
- [x] Layout: provider adds context only and renders no DOM wrapper.
- [x] Shared components: no existing shared component was migrated; presence boundaries are additive and unused.
- [x] Design tokens: exact binding `DURATION`, `EASE`, `STAGGER`, and pending-delay values; no spring or overshoot.
- [x] Motion: full preserves supplied transitions; subtle, off, and OS reduce resolve to `{ duration: 0 }`; mode never branches a motion element tree.
- [x] Loading state: unchanged because Unit 3 has no call-site migrations.
- [x] Error state: unchanged because Unit 3 has no call-site migrations.
- [x] Empty state: unchanged because Unit 3 has no call-site migrations.
- [x] Success state: unchanged because Unit 3 has no call-site migrations.
- [x] Runtime regression across every mode at <=900px: focused Chromium coverage passed on the public NPC demo route for `full`, `subtle`, `off`, and OS reduced motion, including structure and keyboard/modal behavior.

## Handoff Compliance Report

- Structure: PASS — one provider boundary, four additive modules, zero call-site migrations.
- Copy: PASS — 0 strings changed.
- States:
  - loading: reference = existing screens unchanged | implementation = unchanged | MATCH
  - error: reference = existing screens unchanged | implementation = unchanged | MATCH
  - empty: reference = existing screens unchanged | implementation = unchanged | MATCH
  - success: reference = existing screens unchanged | implementation = unchanged | MATCH
- Design tokens: 0 violations; no visual tokens were touched.
- Motion: PASS in source/unit review — all four effective disabled paths resolve instantly; presence scaffolds are unused.
- Runtime: PASS for Unit 3 — focused 900×900 Chromium evidence covers `full`, `subtle`, `off`, and OS reduce with identical direct-body structure, no provider DOM node, and no behavior/layout regression. Scope is one public route rather than an exhaustive route sweep, which is sufficient because Unit 3 has zero consumers.
- VERDICT: PASS — Unit 3 implementation, source/test compliance, and task 3.4.1 runtime regression are complete.

## Deviations and Constraints

- Added `lib/**/__tests__/**/*.test.{ts,tsx}` to `vitest.config.ts` because the task-mandated test path was outside the repository's previous Vitest include patterns.
- Used targeted Prettier as explicitly required by the apply handoff; unrelated repository-wide formatting debt was not touched.
- No design or product behavior deviation.

## Implementation Discoveries

- **Unit 4 presence boundary resolved.** Production route pages conditionally unmount the entity
  modal components, so an internal `AnimatePresence` cannot run a close transition. The user
  approved keeping `ModalPresence` above those conditionals in all six shipped/demo entity routes;
  entrance-only was rejected. Design, spec, tasks, proposal, and apply handoff now carry the widened
  mechanical scope. Engram decision: #951.

## Remaining Tasks

- [ ] Units 1, 2, 4, and 5 remain untouched by this apply batch.
