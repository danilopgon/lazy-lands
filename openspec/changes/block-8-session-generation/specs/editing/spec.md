# Session Editing Specification

## Purpose

The system MUST allow a DM to view a generated session draft, edit sections inline, and persist those edits. Every section carries a provenance origin (`ContentSource` enum) that tracks whether the content was Scribe-generated or DM-edited. The Generated Session view (`/campaigns/[id]/sessions/[sessionId]`) matches the `GeneratedSession` component in `handoff/app/views-prepare.jsx`. Private DM notes are frontend-only in MVP.

## Requirements

### Requirement: GET /sessions/{session_id}

The system MUST expose `GET /sessions/{session_id}` protected by auth. It SHALL return a single session row including `id`, `campaign_id`, `session_number`, `summary`, `consequences`, `generated_content`, `trace_json`, `created_at`, `updated_at`.

#### Scenario: Happy path — fetch generated session

- GIVEN an authenticated user owns the session's campaign
- WHEN they request `GET /sessions/{session_id}`
- THEN it MUST return 200 with the full session object including `generated_content` sections with their origins
- AND `trace_json` with generation metadata

#### Scenario: Session not found or not owned

- GIVEN a non-existent or non-owned session_id
- WHEN the endpoint is called
- THEN it MUST return 404 (uniform RLS-miss handling)

### Requirement: PATCH /sessions/{session_id}

The system MUST expose `PATCH /sessions/{session_id}` protected by auth. It SHALL accept partial updates to `generated_content` (the sections array with edited origins), `summary`, and `consequences`. Ownership validation SHALL cascade through the session's campaign_id.

#### Scenario: Happy path — save section edits

- GIVEN an authenticated user owns the session
- WHEN they send `PATCH /sessions/{session_id}` with `generated_content` containing one section with `origin: "edited"` and updated `body`
- THEN the endpoint MUST return 200 with the updated session
- AND the `generated_content` sections SHALL be persisted as-is (no server-side diffing)
- AND the `updated_at` timestamp SHALL be updated

#### Scenario: Update summary alongside edits

- GIVEN a session with existing summary
- WHEN the DM edits both a section and the summary
- THEN `PATCH /sessions/{session_id}` SHALL accept `summary` AND `generated_content` in the same call
- AND both fields SHALL be updated atomically

#### Scenario: Non-owned session rejected

- GIVEN a session_id belonging to another user's campaign
- WHEN the endpoint is called
- THEN it MUST return 404 (RLS miss — no information leak)

#### Scenario: Partial update with empty body

- GIVEN an empty JSON body `{}`
- WHEN the endpoint is called
- THEN it MUST return 422 (at least one supported field required)

### Requirement: Request Schema (PATCH)

```json
{
  "generated_content": {
    "sections": [
      {
        "id": "string",
        "label": "string",
        "body": "string",
        "origin": "scribe" | "edited"
      }
    ]
  } | null,
  "summary": "string | null",
  "consequences": "string | null"
}
```

All fields are optional at the top level. At least one MUST be provided.

### Requirement: Origin Badge Provenance

Every section in `generated_content.sections[]` MUST carry an `origin` field matching the `ContentSource` enum values. The frontend SHALL render `OriginBadge` per section: `✦ Scribe` for `"scribe"` origin, `✎ Edited by you` for `"edited"` origin.

#### Scenario: Origin flips on edit

- GIVEN a section with `origin: "scribe"` in `generated_content`
- WHEN the frontend saves an edit to that section's body
- THEN the PATCH payload SHALL include that section with `origin: "edited"`
- AND the frontend SHALL update the badge display immediately on save confirmation

### Requirement: Handoff — GeneratedSession (view state)

The Generated Session page (`/campaigns/[id]/sessions/[sessionId]`) MUST match the `GeneratedSession` component from `handoff/app/views-prepare.jsx` in all states.

#### Scenario: View state — sections and metadata

- GIVEN a generated session loads successfully
- WHEN the page renders
- THEN it MUST show: breadcrumb, kicker (`Session {number} · Proposal`), h1 (session title), subtitle reading "A **draft by the Scribe**. Nothing here is canon until you've made it yours."
- AND action buttons: `← Campaign`, `Copy`, `Save changes`, `Export PDF →` (accent)
- AND each section rendered with: `/01` mono index, serif label, `OriginBadge`, Edit/Regenerate links in the tools area, and the section body in serif prose

#### Scenario: View state — memories sidebar

- GIVEN the generated session includes `continuity_links`
- WHEN the page renders
- THEN the right column SHALL show a "Memories woven in" section
- AND each memory SHALL display its type as a mono `ll-flag accent` pill, the memory text in serif, and the origin/source
- AND a "Legend" section below with: `✦ Scribe` explanation, `✎ Edited by you` explanation, `Excluded from PDF` explanation
- AND the memories SHALL be the accepted memories referenced by `continuity_links` (fetched in the same API call or via a parallel query)

#### Scenario: View state — private notes

- GIVEN the page loads
- WHEN the DM scrolls below sections
- THEN a "Private DM notes" section SHALL render with a muted `Excluded from PDF` flag
- AND a preview of the notes if any, or an empty state
- AND an `Edit` link to open the notes textarea

### Requirement: Handoff — GeneratedSession (editing state)

#### Scenario: Inline section editing

- GIVEN the DM clicks "Edit" on a section
- WHEN the section enters edit mode
- THEN the body SHALL replace with a `textarea` (serif, rows = content lines + 1 at minimum, autoFocus)
- AND two buttons SHALL appear: `Save changes` (primary) and `Cancel`
- AND the Edit/Regenerate links SHALL hide while editing

#### Scenario: Save section edit

- GIVEN the DM modifies the textarea and clicks "Save changes"
- WHEN the frontend saves
- THEN it SHALL call `PATCH /sessions/{session_id}` with the updated section
- AND on success, show a `Toast` with "Section saved"
- AND the origin badge SHALL flip to `✎ Edited by you`
- AND the view mode SHALL restore with the updated text

#### Scenario: Cancel section edit

- GIVEN the DM clicks "Cancel" while editing
- WHEN the edit is cancelled
- THEN the textarea SHALL revert to the pre-edit content (no PATCH call)
- AND the view mode SHALL restore

#### Scenario: Regenerate section (UI placeholder)

- GIVEN the DM clicks "Regenerate" on a section
- WHEN the regeneration is triggered
- THEN the section SHALL show a loading indicator with the quill animation and "The Scribe is rewriting" text
- AFTER the placeholder timeout (no real LLM call in MVP — deferred per proposal non-goal)
- THEN the section body SHALL be updated and `origin` set to `"scribe"`
- AND a Toast SHALL show "Section regenerated by the Scribe"

### Requirement: Handoff — GeneratedSession (save all)

#### Scenario: Save changes

- GIVEN the DM clicks "Save changes" (the top-level button)
- WHEN the save completes
- THEN it SHALL persist the current state of all sections (with any accumulated edits)
- AND show a Toast with "All changes saved"

#### Scenario: Copy all to clipboard

- GIVEN the DM clicks "Copy"
- WHEN the clipboard API is available
- THEN it SHALL concatenate all sections as `LABEL\nbody\n\n` and write to `navigator.clipboard`
- AND show a Toast with "Session copied to clipboard"
- AND silently fail if clipboard API is unavailable

#### Scenario: Export PDF link

- GIVEN the DM clicks "Export PDF →"
- WHEN the export button is clicked
- THEN the frontend SHALL navigate to `/campaigns/[id]/sessions/[sessionId]/export` (Block 9 — PDF export)
- AND the button SHALL be rendered as an accent `ll-btn` regardless of export implementation status

### Requirement: Handoff — Error recovery

#### Scenario: PATCH failure preserves edit

- GIVEN the DM edits a section and clicks "Save changes"
- WHEN the PATCH call fails (network error, 500)
- THEN the textarea SHALL remain open with the DM's edits (no data loss)
- AND an error notification SHALL display
- AND the DM can retry or cancel

#### Scenario: GET failure

- GIVEN the Generated Session page cannot fetch the session
- WHEN the query fails
- THEN it SHALL show `ErrorNotice` with a retry button (matching the handoff loading → error pattern)
