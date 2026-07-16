"""WeasyPrint adapter for server-owned session export documents."""

from dataclasses import dataclass
from pathlib import Path

from jinja2 import Environment, FileSystemLoader, select_autoescape

from app.modules.sessions.domain.pdf_export import (
    ExportDocument,
    ExportLocale,
    ExportSection,
)
from app.modules.sessions.infrastructure.export_labels import (
    origin_label,
    page_footer,
    section_label,
)
from app.modules.sessions.infrastructure.markdown_html import markdown_to_safe_html

_TEMPLATE_DIRECTORY = Path(__file__).with_name("templates")


@dataclass(frozen=True)
class _RenderSection:
    """Render-time view of an ``ExportSection``, localized and HTML-sanitized."""

    id: str
    label: str
    body: str
    origin: str
    html_body: str
    heading: str
    origin_text: str


def _to_render_section(section: ExportSection, locale: ExportLocale) -> _RenderSection:
    """Build a localized render-time view carrying a sanitized HTML body."""
    return _RenderSection(
        id=section.id,
        label=section.label,
        body=section.body,
        origin=section.origin,
        html_body=markdown_to_safe_html(section.body),
        heading=section_label(section.id, section.label, locale),
        origin_text=origin_label(section.origin, locale),
    )


class WeasyPrintPdfRenderer:
    """Render an ``ExportDocument`` with a local, autoescaped HTML template."""

    def __init__(self) -> None:
        """Initialize the local-only autoescaped template environment."""
        self._templates = Environment(
            loader=FileSystemLoader(_TEMPLATE_DIRECTORY),
            autoescape=select_autoescape(default_for_string=True, default=True),
        )

    def render(self, document: ExportDocument) -> bytes:
        """Render the selected persisted content into PDF bytes."""
        from weasyprint import HTML

        return HTML(string=self.render_html(document)).write_pdf()

    def page_size(self, document: ExportDocument) -> tuple[float, float]:
        """Return the rendered first-page dimensions in CSS pixels."""
        from weasyprint import HTML

        page = HTML(string=self.render_html(document)).render().pages[0]
        return page.width, page.height

    def render_html(self, document: ExportDocument) -> str:
        """Render the local template for a server-owned document value."""
        render_sections = tuple(
            _to_render_section(section, document.locale)
            for section in document.sections
        )
        return self._templates.get_template("session_export.html.jinja").render(
            document=document,
            sections=render_sections,
            footer=page_footer(document.session_number, document.locale),
        )
