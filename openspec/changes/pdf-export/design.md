# Design: PDF Export

## Technical Approach

Add authenticated `GET /sessions/{session_id}/export.pdf`. The sessions API validates UUID IDs and delegates inward to an application command, which reads the caller-RLS-scoped persisted `generated_content.sections[]`, selects by ID, preserves persisted order, and renders A4 bytes through WeasyPrint. The browser previews that snapshot and sends IDs only.

## Architecture Decisions

| Decision | Choice | Alternative / rationale |
|---|---|---|
| Boundary | Keep export in sessions: api → application → domain port ← infrastructure | A new module duplicates ownership. The injected per-user repository retains uniform RLS 404s. |
| Models | Add export Pydantic contracts to existing `application/contracts.py`; place domain document types in new `domain/pdf_export.py` | **Do not** create `application/contracts/export.py`: `contracts.py` is a module, so that path conflicts without an unjustified package refactor. |
| Renderer | Static Jinja/CSS + WeasyPrint adapter, called in FastAPI's thread pool | Browser rendering can export client state; subprocess renderers add a process boundary. Autoescaping and no remote assets protect persisted prose. |
| Selection/privacy | Accept repeated `section_id` query parameters only; document has no notes field | Client prose, unsaved edits, legacy flat fields, regeneration IDs, and private notes cannot enter preview/request/PDF. |

## Data Flow

```text
Export page ─GET /sessions/{id}─> RLS snapshot ─> local selected IDs
Download ─GET /sessions/{id}/export.pdf?section_id=…─> ExportSession
  └─ RLS repository → ExportDocument → PdfRenderer → PDF attachment
```

Malformed, unknown, and foreign session IDs return 404. Empty, duplicate, or unknown selection returns 422; absent/empty draft returns 409 without bytes. Headers are `application/pdf`, attachment `session-{number}.pdf`, and `Cache-Control: private, no-store`.

## File Changes

| File | Action | Description |
|---|---|---|
| `services/api/app/modules/sessions/application/contracts.py` | Modify | Add validated persisted-section/export contracts; retains its existing module form. |
| `services/api/app/modules/sessions/domain/{pdf_export.py,ports.py}` | Create/Modify | Document value types and `PdfRenderer` port. |
| `services/api/app/modules/sessions/application/commands/export_session.py` | Create | Validate persisted snapshot and assemble ordered document. |
| `services/api/app/modules/sessions/infrastructure/{pdf_renderer.py,templates/session_export.html.jinja}` | Create | WeasyPrint adapter and static A4 template. |
| `services/api/app/modules/sessions/api/{routes.py,dependencies.py,exception_handlers.py,schemas/session/export.py}` | Modify/Create | Query DTO, binary route, wiring, typed 409 mapping. |
| `services/api/app/main.py`, `services/api/{pyproject.toml,uv.lock,Dockerfile,scripts/pdf_render_smoke.py}` | Modify/Create | Register error; add WeasyPrint/Linux libraries and image-contained smoke script. |
| `apps/web/app/[locale]/campaigns/[id]/sessions/[sessionId]/export/page.tsx` | Create | Export route composition. |
| `apps/web/components/sessions/{generated-session-view.tsx,session-export-view.tsx}` | Modify/Create | Enable navigation and handoff-faithful selector/preview. |
| `apps/web/lib/sessions/{api.ts,schemas.ts}`, `apps/web/messages/{en,es}.json` | Modify | IDs-only binary download and localized copy. |
| `services/api/tests/sessions/test_pdf_export.py`, `apps/web/tests/sessions/{api.test.ts,session-export-view.test.tsx}` | Create/Modify | RED behavior/state tests. |

## Interfaces / Contracts

```python
class ExportDocument:
    title: str
    session_number: int
    sections: tuple[ExportSection, ...]

class PdfRenderer(Protocol):
    def render(self, document: ExportDocument) -> bytes: ...
```

The query DTO is `section_id: list[UUID]`; no request body. The Blob helper checks `response.ok`, then creates and revokes its object URL.

### Handoff Acceptance Checklist

- Ready: Shell, breadcrumb/back, Kicker/header, saved-edited/private notice, 280px selector plus preview, selected count/A4/footer.
- Private-notes exclusion: disabled unchecked “Private DM notes / Never exported”; never previewed, requested, or rendered.
- Exporting: disabled controls and `LoadingScribe` quill (“Pressing the pages”).
- Success: `ScribeNotice` with filename; selection remains.
- Failure: retryable `ErrorNotice`; selection and draft remain.
- Missing/non-exportable: replaces controls/preview and provides back-to-edit.
- Use OriginBadge, tokens, `llg` 900px collapse, press physics, full/subtle/off and reduced-motion gates; localize copy.

## Testing Strategy

| Layer | What to Test | Approach |
|---|---|---|
| Backend unit | order, IDs, no notes, empty/duplicate/unknown selection | RED command tests with arbitrary IDs. |
| Backend route | 401; malformed/foreign/unknown 404; 422; 409; headers/bytes | TestClient with caller-scoped fake repository/renderer. |
| Frontend | IDs-only download, Blob failure, each handoff state | Vitest/RTL; assert private prose never reaches fetch. |
| Runtime | non-empty `%PDF`, A4 metadata | Build production image and execute `scripts/pdf_render_smoke.py` inside it. |

## Threat Matrix

HTTP routing is applicable: RED tests prove auth, uniform 404, UUID/selection validation, no-byte failures, and private/no-store attachment responses. No shell, subprocess, VCS, PR, or executable-classification boundary is introduced.

| Boundary | Applicability | Design response / planned RED tests |
|---|---|---|
| Documentation-like paths | N/A — no executable classification | None |
| Git repository selection | N/A — no VCS command | None |
| Commit state | N/A — no commit operation | None |
| Push state | N/A — no push operation | None |
| PR commands | N/A — no PR/process integration | None |

## Migration / Rollout

No migration. Gate the enabled draft link on dependency/image smoke coverage; rollback route, navigation, dependency, and Linux packages together. Persisted drafts remain unchanged.

## Open Questions

- [ ] Confirm CI can run the production-image smoke command.
