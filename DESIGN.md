# Lazy Lands — Design System (“Print Chronicle”)

> Visual language for the Lazy Lands campaign companion. This is the source of truth for
> tokens, type, components and motion. It is a **letterpress-meets-editorial** system:
> the warmth and legibility of a printed chronicle, on the structural bones of a woodcut print.
>
> Reference implementation: `handoff/Lazy Lands Prototype.html` (+ `app/chronicle.css`, the
> single stylesheet that encodes the full prototype system). Production implementation target:
> `apps/web`, a Next.js App Router frontend that ports this system through TailwindCSS,
> CSS custom properties and shadcn/ui primitives.

---

## 1. Design DNA

Five rules that define the look. When in doubt, return here.

1. **Radius 0, everywhere.** No rounded corners. Cards, inputs, pills, buttons, avatars — all hard 90° corners.
2. **Hard ink shadows, not soft blur.** Elevation is a solid offset block (`box-shadow: 6px 6px 0 var(--shadow)`), never a gaussian blur. It reads like ink pressed onto paper.
3. **Mono is the voice of the system.** `JetBrains Mono`, uppercase, letter-spaced, is used for _everything the machine says_: nav, metadata, labels, statuses, AI/edit provenance, breadcrumbs. Human-authored prose is serif or sans, never mono.
4. **Serif for reading, sans for operating.** `Source Serif 4` for anything you _read_ (titles, world state, session drafts, memories). `Instrument Sans` for UI chrome (buttons, body, form values).
5. **One accent. Color = meaning.** Emerald (`--accent`) is the only brand color. Green/amber/red status tokens are _semantic only_, never decoration. Everything else is ink on warm paper.

Texture: a faint two-layer dot grid is baked into the `body` background; an optional noise/vignette overlay layers on top. Paper, not screen.

---

## 2. Theming & runtime flags

The system is driven by attributes on `<html>`. No JS framework required — just toggle attributes.

| Attribute       | Values                            | Effect                                                                                                                        |
| --------------- | --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `data-theme`    | `light` (default), `dark`         | Swaps the whole token palette. Dark is a true “printing negative”: light ink on charcoal.                                     |
| `data-motion`   | `full` (default), `subtle`, `off` | `subtle` drops entrance choreography but keeps action feedback (stamp/strike/press). `off` kills all animation + transitions. |
| `--tex-opacity` | `0`–`1` (default `0.5`)           | Inline style on `<html>`; controls paper-texture intensity.                                                                   |

`prefers-reduced-motion: reduce` is always respected regardless of `data-motion`.

```js
document.documentElement.setAttribute('data-theme', 'dark')
document.documentElement.setAttribute('data-motion', 'subtle')
document.documentElement.style.setProperty('--tex-opacity', '0.35')
```

---

## 3. Color tokens

All colors are CSS custom properties on `:root`, overridden under `html[data-theme="dark"]`.
**Never hard-code hex in components** — always reference the token.

### Light (default)

| Token                        | Hex                   | Role                                    |
| ---------------------------- | --------------------- | --------------------------------------- |
| `--bg`                       | `#F2ECE0`             | App background (warm paper)             |
| `--paper`                    | `#F8F3EB`             | Card / surface                          |
| `--paper-2`                  | `#EBE3D4`             | Recessed surface, hover fill            |
| `--ink`                      | `#1A1C19`             | Primary text, borders, hard shadow      |
| `--ink-soft`                 | `#2C2E29`             | Long-form body text                     |
| `--ink-2`                    | `#585C51`             | Secondary text                          |
| `--ink-3`                    | `#8A8B7E`             | Tertiary / meta                         |
| `--mute`                     | `#6B7066`             | Mono labels, muted UI                   |
| `--line`                     | `#C9C0AC`             | Dashed hairlines                        |
| `--line-strong`              | `#1A1C19`             | The structural “ink rule” (3px borders) |
| `--dotted`                   | `#B7AE98`             | Dotted row separators, input borders    |
| `--border`                   | `#1A1C19`             | Hard card border                        |
| `--accent`                   | `#3A7D44`             | **Emerald** — the only brand color      |
| `--accent-deep`              | `#2B5E33`             | Accent text on light, link color        |
| `--accent-wash`              | `#C2D8C5`             | Accent pill fill / soft tint            |
| `--good` / `--good-wash`     | `#3A7D44` / `#DCE9DA` | Status: active / accepted / success     |
| `--warn` / `--warn-wash`     | `#B07F12` / `#F0E4C4` | Status: paused / needs attention        |
| `--danger` / `--danger-wash` | `#8A2515` / `#F1D8D1` | Status: dormant / destructive / error   |
| `--shadow`                   | `#1A1C19`             | Hard ink shadow                         |

### Dark (`data-theme="dark"`)

Key overrides — ink and paper invert, accent brightens, shadow goes pure black:

| Token                            | Hex                               |
| -------------------------------- | --------------------------------- |
| `--bg`                           | `#16140F`                         |
| `--paper`                        | `#211E17`                         |
| `--paper-2`                      | `#2A261C`                         |
| `--ink`                          | `#ECE4D3`                         |
| `--border` / `--line-strong`     | `#ECE4D3`                         |
| `--accent`                       | `#E0664A`                         |
| `--accent-deep`                  | `#EE8868`                         |
| `--good` / `--warn` / `--danger` | `#6BBE6F` / `#D6A93A` / `#E06A52` |
| `--shadow`                       | `#000000`                         |

> Contrast note: the inverted Scribe bulletin (`.ll-notice`) flips to _light paper on dark_ in light mode and _dark on light_ in dark mode — it is always the photographic negative of the page. Verified legible in both.

---

## 4. Typography

Three families, loaded from Google Fonts. **Load all three or the system breaks** (mono is structural, not decorative).

```html
<link
  href="https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600;700&family=Source+Serif+4:ital,wght@0,400;0,600;1,400;1,600&family=JetBrains+Mono:wght@400;500;600;700&display=swap"
  rel="stylesheet"
/>
```

| Family              | Role              | Where                                                                                                            |
| ------------------- | ----------------- | ---------------------------------------------------------------------------------------------------------------- |
| **Source Serif 4**  | Display & reading | h1/h2, card titles, stat values, world state, session drafts, memories, blockquotes, the Scribe’s voice (italic) |
| **Instrument Sans** | UI & body         | buttons, body copy, form values, descriptions                                                                    |
| **JetBrains Mono**  | System voice      | nav, breadcrumbs, labels, pills, flags, statuses, provenance badges, counters, error text, eyebrows              |

### Type scale (reference values)

| Use                                       | Family | Size / weight  | Notes                                                    |
| ----------------------------------------- | ------ | -------------- | -------------------------------------------------------- |
| Page title `.ll-h1`                       | Serif  | 38px / 600     | `letter-spacing: -0.022em`, line-height 1.04             |
| Hero headline                             | Serif  | 56px / 600     | `letter-spacing: -0.028em`, `text-wrap: balance`         |
| Section head `.ll-secthead h3`            | Serif  | 19px / 600     | Preceded by a 9px emerald square, **or** a mono `/01` index |
| Stat value `.ll-stat .v`                  | Serif  | 30px / 600     |                                                          |
| Body                                      | Sans   | 14.5px / 1.5   |                                                          |
| Long-form (`.ll-textarea`, draft `.body`) | Serif  | 15px / 1.6     | Reading comfort                                          |
| Labels / nav / pills                      | Mono   | 9.5–11px / 600 | uppercase, `letter-spacing: 0.07–0.12em`                 |
| Eyebrow `.ll-kicker`                      | Mono   | 10.5px / 600   | uppercase, emerald                                      |

**Section numbering.** Sequential pages use a mono index instead of the square bullet:
`<div class="ll-secthead numbered"><span class="ll-sectnum">/01</span><h3>…</h3></div>`.

---

## 5. Spacing, borders & elevation

- **Border weights are meaningful.** `3px solid var(--line-strong)` = structural rule (page header, masthead, column divider). `2px solid var(--border)` = card / interactive edge. `1.5px` = quiet/flat variant. `1px dashed var(--dotted)` = list-row separator.
- **Elevation = hard offset shadow.** Standard card `6px 6px 0 var(--shadow)`; buttons `3px 3px 0`; toast/modal `4–8px`. The accent shadow (`box-shadow: …0 var(--accent)`) marks Scribe/AI surfaces.
- **Page widths:** `.ll-page` max 1140px; `.ll-page.mid` 900px; `.ll-page.narrow` 720px. Gutter 40px desktop / 18px mobile.
- **Breakpoint:** single `@media (max-width: 900px)` — two-column editorial layouts collapse to one, stat ledger wraps, masthead scrolls horizontally.

---

## 6. Core components

All prefixed `.ll-`. Full CSS in `app/chronicle.css`. Highlights:

### Buttons `.ll-btn`

Hard-bordered, press _into_ their own shadow on click (the letterpress gesture).

- `.primary` — solid ink fill (the main action)
- `.accent` — solid emerald (Scribe / generate / forward actions)
- `.danger` — danger-red outline, danger-wash on hover
- `.quiet` — no shadow, hairline border (tertiary)
- `.small` — compact
- Press physics: `:hover` nudges `translate(1.5px,1.5px)` and shrinks shadow; `:active` fully seats it. Disabled when busy.

### Surfaces

- `.ll-paper` — the standard card (2px border + 6px ink shadow). `.flat` removes shadow.
- `.ll-statbar` / `.ll-stat` — the **metrics ledger**: a single bordered row of serif numbers + mono labels, hard dividers between cells.
- `.ll-cols` / `.ll-colL` / `.ll-colR` — editorial two-column (1.5fr / 1fr) split by a vertical ink rule.

### Lists

- `.ll-dotrow` — dashed-separated row (title + meta + right-aligned mono date).
- `.ll-entity` — NPC/faction/arc record (serif name + description + key/value facts).
- `.ll-side` (+ `.ok/.warn/.crit/.accent`) — left status bar (6px) on a card; encodes arc/faction state by color.

### Labels & provenance

- `.ll-pill` (+ `.accent/.muted/.good/.danger`) — bordered mono tag.
- `.ll-flag` — borderless mono status text.
- `.ll-origin.scribe` (`✦ Scribe`) vs `.ll-origin.edited` (`✎ Edited by you`) — **the provenance system.** Every AI-touched vs human-edited piece of content carries one. This is a product requirement, not decoration (see PRODUCT.md §3).
- `.ll-chip` — entity reference tag.

### Forms

- `.ll-field` / `.ll-label` (mono, uppercase) / `.ll-input` / `.ll-textarea` (serif, for prose) / `.ll-select`.
- Focus = emerald border + 3px emerald offset shadow. Invalid = danger border + danger shadow + `.ll-error-text` (mono).

### Feedback surfaces

- `.ll-notice` — **the Scribe’s inverted bulletin.** Ink-filled block with emerald shadow; this is how the system “speaks”. `.error` variant recolors to danger.
- `.ll-empty` — centered empty state with emerald ornament (`❧` / `✦`).
- `.ll-loading` — the Scribe _writes_: an animated quill (`.ll-quill`) + mono caption with ellipsis.
- `.ll-modal` / `.ll-toast` — hard-bordered, shadow-offset; toast “presses” in.
- `.ll-pdf` — export preview; intentionally stays light paper in **both** themes (it’s a printed page).

---

## 7. Motion — “the press in action”

Motion is a first-class part of the brand: every action behaves like ink hitting paper.
All gated by `data-motion` (§2). Keyframes live at the bottom of `chronicle.css`.

| Moment               | Class                           | Behavior                                                                                     |
| -------------------- | ------------------------------- | -------------------------------------------------------------------------------------------- |
| Route change         | `.ll-view-enter`                | Page-turn: fade + 10px rise, 0.34s                                                           |
| Section reveal       | `.ll-rule-anim`                 | The ink rule draws left→right                                                                |
| Element entrance     | `.ll-rise`                      | Subtle 8px rise + fade                                                                       |
| **Accept a memory**  | `.ll-stamp`                     | A green “★ Accepted” stamp drops in rotated, with an irregular noise-mask edge (letterpress) |
| **Dismiss a memory** | `.ll-strike` + `.ll-discarding` | Red strike-through draws across, then the card slides off-page and collapses                 |
| Loading              | `.ll-quill`                     | Quill nib scribbles                                                                          |
| Typewriter           | `.ll-caret`                     | Blinking emerald caret for streamed/typed text                                               |

Principle: **entrance animation is decorative (drop it freely); action feedback is communicative (keep it unless motion is fully off).** That split is exactly what `data-motion="subtle"` encodes.

---

## 8. Iconography & ornament

No icon library. The system uses a small set of **typographic glyphs** as ornaments, in emerald:
`❧` (Scribe / fleuron), `✦`/`✒` (memory / the Scribe writing), `★` (the accepted stamp), `◆ ◈ ⬡ ↝ ≡` (nav marks), `/01` (section index). Keep it to this vocabulary; don’t introduce a drawn icon set without revisiting the DNA. Avoid emoji.

Imagery, where needed (none required for MVP), should be striped placeholder blocks with a mono caption, never AI-drawn SVG.

---

## 9. Implementation notes for the build

- `app/chronicle.css` is **framework-agnostic** — it’s plain CSS custom properties + classes. Port the tokens to Tailwind `@theme` / CSS modules / styled-components as you like, but keep the token names and the five DNA rules.
- The prototype is React 18 + Babel-in-browser purely for fast iteration. **Do not ship that setup** — it’s a fidelity reference, not a starting codebase. Rebuild components in your real stack against these tokens.
- Theme/motion/texture are attribute/variable driven → trivial to wire to a settings store or `prefers-color-scheme`.
- The wordmark is type-set, not a logo file: `Lazy ` (ink) + `Lands` (emerald), Source Serif 4 600. A standalone identity asset exists at `handoff/Lazy Lands — LinkedIn Card.png`.

---

## 10. Next.js + Tailwind implementation guide

`handoff/` is temporary prototype reference material. `DESIGN.md` is the durable source for production implementation. Do not copy prototype HTML, inline styles, or Babel-in-browser code into the Next.js app; rebuild with React components, TailwindCSS, and shadcn/ui primitives.

### Current `apps/web` status

The production frontend currently implements the Block 0 slice of Print Chronicle:

- `apps/web/app/globals.css` defines the light Print Chronicle tokens and maps the core Tailwind aliases.
- `apps/web/app/layout.tsx` loads Instrument Sans, Source Serif 4 and JetBrains Mono with `next/font/google`, and sets `<html lang="en" data-theme="light" data-motion="full">`.
- `apps/web/components/ui/button.tsx`, `card.tsx`, `input.tsx`, `textarea.tsx` and `label.tsx` restyle shadcn-compatible primitives with radius 0, hard borders, emerald focus, and ink-shadow affordances.
- `apps/web/components/landing/landing-page.tsx` is the current representative surface: a product landing entry point, not a detached marketing microsite.
- `apps/web/app/globals.css` also defines the custom `llg` breakpoint (`901px`) so landing/editorial layouts switch to multi-column only above the `900px` collapse point.

The dark theme, full motion gates, Scribe notice/loading/stamp patterns, entity ledgers and generated-session views remain design requirements from the prototype until they are rebuilt in production. Do not delete them from this document just because the Block 0 app has not reached them yet.

### Tailwind `@theme` mapping

Map the CSS custom properties from §3 into Tailwind theme aliases rather than replacing the token names:

```css
@theme inline {
  --color-background: var(--bg);
  --color-foreground: var(--ink);
  --color-paper: var(--paper);
  --color-paper-2: var(--paper-2);
  --color-ink-soft: var(--ink-soft);
  --color-ink-2: var(--ink-2);
  --color-ink-3: var(--ink-3);
  --color-muted: var(--mute);
  --color-line: var(--line);
  --color-line-strong: var(--line-strong);
  --color-dotted: var(--dotted);
  --color-border: var(--border);
  --color-accent: var(--accent);
  --color-accent-deep: var(--accent-deep);
  --color-accent-wash: var(--accent-wash);
  --color-good: var(--good);
  --color-good-wash: var(--good-wash);
  --color-warn: var(--warn);
  --color-warn-wash: var(--warn-wash);
  --color-danger: var(--danger);
  --color-danger-wash: var(--danger-wash);
  --color-shadow: var(--shadow);
  --font-sans: var(--font-instrument-sans);
  --font-serif: var(--font-source-serif);
  --font-mono: var(--font-jetbrains-mono);
  --breakpoint-llg: 901px;
}
```

Keep the raw CSS variables on `:root` and `html[data-theme="dark"]` so theme switching remains attribute-driven.
Use `llg:` for landing/editorial layout changes that must collapse at `900px`; the default Tailwind `md:` breakpoint is too early for this design system rule.

### Font loading

Use `next/font/google` in `app/layout.tsx` for all three required families:

- `Instrument Sans` → `--font-instrument-sans` for UI/body.
- `Source Serif 4` → `--font-source-serif` for headings, reading, and Scribe prose.
- `JetBrains Mono` → `--font-jetbrains-mono` for labels, metadata, badges, counters, and system voice.

Production pages should set `<html lang="en" data-theme="light" data-motion="full">` initially. Future settings may toggle `data-theme`, `data-motion`, and `--tex-opacity`.

### shadcn/ui overrides

Use shadcn/ui as behavior/accessibility primitives, then restyle them to match Print Chronicle:

- **Button:** radius `0`, `2px` border by default, `3px 3px 0 var(--shadow)` hard shadow, emerald `accent` variant, and press physics that translate into the shadow on hover/active.
- **Input/Textarea:** radius `0`, hard border, paper background, emerald focus ring/offset shadow, mono labels, serif textarea prose.
- **Card:** `2px` border, `6px 6px 0 var(--shadow)`, paper surface; use accent shadow only for Scribe/AI proposal surfaces.
- **Label:** JetBrains Mono, uppercase, letter-spaced, muted ink.

Do not assert Tailwind class names in tests. Test user-visible behavior and accessible names; use visual checks for style regressions.

### Layout conventions

- Page containers: `1140px` max for full pages, `900px` for focused mid pages, `720px` for narrow forms.
- Desktop gutter: `40px`; mobile gutter: `18px`–`24px`.
- Use one main breakpoint at `900px` for editorial two-column collapse.
- Prefer hard rules and bordered ledgers over floating cards. Visual hierarchy should feel printed, not glassy.

### Interaction and motion

Motion follows the `data-motion` contract from §2:

- `full`: entrance choreography plus action feedback.
- `subtle`: remove decorative entrance choreography; keep communicative press/stamp/strike feedback.
- `off`: remove animations and transitions.

Always respect `prefers-reduced-motion: reduce`. Entrance animation is decorative; action feedback is communicative and may remain only when user motion preferences allow it.

### Accessibility notes

- Color is meaning, not the only signal. Pair semantic colors with text labels or icons/glyphs.
- Maintain the contrast guarantees in §3 when introducing new combinations.
- Keep keyboard focus visible with emerald focus rings and sufficient offset.
- The Scribe persona must never imply automatic canon changes; AI output uses proposal language and keeps review/edit/dismiss affordances until the DM confirms it.
