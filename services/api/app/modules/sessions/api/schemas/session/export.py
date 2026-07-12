"""Query schema for persisted-session PDF exports."""

from typing import Annotated

from pydantic import BaseModel, Field


class ExportSessionQuery(BaseModel):
    """Selected persisted section IDs from repeated query parameters."""

    section_id: list[Annotated[str, Field(min_length=1, max_length=200)]] = Field(
        min_length=1
    )
