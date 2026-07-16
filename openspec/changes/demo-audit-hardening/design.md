# Design: Demo Audit & Hardening

## Technical Approach

Audit/hardening pass over PR #82. No new capabilities. All work is additive on a GREEN
baseline (523 web tests) under strict TDD. Demo-only items (#1-6, #10) are verified against
demo suites; real-file items (#7, #9, #12) are additive DI/cosmetic changes that MUST keep the
REAL flow green (full `pnpm --filter web test`, not demo-only). #11 is DEFERRED (see below).

## Architecture Decisions

### Decision: #1 — clear resolved suggestions in the store (the bug fix)

**Root cause**: `demo/memory/page.tsx` seeds local `pending` once via `useState(initialPending)`
from `store.suggestions`; accept/dismiss mutate only local state. `store.suggestions` is never
cleared, so remounting the page under the persistent `DemoProvider` resurrects every suggestion →
re-accepting duplicates memory facts.

**Choice**: Key suggestions once at creation, add a synchronous removal action.
- `DemoState.suggestions` type changes `MemorySuggestion[]` → `PendingSuggestion[]`.
- `logSession` maps fixtures once: `demoMemorySuggestions.map((s, i) => ({ ...s, id: suggestionId(s, i) }))`
  and stores those; the returned `RegisterSessionResponse.memory_suggestions` stays raw
  `MemorySuggestion[]` (contract-faithful).
- New action `resolveSuggestion: (id: string) => void` — `setState(c => ({ ...c, suggestions: c.suggestions.filter(s => s.id !== id) }))`. **Synchronous, no `settle()`** (UI-state cleanup, not a simulated mutation).
- `acceptSuggestion` (fact creation) stays a SEPARATE action — single responsibility, mirroring
  the real page's create-mutation-vs-draft-removal split.

**Resolve EAGERLY, not in the 400ms animation timeout**: page calls `store.resolveSuggestion(id)`
immediately after `await store.acceptSuggestion(...)` and immediately in `dismiss`. The 400ms
timeout keeps handling ONLY the stamp/strike exit animation via local `pending`. Resolving inside
the timeout would leave a window where the fact exists but the suggestion is unresolved →
navigating away mid-animation still duplicates on remount.

**Alternatives rejected**: index-keyed removal in the store (fragile — indices reindex after each
removal); merging accept+resolve into one action (couples two concerns, obscures "exactly once").

**Rationale**: Pre-keying makes ids stable for the store's lifetime; eager removal makes "persists
exactly once across remount" true; page render stays driven by local `pending` so no visual change.

### Decision: #5 — finish the shared-component extraction

Export `suggestionId` and the `Feedback` type from `memory-review-parts.tsx`. The store imports
`suggestionId` (single source of truth for keys); the demo page imports `Feedback` and drops its
local `suggestionId`. The real review page keeps its own `suggestionId`/`Feedback` copies **by
scope** (item #5 targets the demo page only) — not an oversight. lib→component type import already
exists (store imports `ArcDraft` etc. from modal files).

### Decision: #11 — DEFER

The premise ("collapse 4 props → 1 `onRegistered`") is unachievable. `registerSessionFn` is a data
adapter (injects the fake register), categorically distinct from the post-success props
(`navigate`, `persistDraft`, `reviewHref`) and cannot fold into an `onRegistered` callback. The
demo caller uses only 3 of 4 props (never `reviewHref`). Best achievable is 4→2, at the cost of
reshaping the real, tested `onSuccess` path for Impact=Low. Not a clean win. DEFER.

### Decision: #12 — premise correction; convert BOTH CTA buttons

The sibling primary `/register` button (hero.tsx:70, cta.tsx) uses the IDENTICAL inline
`style={{ fontSize: 14.5, padding: '11px 22px' }}`. Converting only the demo button would CREATE
the inconsistency #12 claims to fix. Convert both buttons per file to
`text-[14.5px] px-[22px] py-[11px]` (no `size` variant matches; `h-11` stays → rendering
identical, pure className swap). #82 already modified that CTA row. Fallback if reviewer wants
minimal scope: DEFER.

## Data Flow (#1)

    logSession ──► store.suggestions: PendingSuggestion[]  (keyed once)
                          │
                   page mount: useState(initialPending)  (local copy)
                          │
    accept ──► acceptSuggestion(fact) ──► resolveSuggestion(id)  (eager, sync)
    dismiss ─────────────────────────► resolveSuggestion(id)     (eager, sync)
                          │
                   400ms timeout ──► removePending(id)  (local only, animation)
                          │
                   remount ──► reseeds from store (already emptied) → no duplicate

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `lib/demo/store.tsx` | Modify | `suggestions` typed `PendingSuggestion[]`; key in `logSession`; add sync `resolveSuggestion`; import `suggestionId` |
| `components/sessions/memory-review-parts.tsx` | Modify | Export `suggestionId` + `Feedback` |
| `app/[locale]/demo/memory/page.tsx` | Modify | #1 eager resolve; #2 empty-state href → `demoHrefs.campaign`; #5 import shared, drop local `suggestionId` |
| `components/landing/{cta,hero}.tsx` | Modify | #12 convert both CTA buttons to Tailwind |
| `components/demo/demo-tour.tsx` | Modify | #10 generalize to `{ tourKey, steps }`; per-screen `TOUR_SEEN_KEY` |
| `app/[locale]/demo/{memory,sessions/generated}/page.tsx` | Modify | #10 render tour; demo-owned `data-tour` anchors only |
| `tests/demo/store.test.tsx` | Modify | #3 faction/arc CRUD; #6 `saveSession`; #1 `resolveSuggestion` |
| `demo/{factions,arcs}/__tests__/`, memory-remount, real-component adapter tests | Create | #4, #1 remount, #7, #9 |

## Testing Strategy

| Layer | What | Approach |
|-------|------|----------|
| Unit (store) | #1 `resolveSuggestion`, #3 faction/arc CRUD, #6 `saveSession` | Direct action assertions |
| Integration (#1 proving) | No duplicate facts on re-entering `/demo/memory` | Render ONE persistent `<DemoProvider>`; `logSession`; mount page; accept/dismiss all; unmount+remount ONLY the page (harness via `rerender`, NOT a fresh provider); assert `pending` empty and `memoryFacts` did not double. A fresh provider passes even unfixed — must be avoided. |
| Unit (#7 adapter) | `{arc,faction,npc}-modal`, `world-state-editor`, `log-session-form` | Render REAL component: prop omitted → asserts real API client called + invalidation; prop provided (spy) → spy called, real client NOT called, no invalidation |
| Unit (#9 regression) | world-state-editor REAL default path | No `onSave`: mock `updateCampaign`, assert `displayValue` updates + invalidation; error → localized message, draft intact. Combine with #7 onSave branch in one file |
| Page (#4) | demo factions/arcs pages | Clone `demo/npcs/__tests__` |

**Regression safety (#7, #9, #12)**: after each, run full web `test` + `typecheck` + `lint` +
`build`. "Demo still works" is insufficient.

## Threat Matrix

N/A — no routing/shell/subprocess/VCS boundary. Client-side localized router pushes only.

## Migration / Rollout

No migration. Additive commits on the PR #82 branch; revert per-commit. Combined diff may approach
the 400-line budget — `sdd-tasks` forecasts and slices if needed (real-file items isolated for
clean regression signal).

## Item #16 — Bilingual demo fixtures (same PR; size:exception accepted)

**Problem**: `demo-header.tsx` renders `<LanguageSwitcher compact />` and `/es/demo` is reachable,
but `lib/demo/fixtures.ts` is English-only (~114 narrative strings). A Spanish visitor gets
localized chrome around English lore. The real product does NOT localize user-authored campaign
content, but the demo is a curated marketing surface selling bilingual support, so sample content
must follow the active locale.

### Decision: locale-selection seam — layout selects, provider stays locale-agnostic

**Choice**: The server `DemoLayout` already receives the route `[locale]` param. It calls a pure
selector `getDemoFixtures(locale)` and passes the chosen bundle into `DemoProvider` as an
`initialFixtures` prop. `DemoProvider` becomes locale-agnostic: `initialState(fixtures)` seeds from
the prop instead of importing module consts directly.

    DemoLayout (server, params.locale) ──► getDemoFixtures(locale): DemoFixtures
                                                      │ prop: initialFixtures
                                         DemoProvider (client) ──► initialState(fixtures)

**Alternatives rejected**: client-side `useLocale()` inside `DemoProvider` (adds a client re-read
and a re-seed effect; the locale is already known at the server layout with zero cost).
**Rationale**: single selection point, no client refetch, provider has no locale knowledge.
`getDemoFixtures` falls back to `en` for any unknown locale.

### Decision: file shape — per-locale prose, shared IDs

Restructure `fixtures.ts` into `fixturesByLocale: Record<'en' | 'es', DemoFixtures>` where
`DemoFixtures` bundles `{ campaign, sessions, memoryFacts, suggestions, generated }`.
- **Shared / NON-translated (identical across locales)**: all stable IDs (`DEMO_CAMPAIGN_ID`,
  `DEMO_GENERATED_SESSION_ID`, `demo-npc-*`, `demo-faction-*`, `demo-arc-*`, `demo-session-*`,
  `demo-memory-*`, section `id`s, `continuity_links.memory_fact_id`), all dates
  (`created_at`/`updated_at`), and all enums (`content_source`, `system`, `tone` code, `type`,
  `importance`, `priority`, `status`, `origin`). Keep IDs as exported top-level constants referenced
  by both locale objects so they cannot diverge.
- **Translated**: only human-readable prose (`title`, `description`, `world_state`, `name`,
  `current_state`/`current_stance`, `motivation`, `goals`, `summary`, `consequences`, memory/
  suggestion `content`+`reason`, `related` labels, section `label`+`body`, `relevance`).
- `related` entity labels are prose but must stay consistent with the localized entity names within
  the SAME locale (they are display strings, not ID refs).

### Decision: Zod parity invariant preserved

Both locale bundles parse through the exact same schemas at module load (map the parse over
`fixturesByLocale`), so an invalid fixture in either locale throws on import. `tests/demo/fixtures.test.ts`
must assert BOTH locales validate AND that the ID sets are identical across locales (campaign id,
npc/faction/arc/session/memory ids, and every `continuity_links.memory_fact_id` resolving to a
present memory id) — this guards continuity links, hrefs, and selected-entity routes.

### Decision: language switch mid-demo

Flipping the switcher navigates `/en/demo/...` ↔ `/es/demo/...`; the locale segment change remounts
`DemoLayout`, re-runs `getDemoFixtures`, and re-instantiates `DemoProvider` → the store re-seeds from
the other locale. Because IDs are shared, the current route and any selected-entity path stay valid
(no 404). **State-reset implication**: locally-created entities, in-flight suggestions, and unsaved
generated-session edits are lost on switch (fresh seed). Acceptable for a demo; note it, do not try
to migrate mutable state across locales.

### Translation production note (apply-phase concern)

The ~114 strings are D&D narrative and are the BULK of the effort. Spanish must be neutral/
professional register, faithful to the English tone (evocative but not florid). Translation quality
is an apply-phase deliverable, not a design concern beyond flagging it. This item ships in the SAME
PR (user decision), pushing the combined diff over the 400-line budget → **`size:exception`
accepted**.

### File Changes (#16)

| File | Action | Description |
|------|--------|-------------|
| `lib/demo/fixtures.ts` | Modify | `fixturesByLocale` record; shared ID constants; export `getDemoFixtures(locale)` + `DemoFixtures` type; parse both locales |
| `lib/demo/store.tsx` | Modify | `DemoProvider` takes `initialFixtures` prop; `initialState(fixtures)` |
| `app/[locale]/demo/layout.tsx` | Modify | Read `params.locale`; `getDemoFixtures(locale)` → `initialFixtures` prop |
| `tests/demo/fixtures.test.ts` | Modify | Assert both locales validate + ID-set parity |

## Open Questions

- [ ] #12: convert-both (recommended) vs demo-only+DEFER — reviewer scope call.
- [ ] #16: confirm `es`/`en` are the only demo locales (selector fallback covers others).
