"""Use-case tests for RecoverMemorySuggestions (read-only, never swallows).

The discriminating behaviour of this use case versus ``RegisterSession`` /
``CompleteSession``: those swallow a provider failure to protect a completed
write, so an intentional empty result and a failed generation both surface as
``[]``. Recovery has no write to protect, so a provider failure MUST surface
as an error while an intentional empty result stays a success.
"""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock

import pytest

from app.modules.sessions.application.commands.recover_memory_suggestions import (
    RecoverMemorySuggestions,
)
from app.modules.sessions.application.contracts import MemorySuggestion
from app.modules.sessions.application.errors import SessionNotFoundError
from app.shared.llm.errors import LlmOutputValidationError, ProviderRateLimitError

SESSION_ROW = {
    "id": "session-1",
    "campaign_id": "campaign-1",
    "session_number": 3,
    "summary": "The party burned the vault down.",
    "consequences": "The guild wants them dead.",
    "generated_content": {"title": "The Sunken Vault", "sections": []},
    "status": "registered",
    "created_at": "2026-07-08T00:00:00Z",
}

WRITE_METHODS = (
    "insert_session",
    "insert_session_with_next_number",
    "update_session",
    "complete_draft",
    "update_campaign_summary",
)


def _suggestion(content: str = "Captain Vess hides in the harbor.") -> MemorySuggestion:
    return MemorySuggestion(
        content=content,
        type="revelation",
        importance="medium",
        reason="Introduced this session.",
        related=[],
    )


def _repo_with_session(session: dict | None) -> MagicMock:
    repo = MagicMock()
    repo.get_session.return_value = session
    return repo


def _assert_no_writes(repo: MagicMock) -> None:
    for method in WRITE_METHODS:
        getattr(repo, method).assert_not_called()


async def test_recovers_validated_suggestions_for_a_persisted_session() -> None:
    repo = _repo_with_session(SESSION_ROW)
    suggest = MagicMock()
    suggest.execute = AsyncMock(return_value=[_suggestion()])
    use_case = RecoverMemorySuggestions(repo, suggest)

    result = await use_case.execute("session-1")

    assert result == [_suggestion()]
    assert all(isinstance(item, MemorySuggestion) for item in result)
    suggest.execute.assert_awaited_once_with("campaign-1", SESSION_ROW)


async def test_intentional_empty_result_is_a_success_not_an_error() -> None:
    repo = _repo_with_session(SESSION_ROW)
    suggest = MagicMock()
    suggest.execute = AsyncMock(return_value=[])
    use_case = RecoverMemorySuggestions(repo, suggest)

    result = await use_case.execute("session-1")

    assert result == []


@pytest.mark.parametrize(
    "error",
    [
        LlmOutputValidationError("MemorySuggestionsOutput", "{bad", retryable=True),
        ProviderRateLimitError("quota exhausted"),
        RuntimeError("transport blew up"),
    ],
)
async def test_provider_failure_surfaces_instead_of_degrading_to_empty(
    error: Exception,
) -> None:
    repo = _repo_with_session(SESSION_ROW)
    suggest = MagicMock()
    suggest.execute = AsyncMock(side_effect=error)
    use_case = RecoverMemorySuggestions(repo, suggest)

    with pytest.raises(type(error)):
        await use_case.execute("session-1")


async def test_unknown_or_foreign_session_raises_not_found_before_the_llm() -> None:
    repo = _repo_with_session(None)
    suggest = MagicMock()
    suggest.execute = AsyncMock()
    use_case = RecoverMemorySuggestions(repo, suggest)

    with pytest.raises(SessionNotFoundError):
        await use_case.execute("session-1")

    suggest.execute.assert_not_awaited()


async def test_recovery_never_writes_to_the_session() -> None:
    repo = _repo_with_session(SESSION_ROW)
    snapshot = dict(SESSION_ROW)
    suggest = MagicMock()
    suggest.execute = AsyncMock(return_value=[_suggestion()])
    use_case = RecoverMemorySuggestions(repo, suggest)

    await use_case.execute("session-1")

    _assert_no_writes(repo)
    assert snapshot == SESSION_ROW


async def test_repeated_recovery_is_safe_and_leaves_the_session_untouched() -> None:
    repo = _repo_with_session(SESSION_ROW)
    snapshot = dict(SESSION_ROW)
    suggest = MagicMock()
    suggest.execute = AsyncMock(side_effect=[[_suggestion("First.")], []])
    use_case = RecoverMemorySuggestions(repo, suggest)

    first = await use_case.execute("session-1")
    second = await use_case.execute("session-1")

    assert first == [_suggestion("First.")]
    assert second == []
    assert suggest.execute.await_count == 2
    _assert_no_writes(repo)
    assert snapshot == SESSION_ROW
