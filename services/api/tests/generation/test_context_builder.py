"""Tests for generation prompt context assembly and token estimates."""

from __future__ import annotations

from app.modules.generation.application.context_builder import (
    build_prompt_context,
    estimate_tokens,
)
from app.modules.generation.application.contracts import GenerationDirection


def _raw_context() -> dict[str, object]:
    return {
        "campaign": {
            "id": "campaign-1",
            "title": "Sombras",
            "description": "Intrigue in Phandalin.",
            "world_state": "Winter is closing in.",
            "accumulated_summary": "The party humiliated Herman.",
            "summarized_up_to_session": 7,
        },
        "npcs": [{"id": "npc-1", "name": "Halia", "description": "Broker"}],
        "factions": [{"id": "fac-1", "name": "Zhentarim", "goals": "Leverage"}],
        "arcs": [{"id": "arc-1", "title": "Core", "status": "active"}],
        "memory_facts": [
            {"id": "mem-1", "content": "Herman was humiliated.", "status": "active"}
        ],
        "memory_suggestions": [{"content": "Dismissed suggestion must not leak."}],
        "private_notes": "Never send this to the Scribe.",
    }


def test_estimate_tokens_uses_len_divided_by_four() -> None:
    assert estimate_tokens("abcdefghijklmnop") == 4


def test_build_prompt_context_applies_defaults_and_keeps_empty_lists() -> None:
    raw = _raw_context()
    raw["arcs"] = []
    raw["memory_facts"] = []

    prompt_context = build_prompt_context(raw, GenerationDirection())

    assert prompt_context["campaign"]["title"] == "Sombras"
    assert prompt_context["arcs"] == []
    assert prompt_context["memory_facts"] == []
    assert prompt_context["tone"] == "Keep current, low-magic intrigue"
    assert prompt_context["pace"] == "Balanced"
    assert prompt_context["difficulty"] == "Standard"


def test_build_prompt_context_excludes_suggestions_and_private_notes() -> None:
    prompt_context = build_prompt_context(
        _raw_context(), GenerationDirection(goal=" Find core ")
    )

    assert "memory_suggestions" not in prompt_context
    assert "private_notes" not in prompt_context
    assert prompt_context["goal"] == "Find core"


def test_build_prompt_context_caps_content_deterministically() -> None:
    raw = _raw_context()
    raw["campaign"]["description"] = "x" * 5_000
    raw["npcs"] = [
        {"id": str(index), "name": "n", "description": "x" * 5_000}
        for index in range(20)
    ]

    prompt_context = build_prompt_context(raw, GenerationDirection())

    assert len(prompt_context["campaign"]["description"]) == 1_000
    assert len(prompt_context["npcs"]) == 10
    assert len(prompt_context["npcs"][0]["description"]) == 1_000
