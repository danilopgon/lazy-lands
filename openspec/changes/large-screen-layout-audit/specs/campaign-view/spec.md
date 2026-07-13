# Delta for Campaign View

## ADDED Requirements

### Requirement: Large-screen campaign workspace layouts

At `>=1440px`, dashboard, campaign detail, and NPC/faction/arc collection screens MUST opt into the selective private-workspace tier when their existing operational content benefits from it. Dashboard MUST preserve title/count/actions/search/cards and its loading, error, empty, empty-search, and success states. Detail MUST preserve breadcrumb, metadata/actions, `StatLedger`, world-state editing, sessions, arcs, memories, loading, error, not-found, editing, save-success, and save-error states. Entity lists MUST preserve filters, rows, provenance, create/edit/delete modals and confirmations, validation, loading, error, empty, success, and mutation-failure states. Existing route behavior remains authoritative below 1440px.

#### Scenario: Campaign workspace behavior survives expansion

- GIVEN a populated campaign route at 1440px or wider
- WHEN the DM searches, navigates, edits, or opens a modal
- THEN the existing action and feedback complete without lost data or changed focus order

#### Scenario: Empty and failure states remain deliberate

- GIVEN an empty collection or a failed fetch/mutation
- WHEN the route renders at any required viewport
- THEN its existing empty or error feedback and recovery action remain visible and operable
