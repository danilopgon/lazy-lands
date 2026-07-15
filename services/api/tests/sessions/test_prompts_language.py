"""Tests for the suggest-memory and summarize-campaign prompt language contracts.

Block 7b remediation: the Scribe must (1) propose ``type`` from a finite
allowed-values list only, and (2) write suggestions and summaries in the same
language as the DM's session input.
"""

from __future__ import annotations

from app.shared.prompts import render_prompt


def test_suggest_memory_prompt_enumerates_the_allowed_type_values() -> None:
    rendered = render_prompt(
        "suggest_memory_facts_v1.jinja",
        accumulated_summary=None,
        world_state=None,
        npcs=[],
        factions=[],
        arcs=[],
        memory_facts=[],
        session={"summary": "The party arrived.", "consequences": None},
    )

    for allowed in (
        "consequence",
        "relationship",
        "secret",
        "promise",
        "tension",
        "revelation",
        "item",
        "arc_progress",
    ):
        assert allowed in rendered


def _collapse(text: str) -> str:
    return " ".join(text.lower().split())


def test_suggest_memory_prompt_uses_the_same_language_as_session_input() -> None:
    rendered = render_prompt(
        "suggest_memory_facts_v1.jinja",
        accumulated_summary=None,
        world_state=None,
        npcs=[],
        factions=[],
        arcs=[],
        memory_facts=[],
        session={"summary": "The party arrived.", "consequences": None},
    )

    assert "same language" in _collapse(rendered)


def test_suggest_prompt_binds_related_to_session_language() -> None:
    """Issue #56: the free-text ``related`` values must follow the DM's input
    language too. Previously only ``content`` and ``reason`` were covered, so
    ``related`` defaulted to English regardless of the session language."""
    rendered = render_prompt(
        "suggest_memory_facts_v1.jinja",
        accumulated_summary=None,
        world_state=None,
        npcs=[],
        factions=[],
        arcs=[],
        memory_facts=[],
        session={"summary": "The party arrived.", "consequences": None},
    )

    collapsed = _collapse(rendered)
    # The language-rule sentence itself (not just the JSON schema) must bind the
    # "related" values to the session language.
    assert 'content, reason, and every value in "related"' in collapsed


def test_summarize_campaign_prompt_uses_the_same_language_as_session_input() -> None:
    rendered = render_prompt(
        "summarize_campaign_v1.jinja",
        previous_summary=None,
        sessions=[{"session_number": 1, "summary": "s", "consequences": None}],
    )

    assert "same language" in _collapse(rendered)
