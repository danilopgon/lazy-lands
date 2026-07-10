"""Tests for SupabaseGenerationRepository persistence hardening."""

from __future__ import annotations

from unittest.mock import MagicMock

import pytest
from postgrest import APIError

from app.modules.generation.infrastructure.repository import (
    SupabaseGenerationRepository,
)
from app.modules.sessions.infrastructure.errors import RepositoryError

_UNIQUE_VIOLATION = APIError(
    {
        "message": (
            "duplicate key value violates unique constraint "
            '"sessions_campaign_id_session_number_key"'
        ),
        "code": "23505",
        "hint": None,
        "details": None,
    }
)


def _session_data() -> dict[str, object]:
    return {
        "summary": "The party follows the arcane core clue.",
        "consequences": None,
        "generated_content": {
            "sections": [
                {
                    "id": "synopsis",
                    "label": "Synopsis",
                    "body": "Draft.",
                    "origin": "scribe",
                }
            ],
            "continuity_links": [{"memory_fact_id": "mem-1", "relevance": "Payoff."}],
        },
        "trace_json": {"error_code": None},
    }


def test_create_generated_session_raises_after_exhausting_number_conflicts() -> None:
    client = MagicMock()
    number_query = (
        client.table.return_value.select.return_value.eq.return_value.order.return_value
    )
    number_query.limit.return_value.execute.return_value = MagicMock(
        data=[{"session_number": 7}]
    )
    client.table.return_value.insert.return_value.execute.side_effect = (
        _UNIQUE_VIOLATION
    )
    repo = SupabaseGenerationRepository(client)

    with pytest.raises(RepositoryError):
        repo.create_generated_session("campaign-1", _session_data())

    assert number_query.limit.return_value.execute.call_count == 5
    assert client.table.return_value.insert.return_value.execute.call_count == 5


def test_insert_generated_session_persists_full_generated_content() -> None:
    client = MagicMock()
    client.table.return_value.insert.return_value.execute.return_value = MagicMock(
        data=[{"id": "session-1", "session_number": 8}]
    )
    repo = SupabaseGenerationRepository(client)

    row = repo.insert_generated_session("campaign-1", 8, _session_data())

    inserted = client.table.return_value.insert.call_args[0][0]
    assert row == {"id": "session-1", "session_number": 8}
    assert inserted["generated_content"]["continuity_links"] == [
        {"memory_fact_id": "mem-1", "relevance": "Payoff."}
    ]
