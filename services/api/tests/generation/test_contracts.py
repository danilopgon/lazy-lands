"""Contract tests for generated session output validation (7-section shape)."""

from __future__ import annotations

import pytest
from pydantic import ValidationError

from app.modules.generation.application.contracts import (
    CANONICAL_SECTION_IDS,
    DEFAULT_DIFFICULTY,
    DEFAULT_PACE,
    DEFAULT_TONE,
    DirectionInput,
    GeneratedSessionOutput,
)


def _section(section_id: str, body: str = "Draft body.") -> dict[str, object]:
    return {
        "id": section_id,
        "label": section_id.title(),
        "body": body,
        "origin": "scribe",
    }


def _valid_payload() -> dict[str, object]:
    return {
        "title": "Threads in the Mine",
        "sections": [_section(section_id) for section_id in CANONICAL_SECTION_IDS],
        "continuity_links": [
            {"memory_fact_id": "memory-1", "relevance": "The spared manticore returns."}
        ],
    }


def test_generated_session_output_accepts_exactly_the_seven_canonical_sections() -> (
    None
):
    output = GeneratedSessionOutput(**_valid_payload())

    assert tuple(section.id for section in output.sections) == CANONICAL_SECTION_IDS
    assert output.continuity_links[0].memory_fact_id == "memory-1"


def test_generated_session_output_rejects_missing_sections() -> None:
    payload = _valid_payload()
    payload["sections"] = payload["sections"][:-1]  # type: ignore[index]

    with pytest.raises(ValidationError):
        GeneratedSessionOutput(**payload)


def test_generated_session_output_rejects_out_of_order_sections() -> None:
    payload = _valid_payload()
    sections = list(payload["sections"])  # type: ignore[arg-type]
    sections[0], sections[1] = sections[1], sections[0]
    payload["sections"] = sections

    with pytest.raises(ValidationError):
        GeneratedSessionOutput(**payload)


def test_generated_session_output_rejects_retired_top_level_fields() -> None:
    payload = _valid_payload()
    payload["main_objective"] = "Recover the stabilised arcane core."
    payload["twist"] = "The manticore they spared is guarding the entrance."
    payload["encounters"] = []

    with pytest.raises(ValidationError):
        GeneratedSessionOutput(**payload)


def test_generated_session_output_rejects_unknown_section_origin() -> None:
    payload = _valid_payload()
    sections = payload["sections"]
    assert isinstance(sections, list)
    sections[0]["origin"] = "llm"

    with pytest.raises(ValidationError):
        GeneratedSessionOutput(**payload)


def test_content_for_persistence_emits_all_seven_sections_and_continuity_links() -> (
    None
):
    output = GeneratedSessionOutput(**_valid_payload())

    content = output.content_for_persistence()

    assert tuple(section.id for section in content.sections) == CANONICAL_SECTION_IDS
    assert all(section.origin == "scribe" for section in content.sections)
    assert content.title == "Threads in the Mine"
    assert content.continuity_links[0].memory_fact_id == "memory-1"


def test_generated_content_rejects_a_missing_or_blank_title() -> None:
    from app.modules.generation.application.contracts import GeneratedContent

    section = _section("synopsis")
    with pytest.raises(ValidationError):
        GeneratedContent(sections=[section], title="")
    with pytest.raises(ValidationError):
        GeneratedContent(sections=[section])


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
