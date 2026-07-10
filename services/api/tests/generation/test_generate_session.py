"""Use-case tests for next-session generation."""

from __future__ import annotations

import pytest

from app.modules.generation.application.contracts import (
    GeneratedSessionOutput,
    GenerationDirection,
)
from app.modules.generation.application.errors import (
    GenerationNotFoundError,
    GenerationPersistenceError,
)
from app.modules.generation.application.generate_session import (
    GenerateNextSessionUseCase,
)
from app.modules.sessions.infrastructure.errors import RepositoryError
from app.shared.llm.errors import LlmOutputValidationError
from app.shared.llm.providers.fake import FakeLlmProvider


class _Repo:
    def __init__(self, context: dict | None) -> None:
        self.context = context
        self.created: list[dict] = []
        self.failed_traces: list[dict] = []

    def get_generation_context(self, campaign_id: str) -> dict | None:
        assert campaign_id == "campaign-1"
        return self.context

    def create_generated_session(self, campaign_id: str, session_data: dict) -> dict:
        self.created.append(session_data)
        return {
            "id": "session-1",
            "session_number": 8,
            **session_data,
        }

    def record_generation_trace(self, campaign_id: str, trace_json: dict) -> None:
        assert campaign_id == "campaign-1"
        self.failed_traces.append(trace_json)


class _FailingPersistRepo(_Repo):
    def create_generated_session(self, campaign_id: str, session_data: dict) -> dict:
        super().create_generated_session(campaign_id, session_data)
        raise RepositoryError("insert failed")


def _context(summary: str = "The party humiliated Herman.") -> dict[str, object]:
    return {
        "campaign": {
            "id": "campaign-1",
            "title": "Sombras",
            "description": "Intrigue.",
            "world_state": "Winter.",
            "accumulated_summary": summary,
            "summarized_up_to_session": 7,
        },
        "npcs": [],
        "factions": [],
        "arcs": [],
        "memory_facts": [],
    }


def _output_payload() -> dict[str, object]:
    return {
        "title": "Threads in the Mine",
        "synopsis": "The party follows the arcane core clue.",
        "main_objective": "Recover the core.",
        "twist": "The spared manticore returns.",
        "encounters": [
            {"name": "Ravine", "description": "Negotiate.", "type": "social"}
        ],
        "faction_reactions": [{"faction_name": "Guild", "reaction": "Watches."}],
        "arc_progression": [{"arc_title": "Core", "progression": "Clue found."}],
        "continuity_links": [{"memory_fact_id": "mem-1", "relevance": "Payoff."}],
        "generated_content": {
            "sections": [
                {
                    "id": "synopsis",
                    "label": "Synopsis",
                    "body": "Draft.",
                    "origin": "scribe",
                }
            ]
        },
    }


@pytest.mark.asyncio
async def test_generate_session_persists_valid_output_with_trace() -> None:
    repo = _Repo(_context())
    provider = FakeLlmProvider()
    provider.register(GeneratedSessionOutput, _output_payload())
    use_case = GenerateNextSessionUseCase(repo, provider)

    result = await use_case.execute("campaign-1", GenerationDirection())

    assert result.id == "session-1"
    assert result.title == "Threads in the Mine"
    assert result.trace_id == "session-1"
    assert repo.created[0]["summary"] == "The party follows the arcane core clue."
    assert repo.created[0]["generated_content"]["sections"][0]["origin"] == "scribe"
    assert repo.created[0]["generated_content"]["continuity_links"] == [
        {"memory_fact_id": "mem-1", "relevance": "Payoff."}
    ]
    assert repo.created[0]["trace_json"]["prompt_version"] == "generate_session_v1"
    assert repo.created[0]["trace_json"]["error_code"] is None
    assert repo.created[0]["trace_json"]["estimated_context_size"] > 0


@pytest.mark.asyncio
async def test_generate_session_does_not_persist_invalid_llm_output() -> None:
    repo = _Repo(_context())
    provider = FakeLlmProvider()
    invalid = _output_payload()
    invalid.pop("title")
    provider.register(GeneratedSessionOutput, invalid)
    use_case = GenerateNextSessionUseCase(repo, provider)

    with pytest.raises(LlmOutputValidationError):
        await use_case.execute("campaign-1", GenerationDirection())

    assert repo.created == []
    assert len(repo.failed_traces) == 1
    trace = repo.failed_traces[0]
    assert trace["provider"] == "FakeLlmProvider"
    assert trace["model"] == "unknown"
    assert trace["prompt_version"] == "generate_session_v1"
    assert trace["estimated_context_size"] > 0
    assert trace["duration_ms"] >= 0
    assert trace["error_code"] == "llm_output_validation_failed"
    assert trace["context_summary"] == {
        "campaign_id": "campaign-1",
        "summarized_up_to_session": 7,
    }


@pytest.mark.asyncio
async def test_generate_session_raises_not_found_for_rls_miss() -> None:
    provider = FakeLlmProvider()
    use_case = GenerateNextSessionUseCase(_Repo(None), provider)

    with pytest.raises(GenerationNotFoundError):
        await use_case.execute("campaign-1", GenerationDirection())


@pytest.mark.asyncio
async def test_generate_session_wraps_repository_error_as_retryable_error() -> None:
    repo = _FailingPersistRepo(_context())
    provider = FakeLlmProvider()
    provider.register(GeneratedSessionOutput, _output_payload())
    use_case = GenerateNextSessionUseCase(repo, provider)

    with pytest.raises(GenerationPersistenceError) as exc_info:
        await use_case.execute("campaign-1", GenerationDirection())

    assert exc_info.value.retryable is True
    assert repo.created[0]["generated_content"]["continuity_links"] == [
        {"memory_fact_id": "mem-1", "relevance": "Payoff."}
    ]
