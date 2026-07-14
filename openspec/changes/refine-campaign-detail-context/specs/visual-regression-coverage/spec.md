# visual-regression-coverage Specification

## Purpose

Protect the affected campaign-detail, generated-session, and Memory Review compositions without authenticated end-to-end fixtures.

## Requirements

### Requirement: Deterministic visual and RTL coverage

Chromium visual regression MUST capture fixed/intercepted data at 1440x900 and 900x900 with stable dates, fonts, locale, and motion. English and Spanish MUST be represented. Focused RTL tests MUST prove preview caps/order, truthful specialist links, notes placeholder placement and noninteractivity, and Memory Review actions. Tests MUST cover Memory Review loading, error/not-found, pending-empty, active loading/error/empty/success, feedback, edit, and action-failure states. They MUST NOT require broad authenticated E2E fixtures. Quality documentation MUST define this strategy.

#### Scenario: Stable bilingual snapshots
- GIVEN fixed fixtures and motion disabled or stabilized
- WHEN Chromium captures English and Spanish target viewports
- THEN repeated runs produce the approved compositions without date, font, or animation drift

#### Scenario: Review behavior under RTL
- GIVEN localized deterministic review data
- WHEN RTL exercises each review action and failure path
- THEN accessible controls and preserved recovery feedback are observable
