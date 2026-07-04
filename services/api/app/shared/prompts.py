"""Shared Jinja prompt-render helper.

First prompt-rendering infrastructure in the codebase (design Decision 3);
sets the convention future AI modules (sessions, memory, generation) reuse.
Loader search paths are every ``modules/*/prompts/`` directory so templates
are referenced by bare filename (e.g. ``extract_campaign_v1.jinja``).
"""

from pathlib import Path

from jinja2 import Environment, FileSystemLoader, StrictUndefined

_MODULES_DIR = Path(__file__).resolve().parent.parent / "modules"


def _prompt_search_paths() -> list[str]:
    """Resolve every existing ``modules/*/prompts`` directory."""
    return [str(path) for path in sorted(_MODULES_DIR.glob("*/prompts"))]


_env = Environment(
    loader=FileSystemLoader(_prompt_search_paths()),
    # Prompts are plain text sent to an LLM, not HTML — escaping would
    # corrupt the DM's premise (quotes, ampersands, etc.).
    autoescape=False,  # noqa: S701
    # A typo'd template variable must fail loudly at render time rather than
    # silently rendering a blank prompt.
    undefined=StrictUndefined,
    trim_blocks=True,
    lstrip_blocks=True,
)


def _template_matches(template_name: str) -> list[Path]:
    """Find prompt files matching a bare template name across loader roots."""
    loader = _env.loader
    if not isinstance(loader, FileSystemLoader):
        return []

    return [
        candidate
        for search_path in loader.searchpath
        if (candidate := Path(search_path) / template_name).is_file()
    ]


def render_prompt(template_name: str, /, **context: object) -> str:
    """Render a module prompt template by bare filename.

    Args:
        template_name: Filename of the template (e.g. ``extract_campaign_v1.jinja``),
            resolved against every ``modules/*/prompts`` search path.
        **context: Template variables. A missing variable raises
            ``jinja2.exceptions.UndefinedError`` (StrictUndefined).

    Returns:
        The rendered prompt string.
    """
    if "/" in template_name or "\\" in template_name:
        raise ValueError("Prompt templates must be addressed by bare filename")

    matches = _template_matches(template_name)

    if len(matches) > 1:
        raise ValueError(f"Prompt template name is ambiguous: {template_name}")

    return _env.get_template(template_name).render(**context)
