"""Render-smoke tests for the 7 per-section regenerate prompt templates.

Each template must resolve and render under ``render_prompt``'s first-match
loader across every ``modules/*/prompts/`` directory, and the shared
``_regenerate_context.jinja`` macro include must resolve too. StrictUndefined
means any missing context variable fails loudly here rather than silently
rendering a blank prompt.
"""

from __future__ import annotations

import pytest

from app.modules.generation.application.contracts import CANONICAL_SECTION_IDS
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
        "current_sections": [
            {"id": "synopsis", "label": "Synopsis", "body": "Old synopsis."}
        ],
    }


@pytest.mark.parametrize("section_id", CANONICAL_SECTION_IDS)
def test_each_regenerate_section_template_resolves_and_renders(
    section_id: str,
) -> None:
    rendered = render_prompt(f"regenerate_section_{section_id}_v1.jinja", **_context())

    assert f'"{section_id}"' in rendered
    assert "Old synopsis." in rendered
    assert '"body": "string"' in rendered
