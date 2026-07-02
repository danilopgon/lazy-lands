# Exploration: Parallel Build Tracks Ahead of Blocks 5-9

Status: exploration only. No production code, no roadmap edits, no proposal created.
Manual production auth configuration (hosted Supabase project, prod env vars, end-of-block
smoke test) is explicitly out of scope - assumed to happen separately.

## 1. Two distinct DAGs

Delivery/integration DAG - what must be demoed and integrated in order, driven by real
data dependencies and the demo script in docs/09-tfm-delivery.md:
Block 5 (campaign + extraction) -> Block 6 (campaign view) -> Block 7 (session registration +
memory suggestions) -> Block 8 (generation, needs accumulated_summary + active MemoryFacts) ->
Block 9 (PDF export, needs a generated session).
This ordering is real and cannot be reordered for the demo.

Build DAG - what construction work can proceed given only the already-written specs
(03-domain-model.md, 05-ai-system.md, 06-api-contracts.md, 07-data-security-and-rls.md),
independent of a live Supabase session or a merged auth PR. Confirmed empirically: this DAG is
far shallower than the delivery DAG.

Roadmap line 3 ("Do not start a block until the previous one is working end-to-end") is a
delivery-DAG rule; read literally it also blocks the build DAG, which the rest of the docs do
not support.

## 2. Parallel build tracks - verified against the real repo

Track A - AI/domain core: services/api/app/shared/llm/port.py has ONLY complete(prompt)->str
(docs specify a richer complete_text + complete_json(prompt, schema)->T - the port is minimal,
not final). fake.py FakeLlmProvider returns a STATIC '{"fake": true}' - not yet a per-schema
fixture provider. All four modules' application/ dirs (campaigns, sessions, memory, generation)
are empty stubs (__init__.py only) - no use cases written yet. No openrouter.py adapter exists.
All four output schemas (ExtractCampaignOutput, CampaignSummaryOutput, MemorySuggestionsOutput,
GeneratedSessionOutput) are fully field-specified in docs. Track A is buildable now but requires
first enriching the port/fake (complete_json + per-schema fixtures) - that reconciliation IS part
of the track's own risk-front-loading value, not a precondition someone else must satisfy.

Track B - Frontend presentational components: handoff/app/views-{dashboard,entities,sessions,
review,export,prepare,arcs}.jsx are full mocked-data prototypes for every pending screen.
docs/04-architecture.md's component-organization table (ui/, layout/, feature data/+types/)
supports mock-data-driven components ahead of real fetches. CORRECTION: container/presentational
is NOT an enforced convention today - apps/web/app/login/page.tsx couples Supabase call + form +
JSX in one file; no frontend doc mandates the split (only ADR-05 mentions it, for the backend).
Track B is real but the split must be deliberately introduced, not assumed free.

Track C - PDF export pipeline (Block 9): GeneratedSessionOutput is fully specified;
handoff/app/views-export.jsx gives the print layout. Sufficient to build+test
GET /sessions/{id}/export.pdf against a hand-built fixture, satisfying quality-strategy's only
bar ("returns application/pdf"), without DB/auth.

Track D - Supabase schema + RLS: ALREADY DONE, not a candidate. supabase/migrations/
20260628101707_initial_schema.sql (dated inside Block 4) already creates all 6 tables
(campaigns, sessions, npcs, factions, arcs, memory_facts) with 5 enum types matching the domain
model exactly, RLS enabled on all 6, and 24 policies implementing the ownership rules from
07-data-security-and-rls.md. This EXCEEDS the roadmap Block 4 checklist text ("users table and
RLS baseline") - empirical proof horizontal build-ahead already happened once in this project
without incident. Remaining action: write the RLS test suite (not schema design).

## 3. Why unblocking saves closing time (core deliverable)

Runway ~15 days (today 2026-07-02, internal target 2026-07-17, deadline 2026-07-20). Value =
uncertain/exploratory work removed from the critical path, not raw code volume.

Track A (highest value, do first): the riskiest part of blocks 5/7/8 is prompt tuning and
JSON-shape reliability for the four schemas, not FastAPI wiring. None of that needs auth/DB.
Doing it now converts each future block's hardest subtask into "wire an already-green use case
behind get_current_user" - risk front-loading in the strict sense.

Track B (second): building screens now against typed mock data means each block's remaining
frontend work at integration is only swapping a mock source for a TanStack Query call through
the existing apiFetch (apps/web/lib/api.ts) - no new component design under deadline pressure.

Track C (opportunistic): Block 9 is last and smallest; building it now removes a whole block
from the thinnest-slack part of the calendar (rework avoidance, not risk front-loading).

Track D (already banked): schema/RLS churn at blocks 5-8 integration time is already avoided;
only the RLS test suite remains, which can also start now.

Net effect: without these tracks, each of blocks 5-9 combines prompt debugging + UI construction
+ schema/RLS design inside one crunch window. With tracks done ahead, remaining critical-path
work collapses to wiring - short and predictable.

## 4. Costs / risks / the one real doc conflict

- Track B: handoff/ prototypes are static; domain/API drift causes rework - mitigate by typing
  against docs/03 and docs/06 schemas, not handoff markup.
- Track A: FakeLlmProvider proves use-case control flow, not real-model JSON reliability
  (addressed in Phase 2).
- Solo project (single git author) - "parallel" means interleaved, not concurrently staffed;
  saved time is calendar time.
- Strict TDD is compatible with all four tracks (red-green still applies); only the *timing*
  changes.
- The one real conflict: roadmap line 3 literally forbids this if read literally; every other
  doc (ADR-05, LLM provider abstraction, per-module TDD, frontend component-organization table)
  already assumes independent module construction, and Track D proves it already happened once.
  Conclusion: the line governs delivery/integration order, not build order. A one-line
  clarification (not a rewrite) has real pedagogical value for the TFM defense but is not a
  blocker to starting the tracks.

## 5. Recommendation

Order of value (risk-front-loaded x critical-path-length): 1) Track A (enrich
LlmProvider/FakeLlmProvider first), 2) Track B (introduce container/presentational
deliberately), 3) Track C (opportunistic), 4) Track D (no action - already done; write RLS
tests only). Do not rewrite the roadmap block-by-block; add a short clarifying note near line 3
distinguishing delivery order from build order.

## Phase 2 - FakeLlmProvider vs. real dev-inference lane for Track A

Q: does it save net time to skip FakeLlmProvider and drive Track A against a real LlmProvider
pointed at a cheap/local dev inference endpoint (Ollama/LM Studio/cheap OpenRouter key) instead
of or in addition to the fake?

1. Determinism/CI: docs/08-quality-strategy.md requires "FakeLlmProvider for use case tests";
   AGENTS.md mandates Strict TDD and "CI uses fake values," no committed secrets. A real dev
   inferer is non-deterministic and would need a secret or reachable local model in CI - directly
   contradicts both rules. Skipping the fake entirely is a NET LOSS, not a judgment call.

2. What a real dev inferer buys that the fake structurally cannot: whether a real model given
   the actual Jinja prompt reliably returns valid JSON shaped like the four schemas, whether the
   JSON guard's fence-stripping handles real formatting quirks, whether Pydantic validation-
   failure paths trigger on genuinely malformed output, whether Block 8's ~2000-token context
   ceiling is realistic once measured. This is prompt/contract VALIDATION, a different category
   from unit testing, advisory not blocking.

3. Tradeoff: setup cost = adding complete_json to LlmProvider + one adapter (Ollama - no API
   key, no billing, already named in docs/04-architecture.md as the suggested local-dev option).
   This is work Block 5 needs eventually anyway, not pure overhead. Payoff = catching
   prompt-format/JSON-shape problems now (schedule slack) instead of at Block 8 integration
   under deadline pressure (2026-07-16-ish).

4. Recommendation: BOTH, not either/or. Keep enriched FakeLlmProvider as the deterministic
   unit/CI oracle (per-schema fixture responses, not the current static '{"fake": true}').
   ADD a second opt-in non-CI lane: a pytest suite marked to exclude from default CI run (or a
   standalone script under services/api/scripts/) driving a real OllamaProvider against local
   Ollama, used to iterate on and validate the four prompt templates before any route is wired.
   No API key, no CI wiring, no billing risk. This moves AI risk further off the critical path
   than the fake alone can, at low marginal setup cost relative to the ~15-day runway.

## Files/evidence referenced
- services/api/app/shared/llm/{port.py,fake.py} (only complete(), static fake, no openrouter.py)
- services/api/app/modules/{campaigns,sessions,memory,generation}/application/ (empty stubs)
- handoff/app/views-{dashboard,entities,sessions,review,export,prepare,arcs}.jsx
- apps/web/app/login/page.tsx (no container/presentational split today)
- apps/web/lib/api.ts (apiFetch/TanStack Query wrapper already built)
- supabase/migrations/20260628101707_initial_schema.sql (all 6 tables + RLS + 24 policies, done)
- docs/{03-domain-model,04-architecture,05-ai-system,06-api-contracts,07-data-security-and-rls,08-quality-strategy,09-tfm-delivery,10-roadmap}.md, AGENTS.md
