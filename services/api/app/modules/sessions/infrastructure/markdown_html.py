"""Markdown-to-sanitized-HTML conversion for exported session section bodies."""

import nh3
from markdown_it import MarkdownIt

# ``html: False`` makes the parser escape raw HTML in the source as literal text
# instead of passing it through. This preserves literal angle-bracket content in
# DM notes (e.g. ``Meet <Aldor> at dawn``, ``<villain>``) that sanitizing away
# unknown tags would otherwise drop, and it keeps raw HTML from ever reaching the
# sanitizer (defense in depth on top of the nh3 allowlist below).
_markdown = MarkdownIt("commonmark", {"html": False})

_ALLOWED_TAGS = {
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "p",
    "ul",
    "ol",
    "li",
    "strong",
    "em",
    "a",
    "blockquote",
    "code",
    "pre",
}
_ALLOWED_ATTRIBUTES = {"a": {"href"}}
_ALLOWED_URL_SCHEMES = {"http", "https", "mailto"}


def markdown_to_safe_html(body: str) -> str:
    """Convert a CommonMark section body into sanitized, safe-to-embed HTML.

    Renders ``body`` as CommonMark and sanitizes the result against an
    allowlist of formatting tags/attributes, neutralizing script tags,
    event-handler attributes, and non-allowlisted URL schemes (e.g.
    ``javascript:``) by omission from the allowlist.
    """
    rendered = _markdown.render(body)
    return nh3.clean(
        rendered,
        tags=_ALLOWED_TAGS,
        attributes=_ALLOWED_ATTRIBUTES,
        url_schemes=_ALLOWED_URL_SCHEMES,
        link_rel=None,
        clean_content_tags={"script"},
    )
