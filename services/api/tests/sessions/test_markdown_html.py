"""Unit tests for Markdown-to-sanitized-HTML conversion of section bodies."""

from __future__ import annotations

from app.modules.sessions.infrastructure.markdown_html import markdown_to_safe_html


def test_headings_render_as_heading_tags() -> None:
    html = markdown_to_safe_html("# One\n\n## Two\n\n### Three")

    assert "<h1>One</h1>" in html
    assert "<h2>Two</h2>" in html
    assert "<h3>Three</h3>" in html


def test_unordered_list_renders_as_ul_li() -> None:
    html = markdown_to_safe_html("- item one\n- item two")

    assert "<ul>" in html
    assert "<li>item one</li>" in html
    assert "<li>item two</li>" in html


def test_ordered_list_renders_as_ol_li() -> None:
    html = markdown_to_safe_html("1. item one\n2. item two")

    assert "<ol>" in html
    assert "<li>item one</li>" in html
    assert "<li>item two</li>" in html


def test_bold_and_italic_render_as_strong_em() -> None:
    html = markdown_to_safe_html("**bold** and *italic* text")

    assert "<strong>bold</strong>" in html
    assert "<em>italic</em>" in html


def test_link_renders_as_anchor_with_href() -> None:
    html = markdown_to_safe_html("[text](https://example.com)")

    assert '<a href="https://example.com">text</a>' in html


def test_plain_text_renders_unchanged_as_a_single_paragraph() -> None:
    html = markdown_to_safe_html("The party rested at the inn.")

    assert html.strip() == "<p>The party rested at the inn.</p>"


def test_soft_line_breaks_are_preserved() -> None:
    html = markdown_to_safe_html("Beat one\nBeat two")

    # Single newlines survive as <br> so line-separated notes keep their
    # structure in the PDF (matching the app preview), not collapsed to a space.
    assert "<br" in html
    assert "Beat one" in html
    assert "Beat two" in html


def test_script_tag_is_neutralized_as_literal_text() -> None:
    html = markdown_to_safe_html("Before <script>alert('x')</script> after")

    assert "<script>" not in html  # no executable element reaches the PDF
    assert "&lt;script&gt;" in html  # preserved as escaped literal, not dropped
    assert "Before" in html
    assert "after" in html


def test_img_onerror_is_neutralized_as_literal_text() -> None:
    html = markdown_to_safe_html('<img src=x onerror="alert(1)">')

    assert "<img" not in html  # no active image element → no onerror handler
    assert "&lt;img" in html  # preserved as escaped literal, not dropped


def test_literal_angle_bracket_text_is_preserved() -> None:
    html = markdown_to_safe_html("Meet <Aldor> at dawn; beware the <villain>.")

    # Angle-bracketed DM notes/placeholders must survive the export (escaped),
    # not be silently dropped as unknown HTML tags.
    assert "Aldor" in html
    assert "villain" in html
    assert "<aldor>" not in html.lower()


def test_javascript_url_in_link_is_neutralized() -> None:
    html = markdown_to_safe_html("[click me](javascript:alert(1))")

    assert "<a" not in html
    assert 'href="javascript:' not in html


def test_raw_html_injection_mixed_with_markdown_still_formats_surrounding_text() -> (
    None
):
    html = markdown_to_safe_html(
        "**important** notice <script>alert('x')</script> more **bold** text"
    )

    assert "<script>" not in html
    assert html.count("<strong>") == 2
