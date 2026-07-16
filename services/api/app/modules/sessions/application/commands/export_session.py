"""ExportSession — assemble a PDF-safe document from a saved session snapshot."""

from dataclasses import dataclass
from typing import Any

from pydantic import ValidationError

from app.modules.sessions.application.contracts import PersistedExportDraft
from app.modules.sessions.application.errors import (
    ExportSelectionError,
    NonExportableSessionError,
    SessionNotFoundError,
)
from app.modules.sessions.domain.pdf_export import (
    DEFAULT_EXPORT_LOCALE,
    ExportDocument,
    ExportLocale,
    ExportSection,
)
from app.modules.sessions.domain.ports import SessionRepository


@dataclass(frozen=True)
class ExportSessionCommand:
    """The selection and reading language supplied by the query boundary."""

    selected_section_ids: tuple[str, ...]
    locale: ExportLocale = DEFAULT_EXPORT_LOCALE


class ExportSession:
    """Build an export document from only caller-visible persisted content."""

    def __init__(self, repository: SessionRepository) -> None:
        """Initialize with the caller-RLS-scoped session repository."""
        self._repository = repository

    def execute(self, session_id: str, command: ExportSessionCommand) -> ExportDocument:
        """Validate a saved snapshot and select its sections in persisted order."""
        row = self._repository.get_session(session_id)
        if row is None:
            raise SessionNotFoundError()

        draft = _persisted_draft(row.get("generated_content"))
        selected_ids = command.selected_section_ids
        _validate_selection(selected_ids, draft)
        selected = set(selected_ids)

        return ExportDocument(
            title=draft.title,
            session_number=_session_number(row),
            sections=tuple(
                ExportSection(
                    id=section.id,
                    label=section.label,
                    body=section.body,
                    origin=section.origin,
                )
                for section in draft.sections
                if section.id in selected
            ),
            locale=command.locale,
        )


def _persisted_draft(value: object) -> PersistedExportDraft:
    if not isinstance(value, dict):
        raise NonExportableSessionError()
    try:
        draft = PersistedExportDraft.model_validate(value)
    except ValidationError as exc:
        raise NonExportableSessionError() from exc
    if len(draft.sections) != len({section.id for section in draft.sections}):
        raise NonExportableSessionError()
    return draft


def _session_number(row: dict[str, Any]) -> int:
    value = row.get("session_number")
    if not isinstance(value, int) or value < 1:
        raise NonExportableSessionError()
    return value


def _validate_selection(
    selected_ids: tuple[str, ...], draft: PersistedExportDraft
) -> None:
    if not selected_ids or len(selected_ids) != len(set(selected_ids)):
        raise ExportSelectionError("Select one or more unique saved sections.")
    available_ids = {section.id for section in draft.sections}
    if not set(selected_ids).issubset(available_ids):
        raise ExportSelectionError("Selected sections are not available in this draft.")
