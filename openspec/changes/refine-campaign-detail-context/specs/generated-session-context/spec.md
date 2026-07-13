# generated-session-context Specification

## Purpose

Keep private-data exclusion visible without introducing private-note storage or interaction.

## Requirements

### Requirement: Deferred private-notes context

The generated-session view MUST preserve draft sections, provenance, section edit/regenerate behavior, export action, woven memories, and legend. It MUST replace the private-notes editor with localized noninteractive “Coming soon” content in the right aside after woven memories and before the legend, labeled “Private DM notes” and “Excluded from PDF”. It MUST NOT render a textarea, control, toast, local state, persistence, generation input, PDF inclusion, or sticky/fixed rail for those notes.

#### Scenario: Deferred notes render
- GIVEN a generated session loads
- WHEN its context aside renders
- THEN the localized notes placeholder appears between woven memories and legend
- AND it has no focusable editing control or textbox

#### Scenario: Export remains private-safe
- GIVEN the DM exports the draft
- WHEN PDF content is prepared
- THEN private-note placeholder copy is excluded
