"""Use-case tests for RegisterSession (persistence-first ordering, degrade-to-empty)."""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock

import pytest

from app.modules.sessions.application.commands.register_session import (
    RegisterSession,
    RegisterSessionCommand,
)
from app.modules.sessions.application.contracts import MemorySuggestion
from app.modules.sessions.application.errors import SessionNotFoundError

VALID_SESSION_ROW = {
    "id": "session-1",
    "session_number": 1,
    "summary": "The party arrived.",
    "consequences": None,
    "created_at": "2026-07-08T00:00:00Z",
}


def _repo_with_campaign(campaign: dict | None) -> MagicMock:
    repo = MagicMock()
    repo.get_campaign.return_value = campaign
    repo.get_next_session_number.return_value = 1
    repo.insert_session.return_value = VALID_SESSION_ROW
    return repo


@pytest.mark.asyncio
async def test_forged_campaign_id_raises_session_not_found_before_any_insert() -> None:
    repo = _repo_with_campaign(None)
    summarize = AsyncMock()
    suggest = AsyncMock()
    use_case = RegisterSession(repo, summarize, suggest)

    with pytest.raises(SessionNotFoundError):
        await use_case.execute(
            "forged-campaign", RegisterSessionCommand(summary="s", consequences=None)
        )

    repo.insert_session.assert_not_called()
    summarize.execute.assert_not_called()
    suggest.execute.assert_not_called()


@pytest.mark.asyncio
async def test_happy_path_persists_then_summarizes_then_suggests() -> None:
    repo = _repo_with_campaign({"id": "campaign-1", "accumulated_summary": None})
    summarize = AsyncMock()
    suggest = AsyncMock()
    suggestion = MemorySuggestion(
        content="The party met a smuggler.",
        type="npc",
        importance="medium",
        reason="Introduced in this session.",
    )
    suggest.execute.return_value = [suggestion]
    use_case = RegisterSession(repo, summarize, suggest)

    result = await use_case.execute(
        "campaign-1",
        RegisterSessionCommand(summary="The party arrived.", consequences=None),
    )

    assert result.session_id == "session-1"
    assert result.session_number == 1
    assert result.memory_suggestions == [suggestion]
    repo.insert_session.assert_called_once_with(
        "campaign-1", 1, "The party arrived.", None
    )
    summarize.execute.assert_awaited_once()
    suggest.execute.assert_awaited_once()


@pytest.mark.asyncio
async def test_summarize_failure_after_insert_degrades_to_empty() -> None:
    repo = _repo_with_campaign({"id": "campaign-1", "accumulated_summary": None})
    summarize = AsyncMock()
    summarize.execute.side_effect = RuntimeError("LLM exploded")
    suggest = AsyncMock()
    suggest.execute.return_value = []
    use_case = RegisterSession(repo, summarize, suggest)

    result = await use_case.execute(
        "campaign-1",
        RegisterSessionCommand(summary="The party arrived.", consequences=None),
    )

    assert result.session_id == "session-1"
    assert result.memory_suggestions == []


@pytest.mark.asyncio
async def test_suggest_failure_after_insert_degrades_to_empty_suggestions() -> None:
    repo = _repo_with_campaign({"id": "campaign-1", "accumulated_summary": None})
    summarize = AsyncMock()
    suggest = AsyncMock()
    suggest.execute.side_effect = RuntimeError("LLM exploded")
    use_case = RegisterSession(repo, summarize, suggest)

    result = await use_case.execute(
        "campaign-1",
        RegisterSessionCommand(summary="The party arrived.", consequences=None),
    )

    assert result.session_id == "session-1"
    assert result.session_number == 1
    assert result.memory_suggestions == []


@pytest.mark.asyncio
async def test_session_insert_failure_surfaces_as_session_persistence_error() -> None:
    from app.modules.sessions.application.errors import SessionPersistenceError
    from app.modules.sessions.infrastructure.errors import RepositoryError

    repo = _repo_with_campaign({"id": "campaign-1", "accumulated_summary": None})
    repo.insert_session.side_effect = RepositoryError("insert failed")
    summarize = AsyncMock()
    suggest = AsyncMock()
    use_case = RegisterSession(repo, summarize, suggest)

    with pytest.raises(SessionPersistenceError):
        await use_case.execute(
            "campaign-1",
            RegisterSessionCommand(summary="The party arrived.", consequences=None),
        )

    summarize.execute.assert_not_called()
    suggest.execute.assert_not_called()
