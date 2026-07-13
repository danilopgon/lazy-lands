# memory-review-workspace Specification

## Purpose

Make Memory Review eligible for a large-screen operational workspace while preserving DM-controlled canon review (PRODUCT.md P1/P3).

## Requirements

### Requirement: Normal-flow review workspace

At >=1440px, Memory Review MUST place full-width breadcrumb, header, feedback, and actions before normal-flow proposal and active-canon columns; pending proposals MUST precede canon in DOM and focus order. At <=900px it MUST collapse to one document-flow column. It MUST NOT add a global, fixed, or sticky rail. Documentation MUST record this approved exception to the former protected workspace classification while leaving `large-screen-layout-audit` unchanged.

#### Scenario: Wide review composition
- GIVEN a 1440px viewport and populated review data
- WHEN Memory Review renders
- THEN proposals occupy the bounded main lane and active canon the contextual column
- AND header, feedback, and actions remain full width

#### Scenario: Narrow order
- GIVEN a 900px viewport
- WHEN tabbing through the review page
- THEN pending review controls precede active-canon controls in one normal flow

### Requirement: Preserve the complete review loop

The workspace MUST preserve campaign loading, error, not-found, and success; pending empty; active loading, error, empty, and success; accepted, edited, dismissed, and retired feedback; edit mode; accept, edit, dismiss, and retire controls; and create/retire action-failure recovery. It MUST retain `LoadingScribe`, `Notice`, `EmptyState`, `OriginBadge`, accessible labels, visible focus, and existing motion/reduced-motion behavior.

#### Scenario: Action failure is recoverable
- GIVEN create or retire fails
- WHEN the DM invokes the action
- THEN the matching alert appears and the proposal or canon row remains actionable
