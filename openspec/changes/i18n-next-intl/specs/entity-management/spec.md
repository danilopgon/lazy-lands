# Delta for Entity Management

## ADDED Requirements

### Requirement: Locale-aware entity mutation UX

Entity-management frontend modals and shared primitives MUST render all user-facing labels, validation copy, fallback errors, confirmation copy, button states, optional markers, close labels, and option display text from the active locale while preserving backend request/response contracts.

#### Scenario: Shared primitives are translated

- GIVEN `Field`, `Modal`, `Loading`, `ErrorNotice`, `ScribeNotice`, `EmptyState`, `OriginBadge`, or delete confirmation UI renders
- WHEN locale is `es`
- THEN optional markers, close accessible labels, default loading captions, origin badges, action labels, and fallback errors appear in Spanish

#### Scenario: NPC and faction modals are translated

- GIVEN add/edit NPC or faction modal states render
- WHEN locale changes
- THEN modal titles, field labels, placeholders/help, validation errors, Cancel/Add/Save/Delete states, and select display labels use the active locale
- AND submitted payload field names and values required by the API remain unchanged

#### Scenario: Arc modal display labels are translated safely

- GIVEN an arc add/edit modal displays priority or status options
- WHEN locale is `es`
- THEN labels such as High/Medium/Low and Active/Dormant/Resolved/Discarded are translated for the user
- AND submitted codes remain `high`, `medium`, `low`, `active`, `dormant`, `resolved`, or `discarded`

#### Scenario: Campaign creation/review UI is translated without prompt drift

- GIVEN campaign creation or review pages render loading, error, form, review, empty entity-section, or saving states
- WHEN locale is `es`
- THEN visible breadcrumbs, step labels, field labels/placeholders, counters, notices, buttons, editable-prose controls, and fallback errors are Spanish
- AND `composeRawText` prompt headings are not translated unless a later design explicitly changes backend extraction behavior

### Requirement: Entity i18n verification

Tests MUST cover translated modal/shared-state behavior and must keep API-code assertions stable.

#### Scenario: Modal translations are tested

- GIVEN frontend tests open entity modals in Spanish
- WHEN form controls and buttons are queried
- THEN translated accessible names are asserted
- AND network payloads still use stable API field names/codes
