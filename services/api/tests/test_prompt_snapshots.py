"""Snapshot tests for the main LLM prompts.

These freeze the fully rendered output of the four core prompt templates so that
any unintended drift in a prompt (wording, ordering, schema block) is caught in
review. The contexts are deterministic and representative — populated NPCs,
factions, arcs, and memory facts — so the snapshot exercises the loop branches,
not just the empty-list fallbacks.

Regenerate intentionally after a deliberate prompt edit:

    uv run pytest tests/test_prompt_snapshots.py --snapshot-update
"""

from __future__ import annotations

from app.shared.prompts import render_prompt


def _generation_context() -> dict[str, object]:
    return {
        "campaign": {
            "title": "Shadows over Karrenmoor",
            "description": "A coastal city where guilds war in the fog.",
            "world_state": "Winter grips the harbor; the docks are tense.",
            "accumulated_summary": "Herman was publicly humiliated at the guild hall.",
            "summarized_up_to_session": 7,
        },
        "npcs": [
            {
                "name": "Herman Vale",
                "description": "Disgraced dockmaster.",
                "current_state": "Bitter and plotting.",
                "motivation": "Restore his standing.",
            }
        ],
        "factions": [
            {
                "name": "The Salt Guild",
                "description": "Controls the harbor trade.",
                "current_stance": "Hostile to outsiders.",
                "goals": "Monopolize the winter shipments.",
            }
        ],
        "arcs": [
            {
                "title": "The Drowned Ledger",
                "priority": "high",
                "description": "A missing account book implicates the guild.",
            }
        ],
        "memory_facts": [
            {
                "id": "mem-1",
                "type": "consequence",
                "importance": "high",
                "content": "Herman was humiliated at the guild hall.",
            }
        ],
        "goal": "Recover the drowned ledger before the guild does.",
        "tone": "Grim",
        "pace": "Fast",
        "difficulty": "Hard",
        "additional_instructions": "Feature a betrayal.",
    }


def _suggest_context() -> dict[str, object]:
    return {
        "accumulated_summary": "Herman was publicly humiliated at the guild hall.",
        "world_state": "Winter grips the harbor; the docks are tense.",
        "npcs": [{"name": "Herman Vale", "description": "Disgraced dockmaster."}],
        "factions": [
            {"name": "The Salt Guild", "description": "Controls the harbor trade."}
        ],
        "arcs": [
            {
                "title": "The Drowned Ledger",
                "description": "A missing account book implicates the guild.",
            }
        ],
        "memory_facts": [
            {
                "type": "consequence",
                "importance": "high",
                "content": "Herman was humiliated at the guild hall.",
            }
        ],
        "session": {
            "summary": "The party broke into the guild archive.",
            "consequences": "The Salt Guild now hunts them.",
        },
    }


def _summarize_context() -> dict[str, object]:
    return {
        "previous_summary": "Herman was publicly humiliated at the guild hall.",
        "sessions": [
            {
                "session_number": 8,
                "summary": "The party broke into the guild archive.",
                "consequences": "The Salt Guild now hunts them.",
            }
        ],
    }


def test_extract_campaign_prompt_snapshot(snapshot) -> None:
    rendered = render_prompt(
        "extract_campaign_v1.jinja",
        raw_text="A coastal city where guilds war in the fog of a long winter.",
    )
    assert rendered == snapshot


def test_generate_session_v2_prompt_snapshot(snapshot) -> None:
    rendered = render_prompt("generate_session_v2.jinja", **_generation_context())
    assert rendered == snapshot


def test_suggest_memory_facts_prompt_snapshot(snapshot) -> None:
    rendered = render_prompt("suggest_memory_facts_v1.jinja", **_suggest_context())
    assert rendered == snapshot


def test_summarize_campaign_prompt_snapshot(snapshot) -> None:
    rendered = render_prompt("summarize_campaign_v1.jinja", **_summarize_context())
    assert rendered == snapshot
