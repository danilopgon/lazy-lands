"""Use-case tests for POST /sessions/{id}/regenerate-section."""

from __future__ import annotations

import pytest

from app.modules.sessions.application.commands.regenerate_section import (
    RegenerateSectionCommand,
    RegenerateSectionUseCase,
)
from app.modules.sessions.application.errors import (
    SessionNotFoundError,
    SessionPersistenceError,
    SessionValidationError,
)
from app.modules.sessions.infrastructure.errors import RepositoryError
from app.shared.llm.errors import LlmOutputValidationError

SESSION_ID = "11111111-1111-4111-8111-111111111111"


def _session_row() -> dict[str, object]:
    return {
        "id": SESSION_ID,
        "campaign_id": "campaign-1",
        "session_number": 8,
        "summary": "Draft synopsis.",
        "consequences": None,
        "generated_content": {
            "title": "Threads in the Mine",
            "sections": [
                {
                    "id": "synopsis",
                    "label": "Synopsis",
                    "body": "Old.",
                    "origin": "scribe",
                },
                {
                    "id": "goal",
                    "label": "Session goal",
                    "body": "Old goal.",
                    "origin": "edited",
                },
            ],
            "continuity_links": [{"memory_fact_id": "mem-1", "relevance": "Payoff."}],
        },
        "trace_json": {"prompt_version": "generate_session_v2"},
        "created_at": "2026-07-10T00:00:00Z",
        "updated_at": "2026-07-10T00:00:00Z",
    }


class _Repo:
    def __init__(self, session: dict | None) -> None:
        self.session = session
        self.updated_with: dict | None = None

    def get_session(self, session_id: str) -> dict | None:
        assert session_id == SESSION_ID
        return self.session

    def update_session(self, session_id: str, data: dict) -> dict:
        assert session_id == SESSION_ID
        self.updated_with = data
        assert self.session is not None
        self.session = {**self.session, **data}
        return self.session


class _FailingRepo(_Repo):
    def update_session(self, session_id: str, data: dict) -> dict:
        raise RepositoryError("update failed")


class _Regenerator:
    def __init__(
        self, result: dict | None = None, error: Exception | None = None
    ) -> None:
        self.result = result
        self.error = error
        self.calls: list[tuple[str, str, list[dict]]] = []

    async def regenerate_section(
        self, campaign_id: str, section_id: str, current_sections: list[dict]
    ) -> dict:
        self.calls.append((campaign_id, section_id, current_sections))
        if self.error is not None:
            raise self.error
        assert self.result is not None
        return self.result


def _regenerated_goal() -> dict[str, object]:
    return {
        "id": "goal",
        "label": "Session goal",
        "body": "Fresh goal from the Scribe.",
        "origin": "scribe",
        "trace_json": {"prompt_version": "regenerate_goal_v1"},
    }


@pytest.mark.asyncio
async def test_regenerate_section_updates_body_and_resets_origin_to_scribe() -> None:
    repo = _Repo(_session_row())
    regenerator = _Regenerator(result=_regenerated_goal())
    use_case = RegenerateSectionUseCase(repo, regenerator)

    result = await use_case.execute(
        SESSION_ID, RegenerateSectionCommand(section_id="goal")
    )

    goal_section = next(
        section
        for section in result.generated_content["sections"]
        if section["id"] == "goal"
    )
    assert goal_section["body"] == "Fresh goal from the Scribe."
    assert goal_section["origin"] == "scribe"
    # Untouched section (and continuity links) survive the section-level replace.
    synopsis_section = next(
        section
        for section in result.generated_content["sections"]
        if section["id"] == "synopsis"
    )
    assert synopsis_section["body"] == "Old."
    assert result.generated_content["continuity_links"] == [
        {"memory_fact_id": "mem-1", "relevance": "Payoff."}
    ]
    assert regenerator.calls == [
        ("campaign-1", "goal", _session_row()["generated_content"]["sections"])  # type: ignore[index]
    ]


@pytest.mark.asyncio
async def test_regenerate_section_resets_previously_edited_origin_to_scribe() -> None:
    repo = _Repo(_session_row())
    regenerator = _Regenerator(
        result={
            "id": "goal",
            "label": "Session goal",
            "body": "Fresh goal.",
            "origin": "scribe",
            "trace_json": {},
        }
    )
    use_case = RegenerateSectionUseCase(repo, regenerator)

    result = await use_case.execute(
        SESSION_ID, RegenerateSectionCommand(section_id="goal")
    )

    goal_section = next(
        section
        for section in result.generated_content["sections"]
        if section["id"] == "goal"
    )
    assert goal_section["origin"] == "scribe"


@pytest.mark.asyncio
async def test_regenerate_section_unknown_id_raises_without_calling_regenerator() -> (
    None
):
    repo = _Repo(_session_row())
    regenerator = _Regenerator(result=_regenerated_goal())
    use_case = RegenerateSectionUseCase(repo, regenerator)

    with pytest.raises(SessionValidationError):
        await use_case.execute(SESSION_ID, RegenerateSectionCommand(section_id="arcs"))

    assert regenerator.calls == []
    assert repo.updated_with is None


@pytest.mark.asyncio
async def test_regenerate_section_missing_session_raises_not_found() -> None:
    repo = _Repo(None)
    regenerator = _Regenerator(result=_regenerated_goal())
    use_case = RegenerateSectionUseCase(repo, regenerator)

    with pytest.raises(SessionNotFoundError):
        await use_case.execute(SESSION_ID, RegenerateSectionCommand(section_id="goal"))

    assert regenerator.calls == []


@pytest.mark.asyncio
async def test_regenerate_section_llm_failure_leaves_draft_untouched() -> None:
    repo = _Repo(_session_row())
    regenerator = _Regenerator(
        error=LlmOutputValidationError(
            schema_name="RegeneratedSectionOutput", raw_output="bad"
        )
    )
    use_case = RegenerateSectionUseCase(repo, regenerator)

    with pytest.raises(LlmOutputValidationError):
        await use_case.execute(SESSION_ID, RegenerateSectionCommand(section_id="goal"))

    assert repo.updated_with is None


@pytest.mark.asyncio
async def test_regenerate_section_wraps_persistence_error_as_retryable() -> None:
    repo = _FailingRepo(_session_row())
    regenerator = _Regenerator(result=_regenerated_goal())
    use_case = RegenerateSectionUseCase(repo, regenerator)

    with pytest.raises(SessionPersistenceError) as exc_info:
        await use_case.execute(SESSION_ID, RegenerateSectionCommand(section_id="goal"))

    assert exc_info.value.retryable is True
