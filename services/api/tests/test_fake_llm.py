import pytest
from pydantic import BaseModel

from app.shared.llm.errors import LlmOutputValidationError
from app.shared.llm.providers.fake import FakeLlmProvider
from app.shared.llm.port import LlmProvider


class TestSchema(BaseModel):
    """Representative in-test schema for port validation tests."""

    name: str
    level: int


class FencedTestSchema(BaseModel):
    """Schema for fence-strip verification on the fake path."""

    value: str


class UnregisteredSchema(BaseModel):
    """Schema that is never registered — used for error-path tests."""

    x: int
    """Representative in-test schema for port validation tests."""

    name: str
    level: int


# LLM-SEAM-003a: LlmProvider Protocol has complete_text(prompt: str) -> str
@pytest.mark.asyncio
async def test_003a_protocol_has_complete_text() -> None:
    provider: LlmProvider = FakeLlmProvider()
    result = await provider.complete_text("hello")
    assert isinstance(result, str)
    assert len(result) > 0


# LLM-SEAM-003b: LlmProvider Protocol has complete_json(prompt, schema) -> T
@pytest.mark.asyncio
async def test_003b_protocol_has_complete_json_signature() -> None:
    provider: LlmProvider = FakeLlmProvider()
    assert hasattr(provider, "complete_json")


# LLM-SEAM-003c: Old complete(prompt) -> str method is NOT present
def test_003c_old_complete_is_absent() -> None:
    provider = FakeLlmProvider()
    assert not hasattr(provider, "complete")


# LLM-SEAM-003d: FakeLlmProvider satisfies the Protocol structurally
def test_003d_fake_satisfies_protocol() -> None:
    provider = FakeLlmProvider()
    # Structural check: both new methods exist
    assert hasattr(provider, "complete_text")
    assert hasattr(provider, "complete_json")


# LLM-SEAM-003e: complete_json returns a typed instance (full test in Phase 3)
# Rewriting existing test: complete() -> complete_text(), assert isinstance str
@pytest.mark.asyncio
async def test_fake_llm_provider_completes_with_non_empty_text() -> None:
    provider: LlmProvider = FakeLlmProvider()
    result = await provider.complete_text("Summarize the last session")
    assert isinstance(result, str)
    assert len(result) > 0


# ── Phase 3: Per-schema fixture fake (LLM-SEAM-004, LLM-SEAM-006) ──


# LLM-SEAM-004a: complete_text includes the prompt in its echo
@pytest.mark.asyncio
async def test_004a_complete_text_includes_prompt() -> None:
    provider = FakeLlmProvider()
    result = await provider.complete_text("hello world")
    assert isinstance(result, str)
    assert "hello world" in result


# LLM-SEAM-004b: register + complete_json returns typed instance
@pytest.mark.asyncio
async def test_004b_register_and_complete_json() -> None:
    provider = FakeLlmProvider()
    provider.register(TestSchema, {"name": "Gandalf", "level": 20})
    result = await provider.complete_json("prompt", TestSchema)
    assert isinstance(result, TestSchema)
    assert result.name == "Gandalf"
    assert result.level == 20


# LLM-SEAM-004c: invalid fixture causes LlmOutputValidationError through guard
@pytest.mark.asyncio
async def test_004c_fixture_validates_through_guard() -> None:
    provider = FakeLlmProvider()
    provider.register(TestSchema, {"name": "Gandalf", "level": "not_a_number"})
    with pytest.raises(LlmOutputValidationError) as exc_info:
        await provider.complete_json("prompt", TestSchema)
    assert exc_info.value.retryable is True
    assert exc_info.value.schema_name == "TestSchema"


# LLM-SEAM-004d: fenced fixture still validates — guard runs on fake path
@pytest.mark.asyncio
async def test_004d_fenced_fixture_validates() -> None:
    provider = FakeLlmProvider()
    provider.register(
        FencedTestSchema,
        {"value": "```json\n42\n```"},
    )
    result = await provider.complete_json("prompt", FencedTestSchema)
    assert isinstance(result, FencedTestSchema)


# LLM-SEAM-004e: unregistered schema raises descriptive error naming the schema
@pytest.mark.asyncio
async def test_004e_unregistered_schema_raises() -> None:
    provider = FakeLlmProvider()
    with pytest.raises(KeyError) as exc_info:
        await provider.complete_json("prompt", UnregisteredSchema)
    assert "UnregisteredSchema" in str(exc_info.value)


# LLM-SEAM-004f: old complete() is absent (redundant with 003c, explicit here)
def test_004f_old_complete_absent() -> None:
    provider = FakeLlmProvider()
    assert not hasattr(provider, "complete")


# LLM-SEAM-004g: fake.py does not import from modules/*
def test_004g_no_modules_import() -> None:
    import ast
    from pathlib import Path

    fake_path = (
        Path(__file__).parent.parent
        / "app"
        / "shared"
        / "llm"
        / "providers"
        / "fake.py"
    )
    tree = ast.parse(fake_path.read_text(encoding="utf-8"))
    for node in ast.walk(tree):
        if isinstance(node, (ast.Import, ast.ImportFrom)):
            line = ast.unparse(node) if hasattr(ast, "unparse") else str(node)
            assert "modules" not in line, f"Prohibited import in fake.py: {line}"


# LLM-SEAM-006a: 100 identical invocations return equal results (determinism)
@pytest.mark.asyncio
async def test_006a_deterministic_complete_json() -> None:
    provider = FakeLlmProvider()
    provider.register(TestSchema, {"name": "Gandalf", "level": 20})
    first = await provider.complete_json("prompt", TestSchema)
    for _ in range(99):
        result = await provider.complete_json("prompt", TestSchema)
        assert result == first


# LLM-SEAM-006b: no httpx, socket, random imports in fake.py
def test_006b_no_network_or_random_imports() -> None:
    import inspect

    from app.shared.llm.providers import fake as fake_module

    source = inspect.getsource(fake_module)
    forbidden = ["httpx", "socket", "asyncio.sleep", "random"]
    for keyword in forbidden:
        assert keyword not in source, f"'fake.py' must not import '{keyword}'"
