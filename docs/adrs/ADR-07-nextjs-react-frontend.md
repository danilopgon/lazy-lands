# ADR-07 — Frontend MVP: Next.js + React

**Status:** Accepted  
**Date:** 2026-05-02  
**Area:** Frontend / Architecture / DX / Product

## Context and problem

Lazy Lands is a Campaign Companion for Dungeon Masters.

The primary MVP value is not in demonstrating Angular mastery but in building a fast, visual,
editable and iteration-oriented product experience. The initial decision proposed Angular using
standalone components and signals.

However, the project evolved toward a product closer to a creative SaaS with strong visual
requirements and need for rapid UI iteration. Next.js, React, Tailwind and shadcn/ui also have
very high presence in public documentation, examples, repositories and patterns known by
language models, which reduces friction in an AI-assisted master's project context.

## Alternatives evaluated

| Option | Pros | Cons |
|---|---|---|
| Angular | Robust architecture, signals, standalone components, good scalability, high prior experience | More friction for highly custom UI, less mature shadcn ecosystem, slower for visual prototyping |
| React + Vite | Simple setup, fast DX, full freedom | Less structure for full-stack app, would need to solve routing/SSR/auth/deploy with more pieces |
| **Next.js + React** ✅ | App Router, integrated SSR/SSG, official shadcn/ui, mature SaaS ecosystem, great AI compatibility | Risk of mixing server/client responsibilities, requires discipline |

## Decision

Next.js + React as the primary frontend for the MVP.

```
Next.js
React
TypeScript
TailwindCSS
shadcn/ui
Supabase Auth
FastAPI client
```

FastAPI is maintained as the AI Application Layer.

## Component organization

| Folder | Owns |
|---|---|
| `components/ui/` | Reusable primitives (shadcn base) |
| `components/layout/` | App shell pieces |
| `features/campaigns/` | Campaign-specific components |
| `features/sessions/` | Session registration and history |
| `features/memory/` | Memory suggestion review and MemoryFact display |
| `features/generation/` | Generated session rendering |
| `features/auth/` | Auth screens |

## Consequences

**Positive:**

- Greater speed for visual prototyping.
- Direct access to the official shadcn/ui ecosystem.
- Better fit with SaaS/indie product aesthetics.
- Easier to iterate UI with LLM-assisted tools.
- More versatile portfolio: Angular is already covered by daily professional experience.

**Negative / trade-offs:**

- Next.js requires discipline to separate server/client correctly.
- React leaves more decisions open than Angular.
- Technical debt risk if feature structure is not defined from the start.

## Success criteria

- The MVP allows creating a campaign, registering sessions, generating a proposal and
  exporting a PDF.
- The UI can be iterated rapidly without fighting the base library.
- The frontend consumes FastAPI via clear contracts.
- Supabase Auth works correctly with JWT toward FastAPI.
