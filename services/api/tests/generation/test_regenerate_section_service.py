"""Adapter tests for the generation module's SectionRegenerator implementation."""

from __future__ import annotations

import pytest

from app.modules.generation.application.contracts import RegeneratedSectionOutput
from app.modules.generation.application.regenerate_section_service import (
    GenerationSectionRegenerator,
)
from app.shared.llm.errors import LlmOutputValidationError
from app.shared.llm.providers.fake import FakeLlmProvider

CAMPAIGN_ID = "11111111-1111-4111-8111-111111111111"


class _Repo:
    def __init__(self, context: dict | None) -> None:
        self.context = context

    def get_generation_context(self, campaign_id: str) -> dict | None:
        assert campaign_id == CAMPAIGN_ID
        return self.context


def _context() -> dict[str, object]:
    return {
        "campaign": {
            "id": CAMPAIGN_ID,
            "title": "Sombras",
            "description": "Intrigue.",
            "world_state": "Winter.",
            "accumulated_summary": "Herman was humiliated.",
            "summarized_up_to_session": 7,
        },
        "npcs": [],
        "factions": [],
        "arcs": [],
        "memory_facts": [],
    }


def _current_sections() -> list[dict[str, object]]:
    return [
        {
            "id": "synopsis",
            "label": "Synopsis",
            "body": "Old synopsis.",
            "origin": "scribe",
        },
        {
            "id": "goal",
            "label": "Session goal",
            "body": "Old goal.",
            "origin": "edited",
        },
    ]


@pytest.mark.asyncio
async def test_regenerate_section_renders_prompt_calls_llm_and_validates_output() -> (
    None
):
    provider = FakeLlmProvider()
    provider.register(RegeneratedSectionOutput, {"body": "Fresh goal from the Scribe."})
    adapter = GenerationSectionRegenerator(_Repo(_context()), provider)

    result = await adapter.regenerate_section(CAMPAIGN_ID, "goal", _current_sections())

    assert result["id"] == "goal"
    assert result["label"] == "Session goal"
    assert result["body"] == "Fresh goal from the Scribe."
    assert result["origin"] == "scribe"
    assert result["trace_json"]["prompt_version"] == "regenerate_goal_v1"


@pytest.mark.asyncio
async def test_regenerate_section_raises_on_invalid_llm_output() -> None:
    provider = FakeLlmProvider()
    provider.register(RegeneratedSectionOutput, {"body": ""})
    adapter = GenerationSectionRegenerator(_Repo(_context()), provider)

    with pytest.raises(LlmOutputValidationError):
        await adapter.regenerate_section(CAMPAIGN_ID, "goal", _current_sections())
