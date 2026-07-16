"""Tests for the generation prompt language contracts.

The generation prompts are written in English, so without an explicit rule the
Scribe defaults to English output even when the DM's campaign is in another
language. The carve-outs matter as much as the rule itself: ``id``, ``label``,
and ``origin`` are constrained values, and a translated ``id`` fails
``GeneratedSessionOutput``'s canonical-section validator.
"""

from __future__ import annotations

import pytest

from app.modules.generation.application.contracts import CANONICAL_SECTION_IDS
from app.shared.prompts import render_prompt


def _campaign() -> dict[str, object]:
    return {
        "title": "Sombras",
        "description": "Intriga en una ciudad costera.",
        "world_state": "Invierno.",
        "accumulated_summary": "Herman fue humillado.",
        "summarized_up_to_session": 7,
    }


def _generate_context() -> dict[str, object]:
    return {
        "campaign": _campaign(),
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


def _regenerate_context() -> dict[str, object]:
    return {
        "campaign": _campaign(),
        "npcs": [],
        "factions": [],
        "arcs": [],
        "memory_facts": [],
        "current_sections": [
            {"id": "synopsis", "label": "Synopsis", "body": "Old synopsis."}
        ],
    }


def _collapse(text: str) -> str:
    return " ".join(text.lower().split())


def test_generate_session_v2_binds_free_text_to_the_campaign_language() -> None:
    rendered = render_prompt("generate_session_v2.jinja", **_generate_context())

    collapsed = _collapse(rendered)
    assert "same language" in collapsed
    assert '"title", every section\'s "body"' in rendered


def test_generate_session_v2_exempts_id_label_and_origin_from_the_language_rule() -> (
    None
):
    """``id`` is the sharp edge: it is enum-by-validator rather than a Literal,
    so a naive "translate every string" reading yields "sinopsis" and fails
    ``_validate_canonical_sections`` server-side."""
    rendered = render_prompt("generate_session_v2.jinja", **_generate_context())

    assert 'does NOT apply to "id", "label", or "origin"' in rendered


@pytest.mark.parametrize("section_id", CANONICAL_SECTION_IDS)
def test_each_regenerate_template_binds_body_to_the_campaign_language(
    section_id: str,
) -> None:
    rendered = render_prompt(
        f"regenerate_section_{section_id}_v1.jinja", **_regenerate_context()
    )

    assert "same language" in _collapse(rendered)


@pytest.mark.parametrize("section_id", CANONICAL_SECTION_IDS)
def test_each_regenerate_template_anchors_language_to_the_campaign_not_the_draft(
    section_id: str,
) -> None:
    """Anchoring a rewrite to ``current_sections`` would be circular: drafts
    generated before this fix are in English, so a Spanish campaign would keep
    regenerating English sections forever."""
    rendered = render_prompt(
        f"regenerate_section_{section_id}_v1.jinja", **_regenerate_context()
    )

    assert "NOT to the existing draft sections" in rendered


@pytest.mark.parametrize("section_id", CANONICAL_SECTION_IDS)
def test_canonical_section_ids_stay_untranslated_in_regenerate_templates(
    section_id: str,
) -> None:
    rendered = render_prompt(
        f"regenerate_section_{section_id}_v1.jinja", **_regenerate_context()
    )

    assert f'"{section_id}" section' in rendered
