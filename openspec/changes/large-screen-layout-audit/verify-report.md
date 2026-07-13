---
schema: gentle-ai.verify-result/v1
evidence_revision: sha256:f303d0a25560a9a4ee0cf864138fffc360e4bf1db2a2d6e58fd2cfd8e2da15e9
verdict: fail
blockers: 0
critical_findings: 6
requirements: 5/5
scenarios: 0/7
test_command: pnpm test
test_exit_code: 0
test_output_hash: sha256:f303d0a25560a9a4ee0cf864138fffc360e4bf1db2a2d6e58fd2cfd8e2da15e9
build_command: pnpm build
build_exit_code: 0
build_output_hash: sha256:e18202cf3fc767e29f97046edb831553b7821b5ea333e55cbd909e1deb921b76
---

# Verification Report

**Change**: large-screen-layout-audit  
**Mode**: Strict TDD, hybrid

## Completeness and execution

| Metric | Result |
| --- | --- |
| Tasks | 13/13 complete |
| `pnpm test` | PASS — 59 web files / 464 tests; 10 Supabase tests |
| Focused RTL | PASS — 95 tests |
| `pnpm --filter web test:e2e` | PASS — 7 tests |
| `pnpm lint` / `pnpm typecheck` / `pnpm format:check` / `pnpm build` | PASS |

The E2E suite used a real local Next server launched with `cmd.exe /c pnpm dev`; this Windows workspace cannot reliably spawn the configured direct `pnpm dev` web-server command.

## Strict scenario compliance

| Requirement | Scenario | Result |
| --- | --- | --- |
| Selective tier | Eligible workspace expands | ❌ UNTESTED — no authenticated priority route is rendered at >=1440px. |
| Selective tier | Narrow viewport unchanged | ❌ UNTESTED — no eligible route is rendered at <=900px. |
| Eligibility | Generated-session context | ❌ UNTESTED — RTL passes behavior but not >=1440px browser layout. |
| Eligibility | Sparse route stays bounded | ❌ UNTESTED — login overflow does not assert bounded measure. |
| Preservation | Keyboard and state regression | ❌ UNTESTED — only login is reached in E2E. |
| Preservation | Reduced motion and localization | ⚠️ PARTIAL — Spanish/reduced motion run only on login. |
| Documentation | Policy traceability | ❌ UNTESTED — policy docs exist; no passing scenario test. |
| Campaign layouts | Behavior survives expansion | ❌ UNTESTED — RTL behavior lacks >=1440px browser fixture. |
| Campaign layouts | Empty/failure deliberate | ❌ UNTESTED — RTL state coverage lacks required browser viewports. |

Specs contain 5 requirements and 7 scenarios. Strict completion: **0/7 scenarios**.

## Static and TDD evidence

- Static implementation is coherent: CSS-only `ll-workspace` utilities activate at >=1440px; dashboard, detail/entity, and generated-session routes opt in; main prose is bounded at 75ch; no fixed/sticky notes or global rail was added.
- Policy documentation exists in `DESIGN.md`, `docs/04-architecture.md`, and `docs/08-quality-strategy.md`.
- TDD evidence is present in Engram apply-progress. Modified RTL files and the new E2E file exist and pass. Assertion audit found no tautologies, ghost loops, smoke-only tests, or assertions detached from production behavior.
- Changed-test distribution: integration 36 cases / 2 files; E2E 5 cases / 1 file. Coverage tool unavailable.

## Findings

### CRITICAL

1. The new Playwright desktop checks navigate to `/dashboard`, are redirected to `/login`, and never render an authenticated priority workspace.
2. No runtime check proves the <=900px flow of an eligible workspace.
3. No runtime >=1440px generated-session context layout test exists.
4. Required keyboard/state matrix is not exercised on audited private routes.
5. Spanish/reduced-motion checks cover login only.
6. Campaign populated/empty/failure workflows are RTL-only, not browser-verified at required viewports.

### WARNING

- Apply-progress overstates the E2E scope: the checked-in file has no authenticated API fixture, screenshots, priority-route state checks, or authenticated tab-order check.
- `playwright.config.ts` direct web-server command remains unreliable on Windows.

## Verdict

**FAIL** — executable quality gates pass, but strict verification fails closed because no specified scenario has complete runtime evidence at its required authenticated viewport/state scope. Add authenticated deterministic Playwright fixtures and execute the documented viewport/state/i18n/reduced-motion/keyboard matrix.
