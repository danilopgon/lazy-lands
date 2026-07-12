"""Render tests for the generation prompt templates."""

from __future__ import annotations

from app.shared.prompts import render_prompt


def _context() -> dict[str, object]:
    return {
        "campaign": {
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
        "goal": None,
        "tone": "Balanced",
        "pace": "Balanced",
        "difficulty": "Standard",
        "additional_instructions": None,
    }


def test_generate_session_v2_renders_seven_section_instructions() -> None:
    rendered = render_prompt("generate_session_v2.jinja", **_context())

    for section_id in (
        "synopsis",
        "goal",
        "opening",
        "beats",
        "encounters",
        "factions",
        "arcs",
    ):
        assert f'"id": "{section_id}"' in rendered


def test_generate_session_v2_folds_twist_into_beats_and_opening_instructions() -> None:
    rendered = render_prompt("generate_session_v2.jinja", **_context())

    schema_block = rendered.split("Return JSON matching this exact shape:")[1]

    assert "twist" in rendered.lower()
    assert '"twist"' not in schema_block
    assert '"main_objective"' not in schema_block
