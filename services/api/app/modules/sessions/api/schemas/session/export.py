"""Query schema for persisted-session PDF exports."""

from typing import Annotated

from pydantic import BaseModel, Field

from app.modules.sessions.domain.pdf_export import DEFAULT_EXPORT_LOCALE, ExportLocale


class ExportSessionQuery(BaseModel):
    """Selected persisted section IDs and the DM's requested reading language."""

    section_id: list[Annotated[str, Field(min_length=1, max_length=200)]] = Field(
        min_length=1
    )
    # Clients shipped before localization omit this, so it must stay optional.
    locale: ExportLocale = DEFAULT_EXPORT_LOCALE
