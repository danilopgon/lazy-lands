# Lazy Lands — Handoff package

Visual + behavioral base for building Lazy Lands, a campaign companion for Dungeon Masters.

## What’s here

| Path | What it is |
|---|---|
| `PRODUCT.md` | Product principles, core flow, screen inventory, entity model, required states, mock data. **Start here.** |
| `DESIGN.md` | The “Print Chronicle” design system: tokens, type, components, motion, theming. |
| `Lazy Lands Prototype.html` | Fully interactive, navigable prototype of all 16 MVP screens (+ loading/empty/error states). |
| `app/chronicle.css` | The single stylesheet encoding the entire design system. Source of truth for tokens. |
| `app/` | Prototype source (React-in-browser + mock data `data.js`). |
| `Lazy Lands — LinkedIn Card.png` | Standalone brand identity asset (1200×1200). |

## Running the prototype

Open `Lazy Lands Prototype.html` in any modern browser (needs internet for Google Fonts + React CDN). Navigate via the in-app links; routes are hash-based (`#/campaigns/phandalin/...`). Toggle **theme / motion / paper texture** from the Tweaks panel.

> The prototype uses React + Babel **in the browser** purely for iteration speed. It is a
> fidelity reference, **not** the production stack. Rebuild components in your real framework
> against the `DESIGN.md` tokens — do not lift the in-browser Babel setup into production.

## Suggested reading order

1. `PRODUCT.md` §2 (principles) and §4–5 (flow + screens)
2. Click through `Lazy Lands Prototype.html`
3. `DESIGN.md` §1 (DNA) → §3–4 (tokens + type) → §6–7 (components + motion)
