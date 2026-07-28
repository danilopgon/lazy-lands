# Apply Progress: Motion and Loading Feedback

## Status

Strict TDD mode. Unit 1 tasks 1.1.1 through 1.4.1 and Unit 3 tasks 3.1.1 through 3.4.1 are complete.
Unit 1's real-browser matrix passed at 900×900 across full, subtle, off, and OS reduced-motion
modes. Units 1 and 3 are committed locally as `8a62d05` and `82f5fef` and pushed to
`origin/feat/session-save-pending-guard`; no PR was created.

Unit 2 tasks 2.1.1 through 2.3.1 are complete. Tasks 2.4.1 and 2.4.2 are **deferred, not done**:
both require a running browser, and this session holds no authorization to start or manage a
development server. They are the only open Unit 2 items.

## Completed Tasks

- [x] 1.1.1 Deferred section-save pending, success, and error coverage.
- [x] 1.1.2 Deferred whole-session pending, success, and error coverage.
- [x] 1.1.3 Pre-paint duplicate invocation and post-settlement retry coverage.
- [x] 1.2.1 `saveSection` and `saveAll` TanStack Query mutations.
- [x] 1.2.2 Explicit synchronous in-flight guard refs plus `isPending` early returns.
- [x] 1.2.3 Disabled, localized, layout-reserved in-flight button labels.
- [x] 1.2.4 English and Spanish generated-session saving labels.
- [x] 1.3.1 Focused/full tests, lint, typecheck, and targeted formatting gates.
- [x] 1.4.1 Pending-state, duplicate-invocation, CLS, and retry browser matrix at 900×900.
- [x] 3.1.1 Mode-aware transition RED coverage.
- [x] 3.1.2 Layout/provider single-expression RED coverage.
- [x] 3.1.3 SSR reduced-motion snapshot RED coverage.
- [x] 3.2.1 Binding motion tokens.
- [x] 3.2.2 Reactive MotionMode provider and hook.
- [x] 3.2.3 Additive ModalPresence and ExitPresence scaffolding.
- [x] 3.2.4 Locale layout provider mount.
- [x] 3.3.1 Unit, regression, lint, typecheck, and targeted formatting gates.
- [x] 3.4.1 Zero-diff browser regression at <=900px across full, subtle, off, and OS reduce.
- [x] 2.1.1 Real-`<Link>` topology, grace-delay, clearing, and reserved-footprint RED coverage.
- [x] 2.1.2 Hash and external bare-anchor RED coverage.
- [x] 2.1.3 Identical affordance across all three `data-motion` modes.
- [x] 2.2.1 `NavLink` plus its internal `LinkPending` reader.
- [x] 2.2.2 Mechanical in-app `Link` to `NavLink` migration across 32 files.
- [x] 2.2.3 English and Spanish `Nav.pending` copy.
- [x] 2.3.1 Focused/full tests, lint, typecheck, and targeted formatting gates.
- [x] 4.1.1 Zero-duration exit coverage under `subtle` and `off`.
- [x] 4.1.2 Existing modal a11y suite retained unchanged as a regression guard.
- [x] 4.1.3 Presence-above-the-conditional exit integration coverage.
- [x] 4.2.1 Motion-driven backdrop and panel via `useMotionMode().transition()`.
- [x] 4.2.2 `ModalPresence` mounted above both modal conditionals in six entity routes.
- [x] 4.3.1 Focused/full tests, lint, typecheck, and targeted formatting gates.
- [x] 5.1.1 Timer-authoritative accept and dismiss removal coverage in all three modes.
- [x] 5.1.2 Per-card `isSubmitting` isolation coverage.
- [x] 5.1.3 `InlineScribeBusy` and stamp rendering coverage.
- [x] 5.1.4 Spike resolved: the timer path alone is asserted; no Motion callback is relied on.
- [x] 5.2.1 `SuggestionCard` phase mechanics moved to Motion `animate` plus `layout="position"`.
- [x] 5.2.2 `ExitPresence` above the keyed list; page timers remain the sole removal authority.
- [x] 5.2.3 Confirmed: no new copy, no locale-catalog edit.
- [x] 5.3.1 Focused/full tests, lint, typecheck, and targeted formatting gates.

## TDD Cycle Evidence

| Task | Test file | Layer | Safety net | RED | GREEN | Triangulate | Refactor |
|---|---|---|---|---|---|---|---|
| 1.1.1 | `apps/web/tests/sessions/generated-session-view.test.tsx` | Component integration | 33/33 passed | 6 failures / 34 passes after deferred pending and duplicate-submit tests were added before production changes | 38/38 final focused tests passed | Section success, error, retry, and Spanish pending copy | Shared deferred helper; reserved-label grid retained 38/38 |
| 1.1.2 | Same | Component integration | 33/33 passed | Same RED run: both whole-session pending-label assertions and duplicate invocation failed | 38/38 final focused tests passed | Whole-session success, error, retry, and Spanish pending copy | Success/error callbacks moved into mutation lifecycle |
| 1.1.3 | Same | Component integration | 33/33 passed | Pre-paint double dispatch issued 2 PATCH calls for both save paths | 38/38 final focused tests passed; each pending window issued exactly 1 call | Both save scopes plus post-error retry | Synchronous refs close the render-before-paint race; `onSettled` releases guards |
| 1.2.1–1.2.4 | Same | Component integration | Covered above | Covered by the Unit 1 RED tests | Focused 38/38 and full 83 files / 664 tests passed | English/Spanish, section/all, success/error | Targeted Prettier and semantics-only test assertions |
| 3.1.1 | `apps/web/lib/motion/__tests__/use-motion-mode.test.tsx` | Unit | N/A (new API) | FAIL: module resolution stopped on the first absent Unit 3 primitive before production existed | 11/11 passed | Full, subtle, off, OS reduce, and reactive OS changes | Targeted Prettier; 11/11 remained green |
| 3.1.2 | Same | Integration | `tests/providers.test.tsx`: 2/2 passed | Same absent-module RED run; layout test already referenced the missing provider | 2 layout cases passed inside 11/11 | `VISUAL_REGRESSION_TEST_MODE=false` -> full and `true` -> off | No behavior-changing refactor |
| 3.1.3 | Same | SSR unit | N/A (new API) | Same absent-module RED run; SSR probe referenced the missing provider/hook | SSR assertion passed inside 11/11 | Client `matchMedia=true` versus server snapshot `false` | No behavior-changing refactor |
| 3.2.1 | Same | Unit | N/A (new file) | Token imports absent in RED suite | Exact binding token assertions passed inside 11/11 | Durations, both easing tuples, both staggers, delay, and no spring | No behavior-changing refactor |
| 3.2.2 | Same | Unit/integration | N/A (new file) | Hook/provider import absent in RED suite | Mode, resolver, reactivity, and SSR assertions passed | Five effective-motion paths | JSDoc/lint cleanup; 11/11 remained green |
| 3.2.3 | Same | Component | N/A (new files) | Presence imports absent; exact focused command exited 1 | Modal open/closed and keyed list behavior passed | Modal and list boundaries | Targeted Prettier; 11/11 remained green |
| 3.2.4 | Same | Server component integration | Existing provider safety net: 2/2 passed | Layout referenced the missing provider in RED suite | Both environment branches passed | Full/off expression branches | Provider adds no DOM element |
| 3.3.1 | Same + full suite | Regression | 83 files / 648 pre-existing tests plus 11 new tests | N/A (quality gate) | 83 files / 659 tests passed | Focused and full-suite commands | Lint, typecheck, and targeted Prettier passed |
| 2.1.1–2.1.3 | `apps/web/tests/navigation/nav-link.test.tsx` | Component integration | 84 files / 664 tests passed | FAIL: `Failed to resolve import "@/components/navigation/nav-link"`, 0 tests executed | 13/13 focused tests passed | Idle, sub-delay, post-delay, settle, hash, external, and all three modes | Grace flag replaced an effect-body `setState`; 13/13 remained green |
| 2.2.1–2.2.3 | Same + full suite | Component integration | Covered above | Covered by the Unit 2 RED run | Focused 13/13 and full 84 files / 677 tests passed | Three-call-site blast-radius run before the remaining 29 files | Targeted Prettier over 5 files; semantics-only assertions |

## Work Unit Evidence

| Evidence | Result |
|---|---|
| Unit 1 focused test | Baseline: `pnpm --filter web test -- tests/sessions/generated-session-view.test.tsx` — PASS, 1 file / 33 tests. RED: same command — FAIL, 6 failed / 34 passed. GREEN/refactor: same command — PASS, 1 file / 38 tests. |
| Unit 1 full regression | `pnpm --filter web test` — PASS, 83 files / 664 tests. |
| Unit 1 static quality | `pnpm lint` — PASS; `pnpm typecheck` — PASS. |
| Unit 1 formatting | Targeted `pnpm exec prettier --check` over the four changed frontend files — PASS. Repo-wide `format:check` was intentionally not used because the handoff records ~522 unrelated pre-existing violations and mandates targeted formatting. |
| Unit 1 runtime harness | PASS at `http://localhost:3000/en/demo/sessions/generated` in Chromium at 900×900. Modes sampled: `full`, `subtle`, `off`, and `full` with OS `prefers-reduced-motion: reduce`. Both pending labels were visible and disabled in every mode; rapid double-click produced exactly one invocation for section-save and save-all in every mode. No console, page, request, or navigation errors occurred. The verifier did not start, stop, restart, or otherwise manage the user-owned dev server. |
| Unit 1 layout stability | Standard CLS was exactly `0` in every case, with width/height delta exactly `0`. Save-all geometry was idle `(248.203, 271.016, 157.656, 44)` and pending `(249.703, 272.516, 157.656, 44)`; section geometry was idle `(24, 518.266, 157.938, 36)` and pending `(25.5, 519.766, 157.938, 36)`. The `+1.5px` x/y offset is existing press/disabled physics, not layout shift. Full and OS-reduce produced no layout-shift entries; subtle/off input-associated shifts were approximately `0.000039` and `0.000037`, both with `hadRecentInput=true`, and therefore contributed `0` CLS. |
| Unit 1 failure/retry runtime | A temporary failure override proved the section draft `Browser failure draft retained.` and save-all draft `Browser save-all failure draft retained.` survived rejection. Retry controls re-enabled; successful retries closed editors and preserved the existing success toasts. |
| Unit 1 runtime scope | The public demo uses the production component with a 450ms in-memory save instead of authenticated persistence. Automated tests separately prove exactly one `updateSessionFn` call. Runtime evidence remains temporary at `C:\Users\Usuario\AppData\Local\Temp\opencode\lazy-lands-unit1-1.4.1\results.json` and was not copied into the repository. |
| Unit 1 rollback boundary | Revert `generated-session-view.tsx`, its focused test additions, and the two locale keys. No API, schema, query key, domain, cache, or persistence contract changed. |
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
| Unit 2 focused test | Baseline: the file did not exist. RED: `pnpm exec vitest run tests/navigation/nav-link.test.tsx` — FAIL, unresolved production import, 0 tests executed. GREEN/refactor: same command — PASS, 1 file / 13 tests. |
| Unit 2 full regression | `pnpm exec vitest run` — PASS, 84 files / 677 tests (664 before this unit). Two harness files needed updating because `NavLink` introduces a client-context dependency every in-app link now carries: `tests/legal.test.tsx` renders through `@/tests/intl` (the pages sit under `NextIntlClientProvider` in production, see `app/[locale]/layout.tsx:138`), and `tests/i18n-switcher.test.tsx`'s `next/link` mock now exports `useLinkStatus`. No production assertion was weakened. |
| Unit 2 static quality | `pnpm --filter web lint` — PASS; `pnpm --filter web typecheck` — PASS. Lint initially rejected a synchronous `setState` inside `LinkPending`'s effect (`react-hooks/set-state-in-effect`); the reader now derives visibility as `pending && hasGraceElapsed` and only rearms the flag in cleanup. |
| Unit 2 formatting | Targeted `pnpm exec prettier --check` over every changed non-OpenSpec file — PASS after formatting five migrated files. Repo-wide `format:check` remains excluded for pre-existing debt. |
| Unit 2 browser acceptance | NOT PERFORMED. Tasks 2.4.1 and 2.4.2 need a running dev server, which this session was not authorized to start. No JSDOM result was substituted for them. |
| Unit 2 review | Four 4R lenses were run against the working tree (high tier: >400 changed lines). `review-reliability` and `review-readability` independently found the same CRITICAL defect: `LinkPending`'s visible branch hardcoded the default slot class instead of the `slotClassName` prop, so the nine block-level call sites would have snapped back to an inline slot the moment a navigation went pending — the exact reflow the prop exists to prevent. The two tests covering that prop passed vacuously (the footprint test only compared the default slot; the override test never set `pending`). Fixed test-first: the rewritten `keeps a repositioned status slot in place through the pending state` failed with `expected 'ml-1 inline-block…' to be 'absolute right-5 top-4'`, then passed after `nav-link.tsx:102` was corrected. `review-risk` and `review-resilience` returned no findings. `review-readability` also raised one SUGGESTION about undocumented migration exclusions, addressed with a WHY comment at each of the three excluded files. |
| Unit 2 review tooling | The bounded `gentle-ai review start/finalize/validate` facade recorded for Units 1 and 3 does not exist in the installed CLI (1.49.0 exposes `review-start --policy-file` / `review-step --operation` instead, with undocumented payload schemas). No lineage was created for Unit 2, because probing those schemas against a live lineage is what terminally escalated a previous one. The 4R lenses were run directly instead; this is a deviation from the receipt-bound lifecycle and no pre-commit receipt validation was performed. |
| Unit 4 focused test | RED: `pnpm exec vitest run tests/ui/modal-presence.test.tsx` — FAIL, the dialog unmounted immediately under `full` because nothing animated its exit. GREEN: 35/35 across `tests/ui`, including the 16 untouched a11y assertions. |
| Unit 4 full regression | `pnpm exec vitest run` — PASS, 85 files / 684 tests. |
| Unit 4 static quality | `pnpm --filter web lint` — PASS; `pnpm --filter web typecheck` — PASS; targeted Prettier — PASS. |
| Unit 4 exit-boundary discovery | Mounting the presence boundary above the conditional surfaced a real defect that only exists once a closing modal outlives its condition: for the length of the exit, two `role="dialog"` nodes coexist. The exiting one still held a window-level keydown listener (double Escape, competing focus trap), and its unmount cleanup would later unlock body scroll and pull focus away from the modal that had just opened. Two pre-existing route tests caught it as `Found multiple elements with the role "dialog"`. `Modal` now reads `useIsPresent()`: while exiting it drops `role`/`aria-modal`, sets `aria-hidden`, detaches the keydown listener, and releases focus plus the scroll lock at exit start instead of at unmount. Open-state behavior is unchanged. |
| Unit 4 review | One `review-reliability` lens (medium tier, ~280 changed lines). It returned three WARNINGs, all judged correct and all fixed: (1) the `subtle`/`off` exit test asserted only role absence, which the new `isPresent` guard satisfies at exit start regardless of mode — it now probes panel text, the same way the full-motion test does; (2) the pending initial-focus timer was not cleared when `release()` ran early, so it could pull focus back into the exiting panel — `release()` now clears it; (3) `isReleasedRef` was never reset and the scroll-lock effect ran once per instance, so a modal reopened mid-exit came back live with the page unlocked. (3) was confirmed by a new failing test (`expected '' to be 'hidden'`) before the acquire/release effect was made symmetric. |
| Unit 4 test harness | `tests/intl.tsx` now also wraps renders in `MotionModeProvider mode="full"`, mirroring `app/[locale]/layout.tsx:138-141`. Nine test files render a `Modal` through that helper and would otherwise hit `useMotionMode`'s deliberate outside-provider throw. `tests/ui/modal.test.tsx` uses a local provider wrapper for the same reason; every assertion in its a11y suite is byte-identical. |
| Unit 4 browser acceptance | NOT PERFORMED. Task 4.4.1 needs a running dev server, which this session was not authorized to start. |
| Unit 4 rollback boundary | Revert `components/ui/modal.tsx`, the six route wrappers, `tests/ui/modal-presence.test.tsx`, and the two test-harness provider additions. `globals.css` still carries the migrated classes, so the revert path stays intact (follow-up F.1). |
| Unit 5 focused test | Safety net first: 8 characterization tests over the real review screen passed against the pre-migration component. RED: `exposes the transient phase as state, not styling` failed in all three modes (no `data-fx` attribute). GREEN: `pnpm exec vitest run tests/sessions/memory-review-choreography.test.tsx` — PASS, 13 tests. |
| Unit 5 full regression | `pnpm exec vitest run` — PASS, 85 files / 697 tests. `tests/demo/demo-tour.test.tsx > drives the exact steps passed via props when replayed` fails intermittently under full-suite load; it was reproduced at `b320d2b` with Unit 5 stashed, so it is pre-existing and unrelated. |
| Unit 5 static quality | `pnpm --filter web lint` — PASS; `pnpm --filter web typecheck` — PASS; targeted Prettier — PASS. |
| Unit 5 review | One `review-reliability` lens (medium tier). It returned one CRITICAL, judged correct and fixed: with animation disabled (`subtle`, `off`, or OS reduce at `full`), the phase target drove the card to `opacity: 0` on the next frame, so a dismissed proposal blinked out instead of showing its danger strike for the teardown window. The lens anchored it to the guarantee the migration had orphaned — `globals.css:485-489` forced `opacity: 1 !important; transform: none !important` on `.ll-discarding`/`.ll-accepting`/`.ll-stamp` under OS reduced motion — and correctly noted that the existing removal tests could not distinguish the two behaviors, since they only assert DOM presence. `fxTarget()` now holds the resting state whenever `animationsEnabled` is false. The new perceivability test was mutation-checked: forcing the old behavior makes it fail with `expected +0 not to be +0`. The lens also confirmed `ExitPresence` cannot gate teardown, because `SuggestionCard` sets no `exit` prop. |
| Unit 5 browser acceptance | NOT PERFORMED. Task 5.4.1 needs a running dev server, which this session was not authorized to start. |
| Unit 5 rollback boundary | Revert `memory-review-parts.tsx`, the two page wrappers, the `globals.css` easing, and the new test. `.ll-accepting`/`.ll-discarding` remain declared in `globals.css` (follow-up F.1 owns their retirement), so the revert path is intact. |
| Unit 2 rollback boundary | Revert `components/navigation/`, `tests/navigation/`, the 32 migrated call-site files, the two locale keys, and the two test-harness adjustments. No route, `href`, API, schema, query key, or persistence contract changed. |

## Frontend Handoff Checklist

- [x] Unit 1 fields: no generated-section field, textarea, validation, provenance, or persisted payload shape changed.
- [x] Unit 1 copy: existing action/success/error strings remain exact; only `savingSection` and `savingChanges` were added in English and Spanish.
- [x] Unit 1 layout: existing header/editor structure remains; overlapping grid labels reserve the larger idle/pending footprint without hard-coded width.
- [x] Unit 1 interactions: per-section save and whole-session save semantics remain distinct; each has disabled UI plus a synchronous programmatic duplicate guard.
- [x] Unit 1 shared components: existing `Button`, `Notice`, `Textarea`, `OriginBadge`, `MarkdownBody`, and `LoadingScribe` vocabulary is preserved; no new primitive or dependency.
- [x] Unit 1 design tokens: no color, radius, border, shadow, or typography token changed.
- [x] Unit 1 motion: pending feedback is DOM text plus `disabled`; it is not Motion-driven and remains present when animation is disabled.
- [x] Unit 1 loading state: each triggering button is disabled and localized while its own mutation is pending.
- [x] Unit 1 error state: localized existing `Notice` remains; typed draft remains and controls re-enable for retry.
- [x] Unit 1 empty state: unchanged; no empty-state behavior belongs to these save paths.
- [x] Unit 1 success state: editor closes where applicable, persisted sections update, and existing section/all toast feedback remains.
- [x] Unit 1 runtime at <=900px across full/subtle/off/OS reduce: both pending labels remained visible and disabled, duplicate invocation was blocked for both save scopes, standard CLS was exactly 0, and failure/retry retained draft text and existing success feedback.
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
- [x] Unit 2 fields: no form field, `href`, route, or component semantic changed; the migration is a wrapper swap.
- [x] Unit 2 copy: existing link labels unchanged; only `Nav.pending` was added, in both catalogs.
- [x] Unit 2 layout: the status slot renders with one class string in both states, so revealing the quill never shifts the link; block-level anchors place it absolutely instead of inline.
- [x] Unit 2 shared components: reuses the existing `.ll-quill` glyph and `sr-only`; no new primitive or dependency.
- [x] Unit 2 design tokens: no visual token changed; the grace period is `NAV_PENDING_DELAY_MS` from Unit 3's token module.
- [x] Unit 2 motion: the affordance imports no Motion runtime, so it stays perceivable under `subtle`, `off`, and OS reduce by construction.
- [x] Unit 2 loading state: `role="status"` with a localized screen-reader label appears only after the 150ms grace period, and only while that link's own navigation is pending.
- [x] Unit 2 idle state: no `status` node exists at all, so existing `getByRole('link')` and `getByRole('status')` queries across 677 tests are unaffected.
- [x] Unit 2 error/empty/success states: unchanged; navigation feedback owns none of them.
- [ ] Unit 2 runtime at <=900px across full/subtle/off/OS reduce: NOT VERIFIED — no dev-server authorization this session.

## Handoff Compliance Report

- Unit 1 structure: PASS in source/test review — existing screen hierarchy and both save scopes preserved.
- Unit 1 copy: PASS — 2/2 new strings localized in both catalogs; existing copy unchanged.
- Unit 1 states:
  - loading: reference = inline disabled+relabel, no takeover | implementation = per-mutation disabled+localized relabel | MATCH
  - error: reference = localized `Notice`, typed draft retained, retry enabled | implementation = same | MATCH
  - empty: reference = no save-specific empty state | implementation = unchanged | MATCH
  - success: reference = editor closes/sections update/existing toast | implementation = same | MATCH
- Unit 1 design tokens: 0 violations; existing `Button` styling only.
- Unit 1 motion: 1/1 requirement implemented — essential feedback is static DOM state, independent of Motion/CSS animation.
- Unit 1 runtime: PASS — the 900×900 Chromium matrix covered full, subtle, off, and OS reduced motion; both save scopes preserved pending feedback, one-invocation guards, zero CLS, failure drafts, and successful retries without browser/runtime errors.
- Unit 1 VERDICT: PASS — implementation, automated behavior, localization, source compliance, and task 1.4.1 browser acceptance are complete.
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
- **Unit 2 test path.** Task 2.1.1 names `apps/web/components/navigation/__tests__/nav-link.test.tsx`,
  which `vitest.config.ts` does not collect. The suite's real convention is `tests/**` (the modal
  a11y guard task 4.1.2 must keep green lives at `apps/web/tests/ui/modal.test.tsx`), so the file
  landed at `apps/web/tests/navigation/nav-link.test.tsx`. Widening the include pattern was rejected:
  `vitest.config.ts` is in no unit's file-change table, and a test written at an uncollected path
  would have produced a RED that never ran.
- **Unit 2 pending-affordance placement.** `NavLink` gained an optional `pendingSlotClassName`. The
  inline default reserves width on a text line, but a block-level anchor (`campaign-card.tsx`, the
  four `campaign-detail-view.tsx` stat cells, the four `demo/page.tsx` stat cells) would grow a new
  row when the quill appears — a real layout shift. Those nine call sites place the slot absolutely
  instead. Both states still share one class string, so the no-CLS property holds either way.
- **Unit 2 deliberate migration exclusions.** `components/i18n/language-switcher.tsx` keeps raw
  `next/link`: it builds fully localized hrefs itself and intercepts the click to persist the locale,
  so routing it through the locale-aware `Link` would break the switch. The `#product`/`#how`/
  `#early-access` anchors in `footer.tsx` and the `navLinks` anchors in `public-top.tsx` also keep
  raw `next/link` — they are same-page hash targets, which produce no router transition and
  therefore no pending state. Every `@/i18n/navigation` `Link` call site was migrated.
- **Unit 5 dismiss strike.** `design.md` specifies the danger strike "draws left-to-right with
  `scaleX: 0 -> 1` over 140ms". Not implemented: the strike is `text-decoration-line` on a
  blockquote that wraps to several lines, and a single scaled element cannot strike multi-line text
  correctly. `.ll-strike` stays as-is and remains legible in every mode. The overlapping card exit
  the design pairs it with is implemented.
- **Unit 5 stamp stays CSS.** `.ll-stamp`'s geometry is mode-scoped — centred via
  `translate(-50%, -50%)` under `full`, static top-right under `subtle`/`off` — and OS reduced
  motion at `full` must keep the centred placement (`design.md`'s precedence row rejects clamping
  precisely to avoid that geometry swap). Motion writes `transform` inline, so animating the stamp
  would clobber the centring. Only its easing moved, from an overshooting curve to the approved
  `EASE.out`; `tests/motion/timings.test.ts` parses durations, so it stays green.
- **Unit 5 demo widening.** Task 5.2.2 names only the real review page, but `SuggestionCard` is
  shared: once it stops applying `.ll-accepting`/`.ll-discarding`, `app/[locale]/demo/memory/page.tsx`
  loses its teardown choreography without the same `ExitPresence` boundary. It mirrors the same
  timer orchestration, so it was included — the same shape as Unit 4's approved demo widening.
- No design or product behavior deviation.

## Implementation Discoveries

- **Unit 4 presence boundary resolved.** Production route pages conditionally unmount the entity
  modal components, so an internal `AnimatePresence` cannot run a close transition. The user
  approved keeping `ModalPresence` above those conditionals in all six shipped/demo entity routes;
  entrance-only was rejected. Design, spec, tasks, proposal, and apply handoff now carry the widened
  mechanical scope. Engram decision: #951.

## Remaining Tasks

- [ ] 2.4.1 Playwright throttled-navigation sample — needs a dev server; not authorized this session.
- [ ] 2.4.2 Manual <=900px three-mode check of the pending affordance — same blocker.
- [ ] 4.4.1 Manual <=900px three-mode modal open/close check — same blocker.
- [ ] 5.4.1 Manual <=900px accept/dismiss quality check across the three modes — same blocker.
- [ ] F.1 Retire the migrated `globals.css` classes, one PR after this one.
