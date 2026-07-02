"""Tests for parse_llm_json — the shared JSON guard (LLM-SEAM-001 a-g)."""

import pytest
from pydantic import BaseModel

from app.shared.llm.errors import LlmOutputValidationError
from app.shared.llm.json_guard import parse_llm_json


class TestSchema(BaseModel):
    """Representative in-test schema for guard validation tests."""

    name: str
    level: int


# LLM-SEAM-001a: Valid JSON without fences returns typed instance
def test_001a_valid_json_without_fences() -> None:
    raw = '{"name": "Gandalf", "level": 20}'
    result = parse_llm_json(raw, TestSchema)
    assert isinstance(result, TestSchema)
    assert result.name == "Gandalf"
    assert result.level == 20


# LLM-SEAM-001b: JSON wrapped in ```json ``` fences returns typed instance
def test_001b_json_in_json_fences() -> None:
    raw = '```json\n{"name": "Gandalf", "level": 20}\n```'
    result = parse_llm_json(raw, TestSchema)
    assert isinstance(result, TestSchema)
    assert result.name == "Gandalf"
    assert result.level == 20


# LLM-SEAM-001c: JSON wrapped in bare ``` ``` fences returns typed instance
def test_001c_json_in_bare_fences() -> None:
    raw = '```\n{"name": "Gandalf", "level": 20}\n```'
    result = parse_llm_json(raw, TestSchema)
    assert isinstance(result, TestSchema)
    assert result.name == "Gandalf"
    assert result.level == 20


# LLM-SEAM-001d: JSON with preceding/following prose text
def test_001d_json_with_surrounding_prose() -> None:
    raw = 'Here is the character:\n{"name": "Gandalf", "level": 20}\nHope this helps.'
    result = parse_llm_json(raw, TestSchema)
    assert isinstance(result, TestSchema)
    assert result.name == "Gandalf"
    assert result.level == 20


# LLM-SEAM-001e: Invalid JSON raises LlmOutputValidationError with retryable=True
def test_001e_invalid_json_raises_error() -> None:
    raw = '{"name": "Gandalf", "level": 20'  # missing closing brace
    with pytest.raises(LlmOutputValidationError) as exc_info:
        parse_llm_json(raw, TestSchema)
    assert exc_info.value.retryable is True
    assert exc_info.value.schema_name == "TestSchema"
    assert exc_info.value.raw_output == raw
    assert exc_info.value.__cause__ is not None


# LLM-SEAM-001f: Schema field-type mismatch raises LlmOutputValidationError
def test_001f_type_mismatch_raises_error() -> None:
    raw = '{"name": "Gandalf", "level": "twenty"}'
    with pytest.raises(LlmOutputValidationError) as exc_info:
        parse_llm_json(raw, TestSchema)
    assert exc_info.value.retryable is True
    assert exc_info.value.schema_name == "TestSchema"
    assert exc_info.value.__cause__ is not None


# LLM-SEAM-001g: Missing required fields raises LlmOutputValidationError
def test_001g_missing_required_fields_raises_error() -> None:
    raw = '{"name": "Gandalf"}'  # missing level
    with pytest.raises(LlmOutputValidationError) as exc_info:
        parse_llm_json(raw, TestSchema)
    assert exc_info.value.retryable is True
    assert exc_info.value.schema_name == "TestSchema"
    assert exc_info.value.__cause__ is not None
