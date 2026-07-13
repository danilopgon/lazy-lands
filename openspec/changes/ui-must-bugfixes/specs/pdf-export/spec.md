# Delta for pdf-export

## ADDED Requirements

### Requirement: Render section bodies as sanitized Markdown

The system MUST convert each exported section's Markdown body (headings, lists,
bold/italic, links, paragraphs) into formatted HTML before rendering, so the PDF shows
formatted output instead of literal Markdown syntax. The converted HTML MUST be
sanitized against an allowlist of safe formatting tags before being emitted; only this
sanitized, converted body MAY bypass the renderer's default output escaping. Every other
rendered field MUST remain escaped as plain text. Adversarial content embedded in a
section body (script tags, event-handler attributes, `javascript:` URLs, or raw HTML
injection) MUST be neutralized in the rendered output. A section whose body is plain
text with no Markdown syntax MUST render unchanged (as a plain paragraph), preserving
current behavior for non-Markdown content. Sanitization and rendering MUST NOT block PDF
generation for exportable sessions — an export request with adversarial content in a
section body still produces a valid PDF, with the offending content neutralized rather
than causing a failure. Ownership scoping for the export endpoint is unchanged by this
requirement.

#### Scenario: Representative Markdown renders as formatted HTML

- GIVEN an owned, exportable session has a persisted section whose body is
  `"## Heading\n\n- item one\n- item two\n\n**bold** and *italic* text with a [link](https://example.com)."`
- WHEN the DM exports the PDF
- THEN the rendered section shows a formatted heading, a bulleted list, bold and italic
  text, and a clickable link, with no literal `#`, `-`, `**`, or `*` markdown syntax
  visible

#### Scenario: Injection payload is neutralized and export still succeeds

- GIVEN an owned, exportable session has a persisted section whose body contains
  `"<script>alert('x')</script>"` and an `<img src=x onerror="alert(1)">` tag mixed with
  ordinary Markdown text
- WHEN the DM exports the PDF
- THEN the response is a valid, non-empty PDF
- AND no script executes and no event-handler attribute or `javascript:` URL is present
  in the rendered output
- AND the surrounding ordinary Markdown text still renders formatted

#### Scenario: Plain-text body renders unchanged

- GIVEN an owned, exportable session has a persisted section whose body is plain text
  with no Markdown syntax, e.g. `"The party rested at the inn."`
- WHEN the DM exports the PDF
- THEN the section renders as a plain paragraph identical in content to the source text
