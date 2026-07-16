"""Server-owned value types for persisted session PDF exports."""

from dataclasses import dataclass
from typing import Literal

ExportLocale = Literal["en", "es"]

DEFAULT_EXPORT_LOCALE: ExportLocale = "en"


@dataclass(frozen=True)
class ExportSection:
    """One allowlisted saved section in a PDF document."""

    id: str
    label: str
    body: str
    origin: str


@dataclass(frozen=True)
class ExportDocument:
    """The complete, notes-free document passed to a PDF renderer.

    ``locale`` is the DM's requested reading language, not a property of the
    snapshot: section bodies are already written in the campaign's language by
    the Scribe, while labels and origin are stored as English keys and are
    localized at render time.
    """

    title: str
    session_number: int
    sections: tuple[ExportSection, ...]
    locale: ExportLocale = DEFAULT_EXPORT_LOCALE
