# Exploration: PDF export

## Current State

`main` already persists generated drafts in `sessions.generated_content` and exposes them through authenticated, RLS-scoped `GET /sessions/{session_id}`. The current generated-session UI keeps `Export PDF →` disabled; no export route, PDF renderer, or PDF dependency exists. The initial schema needs no migration: it already stores `campaign_id`, `session_number`, `generated_content`, and timestamps.

The unmerged `feat/per-section-regeneration` branch defines the target seven-section contract: `synopsis`, `goal`, `opening`, `beats`, `encounters`, `factions`, and `arcs`, each persisted as `{ id, label, body, origin }`. Its export finding is sound: the handoff export preview consumes only `sections[].label` and `sections[].body`. PDF therefore does not need regeneration routes or LLM prompts. To merge safely before that branch, PDF must render the persisted ordered section list generically and preserve legacy draft compatibility; it must not hard-code the seven identifiers or derive content from Block 8's obsolete flat fields.

## Affected Areas

- `services/api/app/modules/sessions/` — owns caller-scoped session lookup and is the appropriate resource boundary for `GET /sessions/{session_id}/export.pdf`.
- `services/api/app/modules/export/` or `sessions/application/` — needs a pure document model and HTML/CSS-to-PDF renderer port; keeping renderer infrastructure outside HTTP routes preserves the Clean Architecture boundary.
- `services/api/app/main.py` — router/exception wiring if export is a dedicated module.
- `services/api/pyproject.toml`, `uv.lock`, `services/api/Dockerfile` — WeasyPrint dependency plus Debian runtime libraries (Pango/font-related packages) and a deploy-time render smoke check.
- `apps/web/app/[locale]/campaigns/[id]/sessions/[sessionId]/export/page.tsx` — new locale-aware export preview route.
- `apps/web/components/sessions/generated-session-view.tsx` — replace only the disabled export action with navigation to the export route.
- `apps/web/components/sessions/*`, `apps/web/lib/sessions/api.ts`, `apps/web/messages/en.json`, `apps/web/messages/es.json` — preview interaction, authenticated binary download, i18n, and tests.
- `handoff/app/views-export.jsx`, `handoff/app/ui.jsx` — mandatory visual reference for the export screen and its `Shell`, `Kicker`, `Loading`, `ErrorNotice`, and `ScribeNotice` behavior.

## Stable Contract Boundary

The export input is a persisted, DM-visible draft snapshot, not an LLM response and not a regeneration concern:

```text
ExportableSession = {
  campaign_title: string,
  session_number: integer,
  generated_content: {
    title: string,
    sections: Array<{ id: string, label: string, body: string, origin: "scribe" | "edited" }>
  }
}
```

- The export service MUST use the saved section bodies verbatim, in persisted order, after applying the DM's include/exclude selection.
- It MUST exclude private DM notes. They are frontend-only in the current MVP and must never enter the API request or PDF renderer.
- It MUST accept the target seven sections without identifier-specific rendering. This permits independent merge now and makes the seven-section branch an additive producer upgrade rather than a dependency.
- It MUST reject missing/empty `generated_content` or an empty selected-section list with a clear export error; it MUST not create a partial/corrupt download.
- Authorization remains at the existing per-user Supabase/RLS session lookup. A non-owned or unknown session returns the same 404 as `GET /sessions/{id}`.

## Handoff Checklist: ExportView

- [ ] Breadcrumb: Campaigns / campaign / Session draft / Export; back action is `← Back to editing`.
- [ ] Header copy: `Session {number} · Export`, `Take it to the table`, and notice that the edited version exports while private notes stay out.
- [ ] Include panel lists every persisted section with checked-by-default checkbox, label, and edited marker; private notes are a disabled unchecked row marked `Never exported`.
- [ ] Count/format metadata reports included versus total sections, A4 portrait, and estimated pages.
- [ ] Preview uses the selected sections only: title, campaign/session/DM metadata, section headings, paragraph and bullet treatment, then the Lazy Lands DM-edited footer.
- [ ] Layout is a 280px controls column plus preview at desktop and one column at <=900px; use Print Chronicle tokens, hard borders/shadows, zero radius, and existing button press physics.
- [ ] Shared behavior uses `Shell`, `Kicker`, `Loading`, `ErrorNotice`, and `ScribeNotice` equivalents already established in production.
- [ ] Motion uses page entrance, button press feedback, and the quill during export; respect `data-motion` and reduced-motion settings.

### Expected States and Interactions

- **Ready/preview:** all sections selected initially; toggling a checkbox immediately recalculates count and preview; edited sections show the provenance mark.
- **Private-notes exclusion:** disabled unchecked checkbox; it cannot be enabled and private text is absent from preview and download request.
- **Exporting:** `Download PDF` becomes `Exporting…`; preview is replaced by a bordered `Loading` takeover with `Pressing the pages` / `Rendering your edited session to PDF` and animated quill; duplicate downloads are disabled.
- **Success:** binary PDF download completes; `ScribeNotice` confirms the filename; selected content and draft remain unchanged.
- **Export failure:** `ErrorNotice` says the PDF failed to render, the session draft is untouched, and offers `Try exporting again`; selections remain intact and no corrupt file is offered.
- **Missing/non-exportable draft:** an explicit error/empty state is required because the handoff assumes generated sections; no request should produce a blank PDF.

## Approaches

1. **FastAPI + WeasyPrint from a server-owned HTML template** — render a constrained print document to in-memory PDF bytes and return a streamed/download response.
   - Pros: no browser runtime or separate rendering service; template/CSS is testable; WeasyPrint supports in-memory bytes and CSS/font configuration.
   - Cons: Python slim image needs Pango/font-related native packages; print CSS is a new backend rendering concern.
   - Effort: Medium.

2. **FastAPI invokes Playwright to print HTML** — use Chromium rendering for the PDF.
   - Pros: browser-grade CSS parity with the web preview.
   - Cons: adds a large browser/runtime install to the API image, operational complexity, and a heavier cold-start footprint for a small table document.
   - Effort: High.

3. **Client-side print/download from the preview** — render browser HTML and rely on print APIs.
   - Pros: avoids backend PDF infrastructure.
   - Cons: cannot guarantee a PDF download or a stable A4 document across browsers; weakens the API contract and the explicit export-failure behavior.
   - Effort: Low initially, unsuitable for the product requirement.

## Recommendation

Use a server-owned HTML template and WeasyPrint behind a small export renderer port, exposed as `GET /sessions/{session_id}/export.pdf` with repeated selected section IDs as query parameters (or a bounded POST only if URL-size constraints later require it). The frontend should retain selection locally, show the faithful handoff preview, and trigger an authenticated binary request only on Download. The service must build its document model solely from the persisted draft, so it can merge independently to `main` and subsequently consume the seven-section producer unchanged.

First implementation slice: backend contract and renderer seam — failing tests for ownership/404, missing draft, selection validation, content type/disposition, private-note absence, and PDF bytes; then the document-model mapper, WeasyPrint adapter, endpoint, dependency/container update, and Docker render smoke check. This isolates the native-runtime risk before the UI route. The follow-up UI slice is bounded to export route/preview, enabled navigation, download handling, i18n, and handoff-state tests.

## Risks

- WeasyPrint needs Linux native rendering libraries in `python:3.12-slim`; CI passing without a container render test would not prove Railway/runtime readiness.
- `main` still contains legacy three-section drafts while the regeneration branch writes seven. Identifier-specific export code would make merge order unsafe; generic persisted-section rendering avoids that coupling.
- The backend must not accept arbitrary draft text from the client as export input, or private notes and unsaved edits could bypass the persisted-DM-version guarantee.
- A single PR may approach the 800-line review budget once renderer tests, Docker changes, preview UI, localization, and handoff states are included. Keep the backend seam and UI composition independently reviewable; reassess in `sdd-tasks` before apply.

## Ready for Proposal

Yes. Tell the user that PDF export can merge independently provided the proposed renderer consumes only the persisted generic section list, preserves legacy-read behavior, and does not wait for or duplicate per-section regeneration.
