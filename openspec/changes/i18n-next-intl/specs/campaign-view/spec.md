# Delta for Campaign View

## ADDED Requirements

### Requirement: Locale-aware campaign read screens

All campaign-view frontend screens MUST render user-facing copy, states, counts, option display labels, and dates from the active locale while preserving existing API payloads, route names, ownership behavior, and handoff layout/motion requirements.

#### Scenario: Dashboard states are translated

- GIVEN `/dashboard` or `/es/dashboard` renders loading, error, empty, empty-search, or success states
- WHEN locale changes
- THEN breadcrumb, kicker, title, subtitle/counts, `+ New campaign`, search placeholder/count, card stat labels, updated date, and open link use the active locale
- AND the grid remains responsive to one column under 760px

#### Scenario: Dashboard handoff behavior remains intact

- GIVEN the language switcher is added
- WHEN `/dashboard` renders
- THEN it appears in the header action area or shell top-right without displacing `+ New campaign`
- AND hard paper cards, mono metadata, Loading/ErrorNotice/EmptyState, quill loading, page entrance, and button press physics remain available

#### Scenario: Detail and entity list labels are localized

- GIVEN campaign detail, NPC, faction, or arc list screens render
- WHEN locale is `es`
- THEN breadcrumbs, section headings, placeholders, stat labels, add/edit/delete labels, empty states, error states, and status/priority display labels are Spanish
- AND API enum codes such as `active`, `dormant`, `resolved`, `discarded`, `high`, `medium`, and `low` remain untranslated in data contracts

#### Scenario: Dates follow active locale

- GIVEN a campaign updated date is displayed
- WHEN locale is `en` or `es`
- THEN formatted date text follows the active locale instead of hard-coded `en-US`

### Requirement: Campaign i18n tests

Campaign-view tests MUST assert translated dashboard/detail/entity-list states and locale-aware route behavior without weakening existing ownership or read-state coverage.

#### Scenario: Spanish dashboard is tested

- GIVEN tests run for campaign-view UI
- WHEN `/es/dashboard` is exercised
- THEN translated dashboard copy, switcher behavior, search state, and auth redirect preservation are covered where feasible
