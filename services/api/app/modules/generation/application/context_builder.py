"""Prompt-context assembly for session generation."""

from typing import Any

from app.modules.generation.application.contracts import GenerationDirection


def estimate_tokens(text: str) -> int:
    """Estimate prompt size with the project-standard ``len(text)//4`` heuristic."""
    return len(text) // 4


def build_prompt_context(
    raw_context: dict[str, Any], direction: GenerationDirection
) -> dict[str, Any]:
    """Build the exact template context, excluding non-generation data."""
    return {
        "campaign": raw_context.get("campaign") or {},
        "npcs": list(raw_context.get("npcs") or []),
        "factions": list(raw_context.get("factions") or []),
        "arcs": list(raw_context.get("arcs") or []),
        "memory_facts": list(raw_context.get("memory_facts") or []),
        "goal": direction.goal,
        "tone": direction.tone,
        "pace": direction.pace,
        "difficulty": direction.difficulty,
        "additional_instructions": direction.additional_instructions,
    }
