# Large-screen Layout Specification

## Purpose

Define a selective private-workspace layout tier for Issue #45. It extends the existing responsive system; it does not change product data, copy, APIs, AI behavior, or information architecture.

## Requirements

### Requirement: Selective large-screen workspace tier

At viewport widths of **1440px or greater**, the frontend MUST provide a named, reusable private-workspace tier. It SHALL preserve the current `<=900px` collapse and MUST NOT globally widen every route. It MAY allocate route-local operational or contextual zones only where existing data has a clear navigation or editing purpose; no global navigation rail or fixed/sticky notes bar is permitted. Reading prose and focused form content MUST remain approximately 65–75ch.

#### Scenario: Eligible workspace expands

- GIVEN a priority private route at 1440px or wider
- WHEN its existing collection or context benefits from space
- THEN its workspace uses the named tier without unbounded prose

#### Scenario: Narrow viewport remains unchanged

- GIVEN an eligible route at 900px or narrower
- WHEN it renders
- THEN all essential information is in normal document flow

### Requirement: Route-local layout eligibility

The tier MUST prioritize generated-session (editable sections, provenance, private notes, continuity-memory panel, errors/toasts), dashboard (title, count, actions, search, cards, loading/error/empty), and campaign detail (breadcrumb, metadata/actions, stat ledger, world state, sessions, arcs, memories). It SHOULD serve entity lists, memory review, prepare, and export while preserving their fields, filters, modal/confirmation, provenance, validation, and loading/error/empty/success/action-failure states. Generated-session contextual zones MUST use existing data only and collapse below 1440px. Export preview MUST remain bounded.

#### Scenario: Generated-session context is available

- GIVEN a generated session with existing memory and private-note data
- WHEN it renders at 1440px or wider
- THEN contextual information has a visible editing or navigation purpose

#### Scenario: Sparse route is not artificially expanded

- GIVEN a route whose current bounded composition is intentional
- WHEN audited at 1440px or wider
- THEN unused width alone does not require a layout change

### Requirement: Handoff and behavior preservation

The audit MUST cover every shipped view at 1440×900, 1536×960, and 1920×1080; English and Spanish at 1440×900; and reduced motion. It MUST preserve `AppHeader`, `Button`, `Field`, `LoadingScribe`, `Notice`, `EmptyState`, `OriginBadge`, `StatLedger`, `Modal`, and `MarkdownBody`; all existing fields, copy, navigation, interactions, focus order, validation, and individually enumerated route states. It MUST retain Print Chronicle token-only colors, zero radius, hard ink shadows, serif reading content, mono metadata, existing motion variants, and `prefers-reduced-motion` behavior.

Auth MUST retain its centered 440px card and validation, submitting, error, and success states. Focused forms, review, legal, and narrow reading flows MUST remain bounded unless a route audit proves a concrete benefit. No information-architecture, data, AI, or API change is allowed.

#### Scenario: Keyboard and state regression check

- GIVEN any audited route and each of its loading, error, empty, success, and action-failure states
- WHEN keyboard navigation and state actions are exercised at each required viewport
- THEN focus, order, visible feedback, data, and interactions remain available

#### Scenario: Reduced motion and localization

- GIVEN Spanish locale or `prefers-reduced-motion: reduce`
- WHEN an audited route renders at 1440×900
- THEN text neither overflows nor clips and motion follows the existing reduced-motion contract

### Requirement: Documented responsive policy and verification

`DESIGN.md` MUST document the `>=1440px` selective tier, preserved measures, protected narrow layouts, and Print Chronicle constraints. `docs/04-architecture.md` MUST identify the shared frontend policy ownership, and `docs/08-quality-strategy.md` MUST require the viewport, i18n, reduced-motion, overflow, keyboard, and route-state verification matrix. Visual checks MUST not assert styling class names as behavioral tests.

#### Scenario: Policy is traceable

- GIVEN the change is reviewed
- WHEN a maintainer reads the designated documentation
- THEN they can determine eligible routes, prohibited patterns, and required verification
