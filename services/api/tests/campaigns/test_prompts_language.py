"""Tests for the campaign-ingestion prompt language contract.

The extraction prompt is written in English, so without an explicit rule the
Scribe defaults to English output even when the DM's premise is in another
language. ``suggest_memory_facts`` and ``summarize_campaign`` already carried
this rule; ingestion did not.
"""

from __future__ import annotations

from app.shared.prompts import render_prompt

_PREMISE = "Una ciudad costera donde los gremios guerrean en la niebla."


def _collapse(text: str) -> str:
    return " ".join(text.lower().split())


def test_extract_campaign_prompt_uses_the_same_language_as_the_premise() -> None:
    rendered = render_prompt("extract_campaign_v1.jinja", raw_text=_PREMISE)

    assert "same language" in _collapse(rendered)


def test_extract_campaign_prompt_binds_every_string_value_to_the_premise_language() -> (
    None
):
    """The scaffold's nested npc/faction/arc fields are free text and must
    follow the premise language too, not just the top-level title."""
    rendered = render_prompt("extract_campaign_v1.jinja", raw_text=_PREMISE)

    collapsed = _collapse(rendered)
    assert "write every string value" in collapsed
    assert "every field of each npc, faction, and arc" in collapsed


def test_extract_campaign_prompt_exempts_priority_from_the_language_rule() -> None:
    """``priority`` is validated against literal English keywords, so the
    language rule must carve it out — a translated "alta" fails validation."""
    rendered = render_prompt("extract_campaign_v1.jinja", raw_text=_PREMISE)

    assert 'does NOT apply to "priority"' in rendered
    assert '"priority": "high | medium | low"' in rendered
