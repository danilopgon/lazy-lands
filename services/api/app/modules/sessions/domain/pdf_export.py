"""Server-owned value types for persisted session PDF exports."""

from dataclasses import dataclass


@dataclass(frozen=True)
class ExportSection:
    """One allowlisted saved section in a PDF document."""

    id: str
    label: str
    body: str
    origin: str


@dataclass(frozen=True)
class ExportDocument:
    """The complete, notes-free document passed to a PDF renderer."""

    title: str
    session_number: int
    sections: tuple[ExportSection, ...]
