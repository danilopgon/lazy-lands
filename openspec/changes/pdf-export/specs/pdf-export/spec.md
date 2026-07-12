# PDF Export Specification

## Purpose

Allow a DM to download a secure A4 PDF from the saved, edited generated-session draft.

## Requirements

### Requirement: Export persisted ordered sections

The system MUST export only the persisted, ordered `generated_content.sections[]` snapshot using allowlisted `id`, `label`, `body`, and `origin`. It MUST NOT depend on regeneration routes or identifiers, unsaved client text, legacy flat fields, or private notes.

#### Scenario: Selected saved sections export
- GIVEN an owned session has persisted ordered sections
- WHEN the DM requests export with valid selected section IDs
- THEN the PDF contains those saved sections in persisted order
- AND unselected sections and private notes are absent

#### Scenario: Invalid selection is rejected
- GIVEN an owned session has persisted sections
- WHEN the request contains an empty, duplicate, or unknown section-ID selection
- THEN the system returns 422 and produces no PDF

### Requirement: Authorize binary PDF download

The system MUST provide authenticated `GET /sessions/{session_id}/export.pdf` with validated selected IDs and return a downloadable `application/pdf` for an owned exportable draft. Its Pydantic query schema MUST constrain selection to UUID section IDs. RLS lookup MUST return 404 for malformed, unknown, or non-owned session IDs.

#### Scenario: Owner downloads PDF
- GIVEN an authenticated owner selects persisted sections of an exportable session
- WHEN they call the export endpoint
- THEN the response is 200, is a binary PDF attachment, and has a PDF content type

#### Scenario: Missing draft is not exportable
- GIVEN an owned session has no persisted draft or no exportable sections
- WHEN the DM opens or requests export
- THEN the system returns a clear non-exportable-draft error and no PDF bytes

### Requirement: Render a portable document

The system MUST render an A4-portrait document with a Lazy Lands / DM-edited footer. The container image MUST include renderer dependencies, and automated verification MUST render a representative persisted draft inside it and assert valid non-empty PDF bytes.

#### Scenario: Container render succeeds
- GIVEN the production container is built
- WHEN the renderer receives a representative selected document
- THEN it produces a non-empty PDF whose page metadata is A4 portrait

### Requirement: Present the export handoff checklist

The export screen MUST use `Shell`, `Kicker`, `Loading`, `ErrorNotice`, and `ScribeNotice` equivalents; breadcrumb/back navigation; header copy on saved-edited export and private-note exclusion; a 280px desktop control column plus preview, one column at <=900px; and Print Chronicle tokens and press physics.

Controls MUST list every persisted section checked by default with label and edited marker, plus disabled unchecked “Private DM notes / Never exported”. Preview MUST show selected-only content, count, A4 metadata, and footer.

#### Scenario: Ready preview and toggles
- GIVEN an exportable persisted draft loads
- WHEN the DM toggles a section
- THEN the count and selected-only preview update without mutating the draft

#### Scenario: Private note exclusion
- GIVEN private notes exist on the session
- WHEN the export screen renders or downloads
- THEN their control is disabled and unchecked and their content is never previewed, requested, or exported

### Requirement: Preserve export feedback states

The screen MUST individually implement ready preview/toggle, private-note exclusion, exporting with duplicate prevention, success notice, retryable failure preserving selection, and missing/non-exportable draft. Exporting MUST show quill loading. Motion MUST include entry and press feedback, respect `prefers-reduced-motion`, and honor `data-motion` full, subtle, and off.

#### Scenario: Export completes once
- GIVEN a valid selection and an idle export screen
- WHEN the DM selects Download PDF
- THEN export controls prevent duplicate requests while quill loading is shown
- AND a successful binary download shows a success notice

#### Scenario: Rendering fails retryably
- GIVEN an export request fails to render
- WHEN the failure response is received
- THEN `ErrorNotice` offers retry and the prior selection remains intact

#### Scenario: Draft cannot be shown
- GIVEN the draft is missing or non-exportable
- WHEN the export route loads
- THEN a distinct missing/non-exportable-draft state replaces controls and preview
