"""Use-case tests for ExtractCampaign (CE-001, CE-004, NFR-CE-1, NFR-CE-2)."""

from __future__ import annotations

import pytest

from app.modules.campaigns.application.extract_campaign import ExtractCampaign
from app.modules.campaigns.schemas import ExtractCampaignOutput
from app.shared.llm.errors import LlmOutputValidationError
from app.shared.llm.providers.fake import FakeLlmProvider

VALID_PAYLOAD = {
    "title": "The Sunken Crown",
    "description": "A campaign about a drowned kingdom rising from the sea.",
    "world_state": "The tides have begun to recede, revealing old ruins.",
    "npcs": [
        {
            "name": "Captain Vess",
            "description": "A grizzled smuggler captain.",
            "current_state": "Hiding in the harbor district.",
            "motivation": "Wants to find the crown before anyone else.",
        }
    ],
    "factions": [
        {
            "name": "The Tidebound Circle",
            "description": "A cult devoted to the drowned king.",
            "current_stance": "Actively searching for relics.",
            "goals": "Resurrect the drowned king.",
        }
    ],
    "arcs": [
        {
            "title": "Race for the Crown",
            "description": "The party races rivals to the sunken ruins.",
            "priority": "high",
        }
    ],
}


@pytest.mark.asyncio
async def test_happy_path_returns_validated_output_including_arcs() -> None:
    provider = FakeLlmProvider()
    provider.register(ExtractCampaignOutput, VALID_PAYLOAD)
    use_case = ExtractCampaign(llm_provider=provider)

    result = await use_case.execute("A premise long enough to pass validation " * 3)

    assert isinstance(result, ExtractCampaignOutput)
    assert result.title == "The Sunken Crown"
    assert len(result.npcs) == 1
    assert result.npcs[0].content_source == "llm"
    assert len(result.factions) == 1
    assert result.factions[0].content_source == "llm"
    assert len(result.arcs) == 1
    assert result.arcs[0].priority == "high"
    assert result.arcs[0].content_source == "llm"


@pytest.mark.asyncio
async def test_invalid_llm_output_raises_llm_output_validation_error() -> None:
    provider = FakeLlmProvider()
    # Missing required "title" field.
    provider.register(
        ExtractCampaignOutput,
        {
            "description": "desc",
            "world_state": "state",
            "npcs": [],
            "factions": [],
            "arcs": [],
        },
    )
    use_case = ExtractCampaign(llm_provider=provider)

    with pytest.raises(LlmOutputValidationError) as exc_info:
        await use_case.execute("A premise long enough to pass validation " * 3)

    assert exc_info.value.retryable is True
    assert exc_info.value.schema_name == "ExtractCampaignOutput"


@pytest.mark.asyncio
async def test_empty_npcs_factions_arcs_are_valid() -> None:
    provider = FakeLlmProvider()
    provider.register(
        ExtractCampaignOutput,
        {
            "title": "Title",
            "description": "Description",
            "world_state": "World state",
            "npcs": [],
            "factions": [],
            "arcs": [],
        },
    )
    use_case = ExtractCampaign(llm_provider=provider)

    result = await use_case.execute("A premise long enough to pass validation " * 3)

    assert result.npcs == []
    assert result.factions == []
    assert result.arcs == []
