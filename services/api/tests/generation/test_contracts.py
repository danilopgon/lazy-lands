"""Contract tests for generated session output validation."""

from __future__ import annotations

import pytest
from pydantic import ValidationError

from app.modules.generation.application.contracts import (
    DEFAULT_DIFFICULTY,
    DEFAULT_PACE,
    DEFAULT_TONE,
    DirectionInput,
    GeneratedSessionOutput,
)


def _valid_payload() -> dict[str, object]:
    return {
        "title": "Threads in the Mine",
        "synopsis": "The party follows the arcane core clue into the old mine.",
        "main_objective": "Recover the stabilised arcane core.",
        "twist": "The manticore they spared is guarding the entrance.",
        "encounters": [
            {
                "name": "Manticore at Dusk",
                "description": "A tense negotiation at the ravine.",
                "type": "social",
            }
        ],
        "faction_reactions": [
            {"faction_name": "Black Bear Guild", "reaction": "Offers guarded help."}
        ],
        "arc_progression": [
            {"arc_title": "Recover the plans", "progression": "The party finds a map."}
        ],
        "continuity_links": [
            {"memory_fact_id": "memory-1", "relevance": "The spared manticore returns."}
        ],
        "generated_content": {
            "sections": [
                {
                    "id": "synopsis",
                    "label": "Synopsis",
                    "body": "The party follows the clue.",
                    "origin": "scribe",
                }
            ]
        },
    }


def test_generated_session_output_accepts_valid_full_payload() -> None:
    output = GeneratedSessionOutput(**_valid_payload())

    assert output.title == "Threads in the Mine"
    assert output.generated_content.sections[0].origin == "scribe"
    assert output.continuity_links[0].memory_fact_id == "memory-1"


def test_generated_session_output_rejects_missing_required_fields() -> None:
    payload = _valid_payload()
    payload.pop("main_objective")

    with pytest.raises(ValidationError):
        GeneratedSessionOutput(**payload)


def test_generated_session_output_rejects_unknown_section_origin() -> None:
    payload = _valid_payload()
    generated_content = payload["generated_content"]
    assert isinstance(generated_content, dict)
    sections = generated_content["sections"]
    assert isinstance(sections, list)
    sections[0]["origin"] = "llm"

    with pytest.raises(ValidationError):
        GeneratedSessionOutput(**payload)


def test_generated_session_output_rejects_edited_section_origin() -> None:
    payload = _valid_payload()
    generated_content = payload["generated_content"]
    assert isinstance(generated_content, dict)
    sections = generated_content["sections"]
    assert isinstance(sections, list)
    sections[0]["origin"] = "edited"

    with pytest.raises(ValidationError):
        GeneratedSessionOutput(**payload)


def test_content_for_persistence_defaults_sections_and_continuity_links() -> None:
    payload = _valid_payload()
    payload.pop("generated_content")

    content = GeneratedSessionOutput(**payload).content_for_persistence()

    assert content.model_dump(mode="json") == {
        "sections": [
            {
                "id": "synopsis",
                "label": "Synopsis",
                "body": "The party follows the arcane core clue into the old mine.",
                "origin": "scribe",
            },
            {
                "id": "main_objective",
                "label": "Main objective",
                "body": "Recover the stabilised arcane core.",
                "origin": "scribe",
            },
            {
                "id": "twist",
                "label": "Twist",
                "body": "The manticore they spared is guarding the entrance.",
                "origin": "scribe",
            },
        ],
        "continuity_links": [
            {"memory_fact_id": "memory-1", "relevance": "The spared manticore returns."}
        ],
    }


def test_content_for_persistence_adds_links_to_explicit_generated_content() -> None:
    output = GeneratedSessionOutput(**_valid_payload())

    content = output.content_for_persistence()

    assert content.model_dump(mode="json")["continuity_links"] == [
        {"memory_fact_id": "memory-1", "relevance": "The spared manticore returns."}
    ]


def test_direction_input_normalizes_empty_strings_and_nulls_to_defaults() -> None:
    direction = DirectionInput(
        goal="   ",
        tone=None,
        pace="  ",
        difficulty=None,
        additional_instructions="\n",
    ).to_direction()

    assert direction.goal is None
    assert direction.tone == DEFAULT_TONE
    assert direction.pace == DEFAULT_PACE
    assert direction.difficulty == DEFAULT_DIFFICULTY
    assert direction.additional_instructions is None
