"""Tests for the shared Jinja prompt-render helper (design Decision 3)."""

from __future__ import annotations

import pytest
from jinja2.exceptions import UndefinedError


def test_render_prompt_renders_a_variable(tmp_path, monkeypatch) -> None:
    from app.shared import prompts as prompts_module

    fixture_dir = tmp_path / "prompts"
    fixture_dir.mkdir()
    (fixture_dir / "greet_v1.jinja").write_text("Hello, {{ name }}!", encoding="utf-8")

    monkeypatch.setattr(prompts_module._env.loader, "searchpath", [str(fixture_dir)])

    result = prompts_module.render_prompt("greet_v1.jinja", name="Gandalf")

    assert result == "Hello, Gandalf!"


def test_render_prompt_raises_on_missing_variable(tmp_path, monkeypatch) -> None:
    from app.shared import prompts as prompts_module

    fixture_dir = tmp_path / "prompts"
    fixture_dir.mkdir()
    (fixture_dir / "greet_v1.jinja").write_text("Hello, {{ name }}!", encoding="utf-8")

    monkeypatch.setattr(prompts_module._env.loader, "searchpath", [str(fixture_dir)])

    with pytest.raises(UndefinedError):
        prompts_module.render_prompt("greet_v1.jinja")
