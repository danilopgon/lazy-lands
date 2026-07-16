"""Use-case tests for CompleteSession (updates an existing row, never inserts)."""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock

import pytest

from app.modules.sessions.application.commands.complete_session import (
    CompleteSession,
    CompleteSessionCommand,
)
from app.modules.sessions.application.contracts import MemorySuggestion
from app.modules.sessions.application.errors import (
    SessionAlreadyRegisteredError,
    SessionNotFoundError,
    SessionPersistenceError,
)
from app.modules.sessions.infrastructure.errors import RepositoryError

GENERATED_SESSION_ROW = {
    "id": "session-1",
    "campaign_id": "campaign-1",
    "session_number": 3,
    "summary": "The synopsis the Scribe proposed.",
    "consequences": None,
    "generated_content": {"title": "The Sunken Vault", "sections": []},
    "status": "draft",
    "created_at": "2026-07-08T00:00:00Z",
}

COMPLETED_SESSION_ROW = {
    **GENERATED_SESSION_ROW,
    "summary": "The party actually burned the vault down.",
    "consequences": "The guild wants them dead.",
    "status": "registered",
}

CAMPAIGN_ROW = {"id": "campaign-1", "accumulated_summary": None}


def _repo_with_session(session: dict | None) -> MagicMock:
    repo = MagicMock()
    repo.get_session.return_value = session
    repo.get_campaign.return_value = CAMPAIGN_ROW
    repo.update_session.return_value = COMPLETED_SESSION_ROW
    repo.complete_draft.return_value = COMPLETED_SESSION_ROW
    return repo


def _command() -> CompleteSessionCommand:
    return CompleteSessionCommand(
        summary="The party actually burned the vault down.",
        consequences="The guild wants them dead.",
    )


@pytest.mark.asyncio
async def test_unknown_session_id_raises_session_not_found_before_any_update() -> None:
    repo = _repo_with_session(None)
    summarize = AsyncMock()
    suggest = AsyncMock()
    use_case = CompleteSession(repo, summarize, suggest)

    with pytest.raises(SessionNotFoundError):
        await use_case.execute("forged-session", _command())

    repo.update_session.assert_not_called()
    summarize.execute.assert_not_called()
    suggest.execute.assert_not_called()


@pytest.mark.asyncio
async def test_happy_path_updates_existing_row_then_summarizes_then_suggests() -> None:
    repo = _repo_with_session(GENERATED_SESSION_ROW)
    summarize = AsyncMock()
    suggest = AsyncMock()
    suggestion = MemorySuggestion(
        content="The party burned the vault.",
        type="consequence",
        importance="high",
        reason="It happened in this session.",
    )
    suggest.execute.return_value = [suggestion]
    use_case = CompleteSession(repo, summarize, suggest)

    result = await use_case.execute("session-1", _command())

    assert result.session_id == "session-1"
    assert result.session_number == 3
    assert result.memory_suggestions == [suggestion]
    repo.insert_session_with_next_number.assert_not_called()
    repo.complete_draft.assert_called_once_with(
        "session-1",
        "The party actually burned the vault down.",
        "The guild wants them dead.",
    )
    repo.update_session.assert_not_called()
    summarize.execute.assert_awaited_once_with(CAMPAIGN_ROW, COMPLETED_SESSION_ROW)
    suggest.execute.assert_awaited_once_with("campaign-1", COMPLETED_SESSION_ROW)


@pytest.mark.asyncio
async def test_update_failure_surfaces_as_session_persistence_error() -> None:
    repo = _repo_with_session(GENERATED_SESSION_ROW)
    repo.complete_draft.side_effect = RepositoryError("update failed")
    summarize = AsyncMock()
    suggest = AsyncMock()
    use_case = CompleteSession(repo, summarize, suggest)

    with pytest.raises(SessionPersistenceError):
        await use_case.execute("session-1", _command())

    summarize.execute.assert_not_called()
    suggest.execute.assert_not_called()


@pytest.mark.asyncio
async def test_summarize_failure_after_update_degrades_without_surfacing() -> None:
    repo = _repo_with_session(GENERATED_SESSION_ROW)
    summarize = AsyncMock()
    summarize.execute.side_effect = RuntimeError("LLM exploded")
    suggest = AsyncMock()
    suggest.execute.return_value = []
    use_case = CompleteSession(repo, summarize, suggest)

    result = await use_case.execute("session-1", _command())

    assert result.session_id == "session-1"
    assert result.session_number == 3
    assert result.memory_suggestions == []


@pytest.mark.asyncio
async def test_campaign_fetch_failure_after_update_degrades_without_surfacing() -> None:
    repo = _repo_with_session(GENERATED_SESSION_ROW)
    repo.get_campaign.side_effect = RepositoryError("campaign fetch failed")
    summarize = AsyncMock()
    suggest = AsyncMock()
    suggest.execute.return_value = []
    use_case = CompleteSession(repo, summarize, suggest)

    result = await use_case.execute("session-1", _command())

    assert result.session_id == "session-1"
    assert result.session_number == 3
    assert result.memory_suggestions == []
    summarize.execute.assert_not_called()


@pytest.mark.asyncio
async def test_suggest_failure_after_update_degrades_to_empty_suggestions() -> None:
    repo = _repo_with_session(GENERATED_SESSION_ROW)
    summarize = AsyncMock()
    suggest = AsyncMock()
    suggest.execute.side_effect = RuntimeError("LLM exploded")
    use_case = CompleteSession(repo, summarize, suggest)

    result = await use_case.execute("session-1", _command())

    assert result.session_id == "session-1"
    assert result.session_number == 3
    assert result.memory_suggestions == []


@pytest.mark.asyncio
async def test_optional_consequences_defaults_to_none_in_the_update() -> None:
    repo = _repo_with_session(GENERATED_SESSION_ROW)
    summarize = AsyncMock()
    suggest = AsyncMock()
    suggest.execute.return_value = []
    use_case = CompleteSession(repo, summarize, suggest)

    await use_case.execute("session-1", CompleteSessionCommand(summary="It ended."))

    repo.complete_draft.assert_called_once_with("session-1", "It ended.", None)


@pytest.mark.asyncio
async def test_completing_an_already_registered_session_raises_before_any_update() -> (
    None
):
    """A second complete on the same row is always a bug — PATCH is for edits.

    This guard is what makes the overwrite impossible even if the frontend's
    draft predicate is wrong.
    """
    repo = _repo_with_session({**GENERATED_SESSION_ROW, "status": "registered"})
    summarize = AsyncMock()
    suggest = AsyncMock()
    use_case = CompleteSession(repo, summarize, suggest)

    with pytest.raises(SessionAlreadyRegisteredError):
        await use_case.execute("session-1", _command())

    repo.complete_draft.assert_not_called()
    summarize.execute.assert_not_called()
    suggest.execute.assert_not_called()


@pytest.mark.asyncio
async def test_completing_with_summary_only_leaves_the_row_registered() -> None:
    """The regression that started this: consequences is OPTIONAL.

    Completing with a summary alone must still mark the row 'registered', so it
    is never classifiable as an open draft again — even though `consequences`
    stays null and `generated_content` stays filled.
    """
    repo = _repo_with_session(GENERATED_SESSION_ROW)
    summary_only_row = {
        **GENERATED_SESSION_ROW,
        "summary": "It ended.",
        "consequences": None,
        "status": "registered",
    }
    repo.complete_draft.return_value = summary_only_row
    summarize = AsyncMock()
    suggest = AsyncMock()
    suggest.execute.return_value = []
    use_case = CompleteSession(repo, summarize, suggest)

    await use_case.execute("session-1", CompleteSessionCommand(summary="It ended."))

    repo.complete_draft.assert_called_once_with("session-1", "It ended.", None)
    # The old inferred predicate would still call this row an open draft.
    assert summary_only_row["generated_content"] is not None
    assert summary_only_row["consequences"] is None
    assert summary_only_row["status"] == "registered"


@pytest.mark.asyncio
async def test_lost_draft_transition_race_raises_without_overwriting() -> None:
    repo = _repo_with_session(GENERATED_SESSION_ROW)
    repo.complete_draft.return_value = None
    repo.get_session.side_effect = [
        GENERATED_SESSION_ROW,
        {**GENERATED_SESSION_ROW, "status": "registered"},
    ]
    summarize = AsyncMock()
    suggest = AsyncMock()
    use_case = CompleteSession(repo, summarize, suggest)

    with pytest.raises(SessionAlreadyRegisteredError):
        await use_case.execute("session-1", _command())

    repo.complete_draft.assert_called_once_with(
        "session-1",
        "The party actually burned the vault down.",
        "The guild wants them dead.",
    )
    repo.update_session.assert_not_called()
    summarize.execute.assert_not_called()
    suggest.execute.assert_not_called()
