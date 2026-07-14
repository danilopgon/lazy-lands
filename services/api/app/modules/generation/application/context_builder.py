"""Prompt-context assembly for session generation."""

from typing import Any

from app.modules.generation.application.contracts import GenerationDirection

_MAX_CONTEXT_ITEMS = 10
_MAX_CONTEXT_TEXT_LENGTH = 1_000


def estimate_tokens(text: str) -> int:
    """Estimate prompt size with the project-standard ``len(text)//4`` heuristic."""
    return len(text) // 4


def build_prompt_context(
    raw_context: dict[str, Any], direction: GenerationDirection
) -> dict[str, Any]:
    """Build the exact template context, excluding non-generation data."""
    return {
        "campaign": _limit_context(raw_context.get("campaign") or {}),
        "npcs": _limit_context(raw_context.get("npcs") or []),
        "factions": _limit_context(raw_context.get("factions") or []),
        "arcs": _limit_context(raw_context.get("arcs") or []),
        "memory_facts": _limit_context(raw_context.get("memory_facts") or []),
        "goal": direction.goal,
        "tone": direction.tone,
        "pace": direction.pace,
        "difficulty": direction.difficulty,
        "additional_instructions": direction.additional_instructions,
    }


def _limit_context(value: Any) -> Any:
    """Return a deterministic, bounded copy of relational prompt context."""
    if isinstance(value, str):
        return value[:_MAX_CONTEXT_TEXT_LENGTH]
    if isinstance(value, list):
        return [_limit_context(item) for item in value[:_MAX_CONTEXT_ITEMS]]
    if isinstance(value, dict):
        return {key: _limit_context(item) for key, item in value.items()}
    return value
