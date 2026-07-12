# Tasks: PDF Export

## Review Workload Forecast

| Field | Value |
|---|---|
| Estimated changed lines | 1,050–1,400 authored lines |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | command/renderer/route → export UI |
| Delivery strategy | chained-pr |
| Chain strategy | stacked-to-main |

Decision needed before apply: No — user selected stacked-to-main.
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|---|---|---|---|---|---|
| 1 | Secure command, renderer, and route | stacked PR 1 → `main` | `uv run pytest tests/sessions/test_pdf_export.py` (from `services/api`) | `docker build -t lazy-lands-api-pdf-export services/api` then `docker run --rm --entrypoint uv lazy-lands-api-pdf-export run python scripts/pdf_render_smoke.py` | API, renderer, image dependencies |
| 2 | Localized export UI | fallback 2 | `pnpm --filter web test -- tests/sessions/api.test.ts tests/sessions/session-export-view.test.tsx` | `pnpm --filter web dev`: verify an owned draft download | export route, UI, client, messages |

## Phase 1: Backend document boundary

- [x] 1.1 **RED** — Add `services/api/tests/sessions/test_pdf_export.py`: allowlisted persisted fields/order, arbitrary IDs, no notes, and empty/duplicate/unknown selections.
- [x] 1.2 **GREEN** — Modify `services/api/app/modules/sessions/application/contracts.py` and `services/api/app/modules/sessions/domain/ports.py`; create `services/api/app/modules/sessions/domain/pdf_export.py` and `services/api/app/modules/sessions/application/commands/export_session.py` for generic persisted sections only—no notes, client prose, legacy fields, or regeneration IDs.
- [x] 1.3 **REFACTOR/VERIFY** — Simplify the command seams; run `uv run pytest tests/sessions/test_pdf_export.py` from `services/api`.

## Phase 2: Renderer and deployment runtime

- [x] 2.1 **RED** — Extend `services/api/tests/sessions/test_pdf_export.py` with selected-content, `%PDF`, non-empty-byte, and A4-portrait renderer/smoke assertions; the image smoke must initially fail.
- [x] 2.2 **GREEN** — Create `services/api/app/modules/sessions/infrastructure/pdf_renderer.py`, `services/api/app/modules/sessions/infrastructure/templates/session_export.html.jinja`, and `services/api/scripts/pdf_render_smoke.py`; modify `services/api/{pyproject.toml,uv.lock,Dockerfile}` for autoescaped WeasyPrint A4 rendering and Linux libraries.
- [x] 2.3 **REFACTOR/VERIFY** — Build and smoke the production image with the Unit 1 command; record whether CI supports that harness.

## Phase 3: Secure PDF endpoint

- [x] 3.1 **RED** — Extend `services/api/tests/sessions/test_pdf_export.py`: 401; malformed/foreign/unknown 404; UUID/empty/duplicate/unknown selections 422 without bytes; empty draft 409 without bytes; owner attachment with PDF and private/no-store headers.
- [x] 3.2 **GREEN** — Create `services/api/app/modules/sessions/api/schemas/session/export.py`; modify `services/api/app/modules/sessions/api/{routes.py,dependencies.py,exception_handlers.py}` and `services/api/app/main.py` for caller-RLS-scoped, thread-pooled `GET /sessions/{session_id}/export.pdf`.
- [x] 3.3 **REFACTOR/VERIFY** — Consolidate route fixtures/error mapping; run `uv run pytest tests/sessions/test_pdf_export.py` from `services/api`.

## Phase 4: Download client

- [ ] 4.1 **RED** — Extend `apps/web/tests/sessions/api.test.ts` for repeated IDs-only queries, failed Blob responses, and object-URL lifecycle.
- [ ] 4.2 **GREEN** — Update `apps/web/lib/sessions/{api.ts,schemas.ts}` for typed download and persisted-section mapping.
- [ ] 4.3 **REFACTOR/VERIFY** — Keep the browser boundary narrow; run `pnpm --filter web test -- tests/sessions/api.test.ts`.

## Phase 5: Handoff-faithful export screen

- [ ] 5.1 **RED** — Create `apps/web/tests/sessions/session-export-view.test.tsx`: ready/toggle; private exclusion; exporting/quill/duplicate prevention; success; retryable preserved selection; missing replacement; selected-only preview/request, `OriginBadge`, and motion gates.
- [ ] 5.2 **GREEN** — Create `apps/web/app/[locale]/campaigns/[id]/sessions/[sessionId]/export/page.tsx` and `apps/web/components/sessions/session-export-view.tsx`; modify `apps/web/components/sessions/generated-session-view.tsx` and `apps/web/messages/{en,es}.json` for the localized handoff checklist.
- [ ] 5.3 **REFACTOR/VERIFY** — Run `pnpm --filter web test -- tests/sessions/session-export-view.test.tsx`; issue the handoff report with ready, private, exporting, success, failure, and missing enumerated separately.

## Phase 6: Integration gate

- [ ] 6.1 Run backend/frontend tests, lint/typecheck, and format checks; retain focused-command and runtime-harness results per unit.
- [ ] 6.2 Keep the renderer/API/image and UI as independently revertible `stacked-to-main` slices; no size exception is authorized.
