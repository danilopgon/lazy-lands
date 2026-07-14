"""Tests for bounded AI generation direction input."""

import pytest
from pydantic import ValidationError

from app.modules.generation.application.contracts import DirectionInput


def test_direction_input_rejects_oversized_instructions() -> None:
    with pytest.raises(ValidationError):
        DirectionInput(additional_instructions="x" * 2_001)
