"""Use-case tests for SuggestMemories (direct relational fetch, transient output)."""

from __future__ import annotations

from pathlib import Path
from unittest.mock import MagicMock

import pytest

from app.modules.sessions.application.commands.suggest_memories import SuggestMemories
from app.modules.sessions.application.contracts import MemorySuggestionsOutput
from app.modules.sessions.domain.ports import SessionRepository
from app.shared.llm.providers.fake import FakeLlmProvider

VALID_PAYLOAD = {
    "suggestions": [
        {
            "content": "Captain Vess is hiding in the harbor district.",
            "type": "revelation",
            "importance": "medium",
            "reason": "Introduced this session.",
            "related": [],
        }
    ]
}

PROMPT_PATH = (
    Path(__file__).parents[2]
    / "app"
    / "modules"
    / "sessions"
    / "prompts"
    / "suggest_memory_facts_v1.jinja"
)


@pytest.mark.asyncio
async def test_suggest_returns_zero_to_five_validated_suggestions() -> None:
    provider = FakeLlmProvider()
    provider.register(MemorySuggestionsOutput, VALID_PAYLOAD)
    repo = MagicMock()
    repo.get_campaign.return_value = {
        "id": "campaign-1",
        "accumulated_summary": "Summary.",
        "world_state": "World.",
    }
    repo.get_suggestion_context.return_value = {
        "npcs": [],
        "factions": [],
        "arcs": [],
        "memory_facts": [],
    }
    use_case = SuggestMemories(llm_provider=provider, repository=repo)
    session = {"id": "session-1", "summary": "The party arrived.", "consequences": None}

    suggestions = await use_case.execute("campaign-1", session)

    assert len(suggestions) == 1
    assert suggestions[0].content == "Captain Vess is hiding in the harbor district."


@pytest.mark.asyncio
async def test_suggest_input_built_via_direct_relational_fetch_only() -> None:
    provider = FakeLlmProvider()
    provider.register(MemorySuggestionsOutput, {"suggestions": []})
    repo = MagicMock()
    repo.get_campaign.return_value = {"id": "campaign-1"}
    repo.get_suggestion_context.return_value = {
        "npcs": [],
        "factions": [],
        "arcs": [],
        "memory_facts": [],
    }
    use_case = SuggestMemories(llm_provider=provider, repository=repo)
    session = {"id": "session-1", "summary": "s", "consequences": None}

    await use_case.execute("campaign-1", session)

    repo.get_suggestion_context.assert_called_once_with("campaign-1")
    repo.get_campaign.assert_called_once_with("campaign-1")


@pytest.mark.asyncio
async def test_zero_suggestions_is_valid_and_never_persists_anything() -> None:
    provider = FakeLlmProvider()
    provider.register(MemorySuggestionsOutput, {"suggestions": []})
    # spec=SessionRepository restricts the mock to the port's actual methods —
    # a stray write-side call (e.g. insert_session) would raise AttributeError
    # instead of silently succeeding on an auto-created MagicMock attribute.
    repo = MagicMock(spec=SessionRepository)
    repo.get_campaign.return_value = {"id": "campaign-1"}
    repo.get_suggestion_context.return_value = {
        "npcs": [],
        "factions": [],
        "arcs": [],
        "memory_facts": [],
    }
    use_case = SuggestMemories(llm_provider=provider, repository=repo)
    session = {"id": "session-1", "summary": "s", "consequences": None}

    suggestions = await use_case.execute("campaign-1", session)

    assert suggestions == []
    # Only the read-only fetches were called; every write-side repository
    # method was never invoked — proving nothing was persisted as a side
    # effect of a suggest call.
    repo.get_suggestion_context.assert_called_once_with("campaign-1")
    repo.get_campaign.assert_called_once_with("campaign-1")
    repo.insert_session.assert_not_called()
    repo.update_campaign_summary.assert_not_called()


def test_suggest_memory_prompt_instructs_canonical_memory_type_values() -> None:
    prompt = PROMPT_PATH.read_text(encoding="utf-8")

    assert 'Each suggestion\'s "type" MUST be one of these allowed values' in prompt
    for memory_type in (
        "consequence",
        "relationship",
        "secret",
        "promise",
        "tension",
        "revelation",
        "item",
        "arc_progress",
    ):
        assert f"- {memory_type}" in prompt
    assert "Do not invent other type values." in prompt
