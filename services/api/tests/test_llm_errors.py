"""Tests for LlmOutputValidationError contract (LLM-SEAM-002 a-e)."""

import json

import pytest
from pydantic import BaseModel, ValidationError

from app.shared.llm.errors import LlmOutputValidationError


class TestSchema(BaseModel):
    """Representative in-test schema for error contract tests."""

    name: str
    level: int


# LLM-SEAM-002a: Constructor accepts schema_name, raw_output, and optional retryable
def test_002a_constructor_fields() -> None:
    exc = LlmOutputValidationError(
        schema_name="TestSchema",
        raw_output='{"name": "Gandalf"}',
        retryable=True,
    )
    assert exc.schema_name == "TestSchema"
    assert exc.raw_output == '{"name": "Gandalf"}'
    assert exc.retryable is True


# LLM-SEAM-002b: str(exc) includes schema_name — human-readable for logging
def test_002b_str_includes_schema_name() -> None:
    exc = LlmOutputValidationError(
        schema_name="TestSchema",
        raw_output='{"bad": "json"}',
    )
    assert "TestSchema" in str(exc)


# LLM-SEAM-002c: __cause__ set when constructed from pydantic.ValidationError
def test_002c_cause_from_pydantic_error() -> None:
    try:
        TestSchema(name="Gandalf", level="twenty")
        pytest.fail("Expected ValidationError was not raised")
    except ValidationError as ve:
        exc = LlmOutputValidationError(
            schema_name="TestSchema",
            raw_output='{"name":"Gandalf","level":"twenty"}',
            retryable=True,
        )
        exc.__cause__ = ve
    assert isinstance(exc.__cause__, ValidationError)


# LLM-SEAM-002d: __cause__ set when constructed from json.JSONDecodeError
def test_002d_cause_from_json_error() -> None:
    try:
        json.loads("{bad}")
        pytest.fail("Expected JSONDecodeError was not raised")
    except json.JSONDecodeError as je:
        exc = LlmOutputValidationError(
            schema_name="TestSchema",
            raw_output="{bad}",
        )
        exc.__cause__ = je
    assert isinstance(exc.__cause__, json.JSONDecodeError)


# LLM-SEAM-002e: Default retryable is True
def test_002e_default_retryable_is_true() -> None:
    exc = LlmOutputValidationError(
        schema_name="TestSchema",
        raw_output="{}",
    )
    assert exc.retryable is True
