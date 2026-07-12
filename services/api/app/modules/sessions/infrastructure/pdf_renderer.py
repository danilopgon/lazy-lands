"""WeasyPrint adapter for server-owned session export documents."""

from pathlib import Path

from jinja2 import Environment, FileSystemLoader, select_autoescape

from app.modules.sessions.domain.pdf_export import ExportDocument

_TEMPLATE_DIRECTORY = Path(__file__).with_name("templates")


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
        return self._templates.get_template("session_export.html.jinja").render(
            document=document
        )
