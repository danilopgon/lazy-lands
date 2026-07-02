"""Shared JSON guard — the single validation path for all LLM output.

Both FakeLlmProvider and OpenAiCompatibleProvider route their raw model
output through parse_llm_json, ensuring identical fence-strip and
Pydantic validation across the fake and real paths.
"""

import json
import re

from pydantic import BaseModel, ValidationError

from app.shared.llm.errors import LlmOutputValidationError


def _strip_fences_and_prose(raw: str) -> str:
    """Remove Markdown code fences and surrounding prose from raw LLM output.

    Handles three common patterns from LLM responses:
    1. `` ```json ... ``` `` — labeled JSON code fence
    2. `` ``` ... ``` `` — bare code fence
    3. Leading/trailing prose text around the JSON object

    Returns the extracted JSON substring.
    """
    # Remove JSON-labeled fences: ```json ... ```
    match = re.search(r"```json\s*\n(.*?)\n```", raw, re.DOTALL)
    if match:
        return match.group(1).strip()

    # Remove bare fences: ``` ... ```
    match = re.search(r"```\s*\n(.*?)\n```", raw, re.DOTALL)
    if match:
        return match.group(1).strip()

    # Strip surrounding prose: find the outermost { ... } pair
    match = re.search(r"\{.*\}", raw, re.DOTALL)
    if match:
        return match.group(0)

    return raw


def parse_llm_json[T: BaseModel](raw: str, schema: type[T]) -> T:
    """Parse and validate raw LLM output against a Pydantic schema.

    This is the single validation path — both the fake and real providers
    converge here. Responsibilities:
    - Strip Markdown code fences and surrounding prose
    - Parse JSON via json.loads
    - Validate via schema.model_validate
    - Raise LlmOutputValidationError on any failure (never let raw parser
      errors propagate)

    Args:
        raw: The raw string output from the LLM (may contain fences/prose).
        schema: The Pydantic model class to validate against.

    Returns:
        A validated instance of the schema type.

    Raises:
        LlmOutputValidationError: If the output is not valid JSON or fails
            Pydantic validation. Always has retryable=True.
    """
    stripped = _strip_fences_and_prose(raw)

    try:
        data = json.loads(stripped)
    except json.JSONDecodeError as exc:
        raise LlmOutputValidationError(
            schema_name=schema.__name__,
            raw_output=raw,
            retryable=True,
        ) from exc

    try:
        return schema.model_validate(data)
    except ValidationError as exc:
        raise LlmOutputValidationError(
            schema_name=schema.__name__,
            raw_output=raw,
            retryable=True,
        ) from exc
