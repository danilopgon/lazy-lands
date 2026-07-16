"""Behavior tests for the localized session export document.

The export renders persisted labels, which are always English (the server
overwrites them from ``CANONICAL_SECTION_LABELS`` at generation time). The web
UI hides this by localizing off ``section.id``; the server-side PDF did not, so
a Spanish campaign exported with English headings.
"""

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
from app.modules.sessions.domain.pdf_export import ExportDocument, ExportSection
from app.modules.sessions.infrastructure.pdf_renderer import WeasyPrintPdfRenderer
from app.shared.security import AuthContext, get_auth_context

RETIRED_SECTION_ID = "legacy-consequences"


class _SessionRepository:
    def __init__(self, session: dict[str, object]) -> None:
        self._session = session

    def get_session(self, session_id: str) -> dict[str, object] | None:
        assert session_id == "session-1"
        return self._session


def _canonical_session() -> dict[str, object]:
    """A snapshot whose section ids are the canonical ones production stores."""
    return {
        "session_number": 8,
        "generated_content": {
            "title": "Hilos en la mina",
            "sections": [
                {
                    "id": "opening",
                    "label": "Opening scene",
                    "body": "La puerta de la mina esta abierta.",
                    "origin": "scribe",
                },
                {
                    "id": "beats",
                    "label": "Main beats",
                    "body": "El gremio observa.",
                    "origin": "edited",
                },
            ],
        },
    }


def _render(locale: str, *, section_ids: tuple[str, ...] = ("opening", "beats")) -> str:
    document = ExportSession(_SessionRepository(_canonical_session())).execute(
        "session-1",
        ExportSessionCommand(selected_section_ids=section_ids, locale=locale),
    )
    return WeasyPrintPdfRenderer().render_html(document)


def test_export_renders_english_section_labels_for_the_en_locale() -> None:
    html = _render("en")

    assert "Opening scene" in html
    assert "Main beats" in html


def test_export_renders_spanish_section_labels_for_the_es_locale() -> None:
    html = _render("es")

    assert "Escena inicial" in html
    assert "Momentos clave" in html
    assert "Opening scene" not in html


def test_export_localizes_the_origin_attribution() -> None:
    assert "Escriba" in _render("es")
    assert "Editado por ti" in _render("es")
    assert "Scribe" in _render("en")
    assert "Edited by you" in _render("en")


def test_export_never_leaks_the_raw_origin_enum() -> None:
    """The persisted enum is a storage value, not DM-facing copy."""
    for locale in ("en", "es"):
        html = _render(locale)
        assert ">scribe<" not in html
        assert ">edited<" not in html


def test_export_sets_the_document_language_attribute_from_the_locale() -> None:
    """WeasyPrint uses ``lang`` for hyphenation and text shaping."""
    assert '<html lang="es">' in _render("es")
    assert '<html lang="en">' in _render("en")


def test_export_localizes_the_page_footer() -> None:
    assert "Sesion 8 editada por el DM" in _render("es")
    assert "DM-edited session 8" in _render("en")


def test_export_defaults_to_english_when_no_locale_is_supplied() -> None:
    document = ExportDocument(
        title="Threads",
        session_number=8,
        sections=(
            ExportSection(
                id="opening", label="Opening scene", body="Gate.", origin="scribe"
            ),
        ),
    )

    html = WeasyPrintPdfRenderer().render_html(document)

    assert "Opening scene" in html


def test_export_falls_back_to_the_persisted_label_for_an_unknown_section_id() -> None:
    """Retired ids have no canonical translation; the snapshot's own label is
    the only truthful source, exactly as the web UI's fallback behaves."""
    session = _canonical_session()
    content = session["generated_content"]
    assert isinstance(content, dict)
    sections = content["sections"]
    assert isinstance(sections, list)
    retired = sections[0]
    assert isinstance(retired, dict)
    retired["id"] = RETIRED_SECTION_ID
    retired["label"] = "Consequences"

    document = ExportSession(_SessionRepository(session)).execute(
        "session-1",
        ExportSessionCommand(selected_section_ids=(RETIRED_SECTION_ID,), locale="es"),
    )
    html = WeasyPrintPdfRenderer().render_html(document)

    assert "Consequences" in html


def test_fallback_label_is_still_autoescaped() -> None:
    """The fallback path renders persisted text, so it stays untrusted."""
    session = _canonical_session()
    content = session["generated_content"]
    assert isinstance(content, dict)
    sections = content["sections"]
    assert isinstance(sections, list)
    retired = sections[0]
    assert isinstance(retired, dict)
    retired["id"] = RETIRED_SECTION_ID
    retired["label"] = "<b>Consequences</b>"

    document = ExportSession(_SessionRepository(session)).execute(
        "session-1",
        ExportSessionCommand(selected_section_ids=(RETIRED_SECTION_ID,), locale="es"),
    )
    html = WeasyPrintPdfRenderer().render_html(document)

    assert "&lt;b&gt;Consequences&lt;/b&gt;" in html
    assert "<b>Consequences</b>" not in html


class _ExportHandler:
    def __init__(self) -> None:
        self.received: ExportSessionCommand | None = None

    def execute(self, session_id: str, command: ExportSessionCommand) -> ExportDocument:
        self.received = command
        return ExportDocument(
            title="Threads",
            session_number=8,
            sections=(
                ExportSection(
                    id="opening", label="Opening scene", body="Gate.", origin="scribe"
                ),
            ),
            locale=command.locale,
        )


class _StubRenderer:
    def render(self, document: ExportDocument) -> bytes:
        return b"%PDF-1.7 stub"


@pytest.fixture
def handler() -> _ExportHandler:
    return _ExportHandler()


@pytest.fixture
def client(handler: _ExportHandler):
    app.dependency_overrides[get_auth_context] = lambda: AuthContext(
        user_id="owner-1", access_token="owner-token"
    )
    app.dependency_overrides[provide_export_session] = lambda: handler
    app.dependency_overrides[provide_pdf_renderer] = lambda: _StubRenderer()
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


SESSION_UUID = "44444444-4444-4444-8444-444444444444"


def test_route_forwards_the_requested_locale_to_the_use_case(
    client: TestClient, handler: _ExportHandler
) -> None:
    response = client.get(
        f"/sessions/{SESSION_UUID}/export.pdf?section_id=opening&locale=es"
    )

    assert response.status_code == 200
    assert handler.received is not None
    assert handler.received.locale == "es"


def test_route_defaults_to_english_for_clients_that_send_no_locale(
    client: TestClient, handler: _ExportHandler
) -> None:
    """Already-shipped clients omit the parameter and must keep working."""
    response = client.get(f"/sessions/{SESSION_UUID}/export.pdf?section_id=opening")

    assert response.status_code == 200
    assert handler.received is not None
    assert handler.received.locale == "en"


def test_route_rejects_an_unsupported_locale(client: TestClient) -> None:
    response = client.get(
        f"/sessions/{SESSION_UUID}/export.pdf?section_id=opening&locale=fr"
    )

    assert response.status_code == 422
