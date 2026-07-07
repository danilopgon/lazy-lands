# Handoff Route Map

Maps app routes to the handoff prototype file containing the screen implementation.

## Route → File → Component

Prototype copy in `handoff/app/*.jsx` is authored in English. Production UI tasks must preserve the
handoff meaning and layout while localizing all user-facing production copy through the English and
Spanish message catalogs; do not leave prototype English literals hard-coded in shipped UI.

| Route                                 | Handoff File          | Component(s)                |
| ------------------------------------- | --------------------- | --------------------------- |
| `/`                                   | `views-landing.jsx`   | `Landing`                   |
| `/login`                              | `views-public.jsx`    | `Login`                     |
| `/register`                           | `views-public.jsx`    | `Register`                  |
| `/campaigns`                          | `views-dashboard.jsx` | `Dashboard`, `CampaignCard` |
| `/campaigns/new`                      | `views-dashboard.jsx` | `NewCampaign`               |
| `/campaigns/new/review`               | `views-review.jsx`    | `ExtractionReview`          |
| `/campaigns/:id`                      | `views-detail.jsx`    | `CampaignDetail`            |
| `/campaigns/:id/npcs`                 | `views-entities.jsx`  | `NpcsView`                  |
| `/campaigns/:id/factions`             | `views-entities.jsx`  | `FactionsView`              |
| `/campaigns/:id/arcs`                 | `views-arcs.jsx`      | `ArcsView`                  |
| `/campaigns/:id/sessions/new`         | `views-sessions.jsx`  | `LogSession`                |
| `/campaigns/:id/memory/review`        | `views-review.jsx`    | `MemoryReview`              |
| `/campaigns/:id/prepare`              | `views-prepare.jsx`   | `PrepareSession`            |
| `/campaigns/:id/settings`             | `views-detail.jsx`    | `SettingsView`              |
| `/campaigns/:id/sessions/:sid`        | `views-sessions.jsx`  | `GeneratedSession`          |
| `/campaigns/:id/sessions/:sid/export` | `views-export.jsx`    | `ExportView`                |

## Shared Components (handoff/app/ui.jsx)

These components appear across screens. When implementing a screen, check if the handoff uses any of these and replicate their behavior:

| Component      | Purpose                                    | Key Props                               |
| -------------- | ------------------------------------------ | --------------------------------------- |
| `Shell`        | App shell with top nav                     | `route`, `campaignId?`                  |
| `Kicker`       | Step indicator / eyebrow text              | children (text)                         |
| `Field`        | Form field wrapper with label, help, error | `label`, `optional?`, `help?`, `error?` |
| `Loading`      | Loading state with quill animation         | `title`, `sub`                          |
| `ErrorNotice`  | Error banner with retry                    | `onRetry?`, `retryLabel?`               |
| `ScribeNotice` | AI/proposal notice banner                  | `action?`, `onAction?`                  |
| `EmptyState`   | Empty state with ornament + CTA            | `orn?`, `title`, `action?`, `onAction?` |
| `OriginBadge`  | Scribe vs edited provenance                | `origin` ("scribe" \| "edited")         |
| `Modal`        | Modal dialog                               | `title`, `onClose`, `footer?`           |
| `Toast`        | Transient notification                     | `msg`                                   |

## Design System Quick Reference (DESIGN.md)

### DNA Rules (non-negotiable)

1. **Radius 0 everywhere** — no rounded corners on anything
2. **Hard ink shadows** — `6px 6px 0 var(--shadow)`, never gaussian blur
3. **Mono = machine voice** — JetBrains Mono, uppercase, letter-spaced for labels/nav/metadata/statuses
4. **Serif for reading, sans for operating** — Source Serif 4 for titles/prose, Instrument Sans for UI chrome
5. **One accent** — Emerald `var(--accent)` is the only brand color; green/amber/red are semantic only

### Key Tokens

| Token      | Value     | Use                              |
| ---------- | --------- | -------------------------------- |
| `--bg`     | `#F2ECE0` | App background                   |
| `--paper`  | `#F8F3EB` | Card surfaces                    |
| `--ink`    | `#1A1C19` | Primary text, borders            |
| `--ink-2`  | `#585C51` | Secondary text                   |
| `--ink-3`  | `#8A8B7E` | Tertiary/meta text               |
| `--accent` | `#3A7D44` | Emerald — only brand color       |
| `--danger` | `#8A2515` | Error/destructive                |
| `--border` | `#1A1C19` | Hard card borders                |
| `--shadow` | `#1A1C19` | Hard ink shadow color            |
| `--line`   | `#C9C0AC` | Hairlines                        |
| `--dotted` | `#B7AE98` | Dotted separators, input borders |

### Typography Scale

| Element    | Font            | Size     | Weight | Transform                                 |
| ---------- | --------------- | -------- | ------ | ----------------------------------------- |
| Breadcrumb | JetBrains Mono  | 11px     | 600    | uppercase, tracking 0.12em                |
| Kicker     | JetBrains Mono  | 11px     | 700    | uppercase, tracking 0.14em, color: accent |
| H1         | Source Serif 4  | 38px     | 600    | tracking -0.03em                          |
| H2         | Source Serif 4  | 24px     | 600    |                                           |
| Label      | JetBrains Mono  | 9.5-11px | 600    | uppercase, tracking 0.07-0.12em           |
| Body       | Instrument Sans | 14-15px  | 400    |                                           |
| Button     | Instrument Sans | 13-14px  | 600    | uppercase, tracking 0.04em                |

### Component Patterns

| Pattern                            | Implementation                                                                               |
| ---------------------------------- | -------------------------------------------------------------------------------------------- |
| Card (`.ll-paper`)                 | `border: 2px solid var(--border)`, `box-shadow: 6px 6px 0 var(--shadow)`, bg: `var(--paper)` |
| Input (`.ll-input`)                | `border: 1.5px dashed var(--dotted)`, radius 0, focus: `border-color: var(--accent)`         |
| Button primary (`.ll-btn.primary`) | bg: `var(--ink)`, color: `var(--paper)`, hard shadow, translate on hover                     |
| Button accent (`.ll-btn.accent`)   | bg: `var(--accent)`, color: white, hard shadow, translate on hover                           |
| Button ghost (`.ll-btn`)           | bg: transparent, border: `1.5px solid var(--border)`, hard shadow                            |
| Pill (`.ll-pill`)                  | Mono, uppercase, 9.5px, tight padding, semantic bg wash                                      |

### Motion Patterns (DESIGN.md §7)

Motion is gated by `data-motion` attribute on `<html>`. Three levels:

- `full`: entrance choreography + action feedback (default)
- `subtle`: drop decorative entrances, keep action feedback
- `off`: remove all animations and transitions

Always respect `prefers-reduced-motion: reduce`.

| Moment           | Class                           | Behavior                                  | Tailwind/CSS                                        |
| ---------------- | ------------------------------- | ----------------------------------------- | --------------------------------------------------- |
| Route change     | `.ll-view-enter`                | Page-turn: fade + 10px rise, 0.34s        | `animate-[fadeInRise_0.34s_ease-out]`               |
| Section reveal   | `.ll-rule-anim`                 | Ink rule draws left→right                 | `animate-[ruleDraw_0.6s_ease-out]`                  |
| Element entrance | `.ll-rise`                      | Subtle 8px rise + fade                    | `animate-[fadeInRise_0.3s_ease-out]`                |
| Accept memory    | `.ll-stamp`                     | Green "★ Accepted" stamp drops in rotated | `animate-[stampDrop_0.4s_ease-out]`                 |
| Dismiss memory   | `.ll-strike` + `.ll-discarding` | Red strike-through draws, card slides off | `animate-[strikeThrough_0.3s,slideOut_0.4s_0.3s]`   |
| Loading          | `.ll-quill`                     | Quill nib scribbles                       | `animate-[quillScribble_1.2s_ease-in-out_infinite]` |
| Typewriter       | `.ll-caret`                     | Blinking emerald caret                    | `animate-[blink_1s_step-end_infinite]`              |

**Button press physics** (all `.ll-btn` variants):

- `:hover`: `translate(1.5px, 1.5px)`, shadow shrinks from `3px 3px 0` to `1.5px 1.5px 0`
- `:active`: fully seats — `translate(3px, 3px)`, shadow becomes `0 0 0`
- Transition: `transform 0.1s ease, box-shadow 0.1s ease`

**Keyframes** (define in `globals.css` or component CSS):

```css
@keyframes fadeInRise {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes ruleDraw {
  from {
    transform: scaleX(0);
    transform-origin: left;
  }
  to {
    transform: scaleX(1);
    transform-origin: left;
  }
}

@keyframes stampDrop {
  0% {
    opacity: 0;
    transform: scale(1.5) rotate(-15deg);
  }
  60% {
    opacity: 1;
    transform: scale(0.95) rotate(5deg);
  }
  100% {
    transform: scale(1) rotate(-8deg);
  }
}

@keyframes strikeThrough {
  from {
    transform: scaleX(0);
    transform-origin: left;
  }
  to {
    transform: scaleX(1);
    transform-origin: left;
  }
}

@keyframes slideOut {
  to {
    transform: translateX(100%);
    opacity: 0;
  }
}

@keyframes quillScribble {
  0%,
  100% {
    transform: rotate(-5deg) translateY(0);
  }
  50% {
    transform: rotate(5deg) translateY(-2px);
  }
}

@keyframes blink {
  50% {
    opacity: 0;
  }
}
```
