"""Tests for OpenAiCompatibleProvider (LLM-SEAM-005 a-f)."""

import json

import httpx
import pytest
from pydantic import BaseModel

from app.shared.llm.errors import LlmOutputValidationError
from app.shared.llm.providers.openai_compatible import OpenAiCompatibleProvider


class TestSchema(BaseModel):
    """Representative in-test schema for adapter validation tests."""

    name: str
    level: int


def _mock_transport(handler):
    """Create an httpx.MockTransport from a handler function."""
    return httpx.MockTransport(handler)


def _mock_response(body: dict) -> httpx.Response:
    """Build a chat-completions-shaped httpx.Response."""
    return httpx.Response(
        200,
        json={"choices": [{"message": {"content": json.dumps(body)}}]},
    )


def _mock_text_response(text: str) -> httpx.Response:
    """Build a chat-completions-shaped response with raw text."""
    return httpx.Response(
        200,
        json={"choices": [{"message": {"content": text}}]},
    )


# LLM-SEAM-005a: complete_text with mocked transport — no network
@pytest.mark.asyncio
async def test_005a_complete_text_mocked() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        return _mock_text_response("world")

    client = httpx.AsyncClient(transport=_mock_transport(handler))
    provider = OpenAiCompatibleProvider(
        base_url="https://fake.example.com/v1",
        api_key="test-key",
        model="test-model",
        http_client=client,
    )
    result = await provider.complete_text("hello")
    assert result == "world"


# LLM-SEAM-005b: complete_json strips fences and validates through guard
@pytest.mark.asyncio
async def test_005b_complete_json_fences_through_guard() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        return _mock_text_response(
            '```json\n{"name": "Gandalf", "level": 20}\n```'
        )

    client = httpx.AsyncClient(transport=_mock_transport(handler))
    provider = OpenAiCompatibleProvider(
        base_url="https://fake.example.com/v1",
        api_key="test-key",
        model="test-model",
        http_client=client,
    )
    result = await provider.complete_json("prompt", TestSchema)
    assert isinstance(result, TestSchema)
    assert result.name == "Gandalf"
    assert result.level == 20


# LLM-SEAM-005c: invalid JSON from model raises LlmOutputValidationError
@pytest.mark.asyncio
async def test_005c_invalid_json_raises() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        return _mock_text_response("not json at all")

    client = httpx.AsyncClient(transport=_mock_transport(handler))
    provider = OpenAiCompatibleProvider(
        base_url="https://fake.example.com/v1",
        api_key="test-key",
        model="test-model",
        http_client=client,
    )
    with pytest.raises(LlmOutputValidationError) as exc_info:
        await provider.complete_json("prompt", TestSchema)
    assert exc_info.value.retryable is True


# LLM-SEAM-005d: valid JSON that fails Pydantic schema raises
@pytest.mark.asyncio
async def test_005d_schema_mismatch_raises() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        return _mock_text_response('{"name": "Gandalf", "level": "oops"}')

    client = httpx.AsyncClient(transport=_mock_transport(handler))
    provider = OpenAiCompatibleProvider(
        base_url="https://fake.example.com/v1",
        api_key="test-key",
        model="test-model",
        http_client=client,
    )
    with pytest.raises(LlmOutputValidationError) as exc_info:
        await provider.complete_json("prompt", TestSchema)
    assert exc_info.value.retryable is True


# LLM-SEAM-005e: constructor with http_client uses provided client
@pytest.mark.asyncio
async def test_005e_injected_client_is_used() -> None:
    call_count = 0

    def handler(request: httpx.Request) -> httpx.Response:
        nonlocal call_count
        call_count += 1
        return _mock_text_response("ok")

    client = httpx.AsyncClient(transport=_mock_transport(handler))
    provider = OpenAiCompatibleProvider(
        base_url="https://fake.example.com/v1",
        api_key="test-key",
        model="test-model",
        http_client=client,
    )
    await provider.complete_text("hello")
    assert call_count == 1


# LLM-SEAM-005f: httpx is the only HTTP dependency — no openai package import
def test_005f_no_openai_import() -> None:
    import ast
    from pathlib import Path

    adapter_path = (
        Path(__file__).parent.parent
        / "app"
        / "shared"
        / "llm"
        / "providers"
        / "openai_compatible.py"
    )
    tree = ast.parse(adapter_path.read_text(encoding="utf-8"))
    for node in ast.walk(tree):
        if isinstance(node, (ast.Import, ast.ImportFrom)):
            line = ast.unparse(node) if hasattr(ast, "unparse") else str(node)
            assert "openai" not in line, (
                f"openai_compatible.py must not import 'openai' package: {line}"
            )
