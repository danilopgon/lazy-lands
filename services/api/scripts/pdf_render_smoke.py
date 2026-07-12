"""Verify that the production image renders a representative A4 PDF."""

import sys
from pathlib import Path
from uuid import UUID

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.modules.sessions.domain.pdf_export import ExportDocument, ExportSection
from app.modules.sessions.infrastructure.pdf_renderer import WeasyPrintPdfRenderer

_A4_WIDTH_PX = 793.7007874015749
_A4_HEIGHT_PX = 1122.5196850393702


def main() -> None:
    """Render representative persisted content and validate portable PDF bytes."""
    document = ExportDocument(
        title="Threads in the Mine",
        session_number=8,
        sections=(
            ExportSection(
                id=UUID("11111111-1111-4111-8111-111111111111"),
                label="Opening scene",
                body="The mine gate is open.",
                origin="edited",
            ),
        ),
    )
    renderer = WeasyPrintPdfRenderer()
    pdf = renderer.render(document)
    width, height = renderer.page_size(document)
    if (
        not pdf.startswith(b"%PDF")
        or len(pdf) <= 1_000
        or abs(width - _A4_WIDTH_PX) > 0.001
        or abs(height - _A4_HEIGHT_PX) > 0.001
    ):
        raise SystemExit("PDF renderer did not produce a non-empty A4 portrait document")


if __name__ == "__main__":
    main()
