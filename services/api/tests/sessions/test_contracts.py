"""Contract tests for the finite MemoryType enum (Block 7b remediation)."""

from __future__ import annotations

import pytest
from pydantic import ValidationError

from app.modules.memory.api.schemas.requests import CreateMemoryFactRequest
from app.modules.sessions.application.contracts import (
    MemorySuggestion,
    MemorySuggestionsOutput,
)
from app.modules.sessions.domain.enums import MemoryType


def test_memory_type_is_a_finite_enum_of_eight_values() -> None:
    assert set(MemoryType) == {
        MemoryType.consequence,
        MemoryType.relationship,
        MemoryType.secret,
        MemoryType.promise,
        MemoryType.tension,
        MemoryType.revelation,
        MemoryType.item,
        MemoryType.arc_progress,
    }


def test_memory_type_values_are_stable_snake_lowercase_strings() -> None:
    assert {member.value for member in MemoryType} == {
        "consequence",
        "relationship",
        "secret",
        "promise",
        "tension",
        "revelation",
        "item",
        "arc_progress",
    }


def test_memory_suggestion_accepts_an_enum_type() -> None:
    suggestion = MemorySuggestion(
        content="Captain Vess owes the party a favor.",
        type="relationship",
        importance="high",
        reason="The favor changes future negotiations.",
        related=[],
    )
    assert suggestion.type is MemoryType.relationship


def test_memory_suggestion_rejects_a_free_text_type() -> None:
    with pytest.raises(ValidationError):
        MemorySuggestion(
            content="Halia now suspects the party of arson.",
            type="npc_state",
            importance="high",
            reason="Directly affects future NPC dialogue.",
            related=[],
        )


def test_memory_suggestions_output_rejects_a_non_enum_type() -> None:
    with pytest.raises(ValidationError):
        MemorySuggestionsOutput(
            suggestions=[
                {
                    "content": "x",
                    "type": "npc",
                    "importance": "medium",
                    "reason": "y",
                    "related": [],
                }
            ]
        )


def test_create_memory_fact_request_accepts_enum_type() -> None:
    request = CreateMemoryFactRequest(
        content="The guild remembers the arson.",
        type="consequence",
        importance="medium",
    )
    assert request.type == "consequence"


def test_create_memory_fact_request_rejects_free_text_type() -> None:
    with pytest.raises(ValidationError):
        CreateMemoryFactRequest(
            content="The guild remembers the arson.",
            type="Reputation",
            importance="medium",
        )
