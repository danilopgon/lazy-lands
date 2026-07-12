# Proposal: PDF Export

## Intent

Let a DM download the saved, edited session draft as a dependable A4 PDF. This completes the generated-session export step in the critical path (Login → Campaign → Session → Memory → Generate) without exposing private notes or making the PDF change depend on per-section regeneration.

## Scope

### In Scope
- Authenticated `GET /sessions/{session_id}/export.pdf` that validates ownership, selected persisted section IDs, and exportable content; returns a download PDF or a clear error.
- A server-owned document model, HTML/CSS template, and WeasyPrint renderer; container/runtime dependencies and a render smoke check.
- Export route, enabled navigation from the generated draft, local section selection, authenticated binary download, i18n, and tests.
- Handoff `ExportView` preview/selection/download states: ready, private-notes exclusion, exporting, success, export failure, and missing/non-exportable draft.

### Out of Scope
- Per-section regeneration, LLM prompts, regeneration-specific routes, or identifiers.
- Exporting private notes, unsaved client text, alternate formats, sharing, or print customization.
- A URL-size-driven POST export API unless later selection volume proves it necessary.

## Capabilities

### New Capabilities
- `pdf-export`: Secure, persisted-draft PDF selection, rendering, download, and export-screen behavior.

### Modified Capabilities
- None.

## Approach

Map only the persisted generic ordered `generated_content.sections[]` snapshot into a pure export document model. Apply the DM's selected IDs, retain saved bodies verbatim, and render via a WeasyPrint adapter behind the sessions resource boundary. The UI previews that same selected snapshot and requests binary bytes only on download. No code may require the unmerged regeneration branch, hard-code its section identifiers, or reconstruct legacy flat draft fields.

## Affected Areas

| Area | Impact | Description |
|---|---|---|
| `services/api/app/modules/sessions/`, `modules/export/` | New | Ownership-scoped endpoint, model, renderer port/adapter, tests |
| `services/api/pyproject.toml`, `uv.lock`, `Dockerfile` | Modified | WeasyPrint and Linux rendering runtime |
| `apps/web/app/[locale]/campaigns/[id]/sessions/[sessionId]/export/` | New | Handoff-faithful export screen |
| `apps/web/components/sessions/`, `lib/sessions/api.ts`, `messages/` | Modified | Navigation, download client, i18n, tests |

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Native PDF libraries fail in deployment | Medium | Container smoke render before merge |
| Merge coupling to regeneration | Medium | Generic ordered-list contract; no identifier logic |
| PR exceeds 800 lines | Medium | Keep renderer/API and UI composition independently reviewable; reassess in tasks |

## Rollback Plan

Revert the export route/navigation and renderer dependency together; persisted drafts remain unchanged and the prior disabled action returns.

## Dependencies

- `docs/06-api-contracts.md`; existing authenticated RLS-scoped session lookup.
- WeasyPrint plus required Debian font/Pango libraries.

## Success Criteria

- [ ] Owned, selected persisted sections download as an A4 PDF; non-owned/unknown sessions return 404.
- [ ] Private notes and unselected sections never reach preview, request payload, or PDF.
- [ ] Every required handoff state is implemented and tested without corrupt downloads or draft mutation.
