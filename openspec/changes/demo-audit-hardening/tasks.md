# Tasks: Demo Audit & Hardening

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~900-1100 (mostly #16 additive translated prose ~500-600) |
| 400-line budget risk | High |
| Chained PRs recommended | No (user decision) |
| Suggested split | Single PR onto `claude/lazy-lands-public-demo-qmlgdo`, sliced into logical commits |
| Delivery strategy | exception-ok |
| Chain strategy | size-exception |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: High

### Suggested Work Units (commits within the single PR)

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| A | #1 bug fix + #5 dedup + #2 href | PR (commit 1) | `pnpm --filter web test tests/demo/store.test.tsx apps/web/app/[locale]/demo/memory` | N/A — pure React/Vitest, no shell | Revert commit reverts store + page together |
| B | #3/#4/#6 demo coverage | PR (commit 2) | `pnpm --filter web test tests/demo` | N/A | Revert removes only new test files |
| C | #7/#9 real-component adapter tests | PR (commit 3) | `pnpm --filter web test` (full) | N/A | Revert removes only new test files, no prod change |
| D | #10 tour extension | PR (commit 4) | `pnpm --filter web test tests/demo` (or component test) | Manual: visit `/demo/memory`, `/demo/sessions/generated`, confirm callout | Revert isolates tour file + anchors |
| E | #12 landing inline-style cleanup | PR (commit 5) | `pnpm --filter web test` (landing suite) | N/A | Revert isolates 2 files |
| F | #16 bilingual fixtures | PR (commit 6) | `pnpm --filter web test tests/demo/fixtures.test.ts` then full suite | Manual: switch `/es/demo` ↔ `/en/demo`, confirm entity route stays valid | Revert isolates fixtures/layout/store-prop change |

## Phase 1: #1 Bug Fix — Suggestion Resolution (DA-001)

- [ ] 1.1 RED: extend `tests/demo/store.test.tsx` — assert `resolveSuggestion(id)` removes the entry from `state.suggestions` synchronously.
- [ ] 1.2 RED: `tests/demo/memory-remount.test.tsx` (new) — ONE `<DemoProvider>`, `logSession`, mount `/demo/memory`, accept S1 (await), dismiss S2, `rerender` (NOT fresh provider) same page; assert `suggestions` empty, no duplicate facts. Cover accept-then-return, dismiss-then-return, accept-all-then-return. Note inline: a fresh-provider remount would pass vacuously — must not be used.
- [ ] 1.3 GREEN: `lib/demo/store.tsx` — type `suggestions: PendingSuggestion[]`; key once in `logSession` via `suggestionId`; add sync `resolveSuggestion(id)`.
- [ ] 1.4 GREEN: `app/[locale]/demo/memory/page.tsx` — call `store.resolveSuggestion(id)` immediately after `await acceptSuggestion` and in `dismiss`, outside the 400ms timeout.

## Phase 2: #2 + #5 (DA-002, DA-005)

- [ ] 2.1 RED: memory page test asserting empty-state primary button `href === demoHrefs.campaign`.
- [ ] 2.2 GREEN: fix href in `demo/memory/page.tsx`.
- [ ] 2.3 Export `suggestionId`, `Feedback` from `components/sessions/memory-review-parts.tsx`; import in demo page/store, delete local copies.

## Phase 3: Demo Coverage (DA-003, DA-004, DA-006)

- [ ] 3.1 RED+GREEN: faction/arc create/update/delete tests in `tests/demo/store.test.tsx` mirroring NPC block.
- [ ] 3.2 RED+GREEN: isolated `saveSession` test in `tests/demo/store.test.tsx`.
- [ ] 3.3 Clone `demo/npcs/__tests__/page.test.tsx` into `demo/factions/__tests__` and `demo/arcs/__tests__`.

## Phase 4: Real-Component Adapter Tests (DA-007, DA-009)

- [ ] 4.1 RED+GREEN: `{arc,faction,npc}-modal.tsx` — test default path (prop omitted → real client + invalidation) and injected spy path (spy called, real client untouched).
- [ ] 4.2 RED+GREEN: `world-state-editor.tsx` — same adapter-prop coverage (#7) plus regression assertion that default no-prop mutation matches pre-PR-82 contract (#9).
- [ ] 4.3 RED+GREEN: `log-session-form.tsx` adapter-prop coverage.
- [ ] 4.4 Run full `pnpm --filter web test` + `typecheck` + `lint` + `build` — confirm zero regression on real flow.

## Phase 5: Tour Extension (DA-010)

- [ ] 5.1 Generalize `components/demo/demo-tour.tsx` to `{ tourKey, steps }`, per-screen `TOUR_SEEN_KEY`.
- [ ] 5.2 Add tour usage + demo-owned `data-tour` anchors on `/demo/memory` and `/demo/sessions/generated` pages only (no anchors on shared real components).
- [ ] 5.3 Test: tour config includes steps referencing both new screens.

## Phase 6: Landing Inline Styles (DA-012)

- [ ] 6.1 Convert inline `style={{...}}` to Tailwind (`text-[14.5px] px-[22px] py-[11px]`) on BOTH the demo button and sibling `/register` button in `landing/cta.tsx` and `landing/hero.tsx`.
- [ ] 6.2 Verify zero `style={{` matches remain in both files; landing tests stay green.

## Phase 7: Bilingual Fixtures (DA-013)

- [ ] 7.1 RED: extend `tests/demo/fixtures.test.ts` — both `en`/`es` bundles parse identical Zod schemas; ID-set parity (campaign/npc/faction/arc/session/memory ids + `continuity_links.memory_fact_id`) across locales.
- [ ] 7.2 GREEN: restructure `lib/demo/fixtures.ts` into `fixturesByLocale: Record<'en'|'es', DemoFixtures>`; shared ID/date/enum constants; export `getDemoFixtures(locale)` (fallback `en`).
- [ ] 7.3 Translate ~114 prose strings to Spanish (neutral/professional register, faithful tone); IDs/dates/enums untouched.
- [ ] 7.4 `lib/demo/store.tsx` — `DemoProvider` takes `initialFixtures` prop; `initialState(fixtures)`.
- [ ] 7.5 `app/[locale]/demo/layout.tsx` — read `params.locale`, call `getDemoFixtures`, pass `initialFixtures`.
- [ ] 7.6 Manual check: switch `/es/demo` ↔ `/en/demo` on an entity-detail route, confirm same ID resolves.

## Phase 8: Final Verification

- [ ] 8.1 Full `pnpm --filter web` typecheck + lint + test + build green.
- [ ] 8.2 Confirm #8/#13/#14/#15 untouched (no diff outside approved scope).
