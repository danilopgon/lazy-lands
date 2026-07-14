"""Behavior tests for the persisted-session PDF export boundary."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.modules.sessions.api.dependencies import (
    provide_export_session,
    provide_pdf_renderer,
)
from app.modules.sessions.application.commands.export_session import (
    ExportSession,
    ExportSessionCommand,
)
from app.modules.sessions.application.errors import (
    ExportSelectionError,
    NonExportableSessionError,
    SessionNotFoundError,
)
from app.modules.sessions.domain.pdf_export import ExportDocument, ExportSection
from app.modules.sessions.infrastructure.pdf_renderer import WeasyPrintPdfRenderer
from app.shared.security import AuthContext, get_auth_context

FIRST_SECTION_ID = "11111111-1111-4111-8111-111111111111"
SECOND_SECTION_ID = "22222222-2222-4222-8222-222222222222"
UNKNOWN_SECTION_ID = "33333333-3333-4333-8333-333333333333"


class _SessionRepository:
    def __init__(self, session: dict[str, object] | None) -> None:
        self._session = session

    def get_session(self, session_id: str) -> dict[str, object] | None:
        assert session_id == "session-1"
        return self._session


def _persisted_session() -> dict[str, object]:
    return {
        "session_number": 8,
        "generated_content": {
            "title": "Threads in the Mine",
            "sections": [
                {
                    "id": FIRST_SECTION_ID,
                    "label": "Opening scene",
                    "body": "The mine gate is open.",
                    "origin": "scribe",
                    "private_notes": "This must never be exported.",
                    "regeneration_id": "ignored",
                },
                {
                    "id": SECOND_SECTION_ID,
                    "label": "Consequences",
                    "body": "The guild is watching.",
                    "origin": "edited",
                    "client_draft": "This must never be exported either.",
                },
            ],
            "private_notes": "The villain is secretly the mayor.",
            "legacy_synopsis": "Do not reconstruct this field.",
        },
        "private_notes": "Never read session-level private notes.",
    }


def test_export_uses_only_selected_allowlisted_persisted_fields_in_saved_order() -> (
    None
):
    document = ExportSession(_SessionRepository(_persisted_session())).execute(
        "session-1",
        ExportSessionCommand(
            selected_section_ids=(SECOND_SECTION_ID, FIRST_SECTION_ID)
        ),
    )

    assert document.title == "Threads in the Mine"
    assert document.session_number == 8
    assert [
        (section.id, section.label, section.body, section.origin)
        for section in document.sections
    ] == [
        (
            FIRST_SECTION_ID,
            "Opening scene",
            "The mine gate is open.",
            "scribe",
        ),
        (
            SECOND_SECTION_ID,
            "Consequences",
            "The guild is watching.",
            "edited",
        ),
    ]
    assert not hasattr(document, "notes")
    assert not hasattr(document.sections[0], "private_notes")


def test_export_selects_a_persisted_synopsis_section_id() -> None:
    session = _persisted_session()
    generated_content = session["generated_content"]
    assert isinstance(generated_content, dict)
    sections = generated_content["sections"]
    assert isinstance(sections, list)
    synopsis = sections[0]
    assert isinstance(synopsis, dict)
    synopsis["id"] = "synopsis"

    document = ExportSession(_SessionRepository(session)).execute(
        "session-1",
        ExportSessionCommand(selected_section_ids=("synopsis",)),
    )

    assert [section.id for section in document.sections] == ["synopsis"]


def test_export_rejects_a_persisted_draft_with_duplicate_section_ids() -> None:
    session = _persisted_session()
    generated_content = session["generated_content"]
    assert isinstance(generated_content, dict)
    sections = generated_content["sections"]
    assert isinstance(sections, list)
    duplicate = sections[1]
    assert isinstance(duplicate, dict)
    duplicate["id"] = FIRST_SECTION_ID

    with pytest.raises(NonExportableSessionError):
        ExportSession(_SessionRepository(session)).execute(
            "session-1",
            ExportSessionCommand(selected_section_ids=(FIRST_SECTION_ID,)),
        )


@pytest.mark.parametrize(
    "selected_section_ids",
    [
        (),
        (FIRST_SECTION_ID, FIRST_SECTION_ID),
        (UNKNOWN_SECTION_ID,),
    ],
)
def test_export_rejects_empty_duplicate_or_unknown_selection(
    selected_section_ids: tuple[str, ...],
) -> None:
    with pytest.raises(ExportSelectionError):
        ExportSession(_SessionRepository(_persisted_session())).execute(
            "session-1",
            ExportSessionCommand(selected_section_ids=selected_section_ids),
        )


def test_export_rejects_a_session_without_exportable_persisted_sections() -> None:
    with pytest.raises(NonExportableSessionError):
        ExportSession(
            _SessionRepository(
                {"session_number": 8, "generated_content": {"sections": []}}
            )
        ).execute(
            "session-1",
            ExportSessionCommand(selected_section_ids=(FIRST_SECTION_ID,)),
        )


def test_renderer_produces_a4_portrait_pdf_bytes_from_selected_document() -> None:
    document = ExportSession(_SessionRepository(_persisted_session())).execute(
        "session-1",
        ExportSessionCommand(selected_section_ids=(FIRST_SECTION_ID,)),
    )

    try:
        pdf = WeasyPrintPdfRenderer().render(document)
    except OSError as exc:
        pytest.skip(f"WeasyPrint native libraries are unavailable locally: {exc}")

    assert pdf.startswith(b"%PDF")
    assert len(pdf) > 1_000
    assert WeasyPrintPdfRenderer().page_size(document) == pytest.approx(
        (793.7007874015749, 1122.5196850393702)
    )


def test_renderer_template_includes_only_selected_saved_section_content() -> None:
    document = ExportSession(_SessionRepository(_persisted_session())).execute(
        "session-1",
        ExportSessionCommand(selected_section_ids=(SECOND_SECTION_ID,)),
    )

    html = WeasyPrintPdfRenderer().render_html(document)

    assert "The guild is watching." in html
    assert "The mine gate is open." not in html
    assert "Never read session-level private notes." not in html
    assert "The villain is secretly the mayor." not in html


def test_renderer_template_renders_markdown_section_body_as_formatted_html() -> None:
    session = _persisted_session()
    generated_content = session["generated_content"]
    assert isinstance(generated_content, dict)
    sections = generated_content["sections"]
    assert isinstance(sections, list)
    markdown_section = sections[0]
    assert isinstance(markdown_section, dict)
    markdown_section["body"] = "## Heading\n\n**bold** text"

    document = ExportSession(_SessionRepository(session)).execute(
        "session-1",
        ExportSessionCommand(selected_section_ids=(FIRST_SECTION_ID,)),
    )

    html = WeasyPrintPdfRenderer().render_html(document)

    assert "<h2>Heading</h2>" in html
    assert "<strong>bold</strong>" in html
    assert "##" not in html
    assert "**" not in html


def test_renderer_neutralizes_injection_payload_and_export_still_succeeds() -> None:
    session = _persisted_session()
    generated_content = session["generated_content"]
    assert isinstance(generated_content, dict)
    sections = generated_content["sections"]
    assert isinstance(sections, list)
    injected_section = sections[0]
    assert isinstance(injected_section, dict)
    injected_section["body"] = (
        "**important** notice <script>alert('x')</script> "
        '<img src=x onerror="alert(1)"> more text'
    )

    document = ExportSession(_SessionRepository(session)).execute(
        "session-1",
        ExportSessionCommand(selected_section_ids=(FIRST_SECTION_ID,)),
    )

    html = WeasyPrintPdfRenderer().render_html(document)

    assert "<script>" not in html
    assert "onerror" not in html
    assert "javascript:" not in html
    assert "<strong>important</strong>" in html

    try:
        pdf = WeasyPrintPdfRenderer().render(document)
    except OSError as exc:
        pytest.skip(f"WeasyPrint native libraries are unavailable locally: {exc}")

    assert pdf.startswith(b"%PDF")
    assert len(pdf) > 1_000


def test_renderer_renders_plain_text_body_as_identical_plain_paragraph() -> None:
    document = ExportSession(_SessionRepository(_persisted_session())).execute(
        "session-1",
        ExportSessionCommand(selected_section_ids=(FIRST_SECTION_ID,)),
    )

    html = WeasyPrintPdfRenderer().render_html(document)

    assert "<p>The mine gate is open.</p>" in html


def test_renderer_only_escapes_html_body_and_still_escapes_other_fields() -> None:
    session = _persisted_session()
    generated_content = session["generated_content"]
    assert isinstance(generated_content, dict)
    sections = generated_content["sections"]
    assert isinstance(sections, list)
    unsafe_label_section = sections[0]
    assert isinstance(unsafe_label_section, dict)
    unsafe_label_section["label"] = "<b>Opening</b>"

    document = ExportSession(_SessionRepository(session)).execute(
        "session-1",
        ExportSessionCommand(selected_section_ids=(FIRST_SECTION_ID,)),
    )

    html = WeasyPrintPdfRenderer().render_html(document)

    assert "&lt;b&gt;Opening&lt;/b&gt;" in html
    assert "<b>Opening</b>" not in html


class _ExportHandler:
    def __init__(self, result: ExportDocument | Exception) -> None:
        self._result = result

    def execute(self, session_id: str, command: ExportSessionCommand) -> ExportDocument:
        assert session_id == "11111111-1111-4111-8111-111111111111"
        assert command.selected_section_ids
        if isinstance(self._result, Exception):
            raise self._result
        return self._result


class _PdfRenderer:
    def render(self, document: ExportDocument) -> bytes:
        assert document.title == "Threads in the Mine"
        return b"%PDF-test-bytes"


def _export_document() -> ExportDocument:
    return ExportDocument(
        title="Threads in the Mine",
        session_number=8,
        sections=(
            ExportSection(
                id=FIRST_SECTION_ID,
                label="Opening scene",
                body="The mine gate is open.",
                origin="edited",
            ),
        ),
    )


def _authenticated_export_client(result: ExportDocument | Exception) -> TestClient:
    app.dependency_overrides[get_auth_context] = lambda: AuthContext(
        user_id="owner-1", access_token="owner-token"
    )
    app.dependency_overrides[provide_export_session] = lambda: _ExportHandler(result)
    app.dependency_overrides[provide_pdf_renderer] = lambda: _PdfRenderer()
    return TestClient(app)


@pytest.fixture(autouse=True)
def _clear_dependency_overrides():
    yield
    app.dependency_overrides.clear()


def test_export_route_requires_authentication() -> None:
    response = TestClient(app).get(
        "/sessions/11111111-1111-4111-8111-111111111111/export.pdf",
        params=[("section_id", str(FIRST_SECTION_ID))],
    )

    assert response.status_code == 401
    assert response.content != b"%PDF-test-bytes"


@pytest.mark.parametrize("error", [SessionNotFoundError(), SessionNotFoundError()])
def test_export_route_returns_uniform_404_for_foreign_or_unknown_session(
    error: Exception,
) -> None:
    response = _authenticated_export_client(error).get(
        "/sessions/11111111-1111-4111-8111-111111111111/export.pdf",
        params=[("section_id", str(FIRST_SECTION_ID))],
    )

    assert response.status_code == 404
    assert response.content != b"%PDF-test-bytes"


def test_export_route_returns_404_for_malformed_session_id_without_bytes() -> None:
    response = _authenticated_export_client(_export_document()).get(
        "/sessions/not-a-uuid/export.pdf",
        params=[("section_id", str(FIRST_SECTION_ID))],
    )

    assert response.status_code == 404
    assert response.content != b"%PDF-test-bytes"


@pytest.mark.parametrize(
    "params,error",
    [
        ([], ExportSelectionError()),
        ([("section_id", "not-a-uuid")], ExportSelectionError()),
        (
            [
                ("section_id", str(FIRST_SECTION_ID)),
                ("section_id", str(FIRST_SECTION_ID)),
            ],
            ExportSelectionError(),
        ),
        ([("section_id", str(FIRST_SECTION_ID))], ExportSelectionError()),
    ],
)
def test_export_route_rejects_invalid_selection_without_pdf_bytes(
    params: list[tuple[str, str]], error: Exception
) -> None:
    response = _authenticated_export_client(error).get(
        "/sessions/11111111-1111-4111-8111-111111111111/export.pdf",
        params=params,
    )

    assert response.status_code == 422
    assert response.content != b"%PDF-test-bytes"


def test_export_route_returns_409_without_bytes_for_empty_draft() -> None:
    response = _authenticated_export_client(NonExportableSessionError()).get(
        "/sessions/11111111-1111-4111-8111-111111111111/export.pdf",
        params=[("section_id", str(FIRST_SECTION_ID))],
    )

    assert response.status_code == 409
    assert response.content != b"%PDF-test-bytes"


def test_export_route_returns_private_no_store_pdf_attachment_for_owner() -> None:
    response = _authenticated_export_client(_export_document()).get(
        "/sessions/11111111-1111-4111-8111-111111111111/export.pdf",
        params=[("section_id", str(FIRST_SECTION_ID))],
    )

    assert response.status_code == 200
    assert response.content == b"%PDF-test-bytes"
    assert response.headers["content-type"] == "application/pdf"
    assert (
        response.headers["content-disposition"]
        == 'attachment; filename="session-8.pdf"'
    )
    assert response.headers["cache-control"] == "private, no-store"
