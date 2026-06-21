# Proposal: block-0-bootstrap

## Source of Truth

The authoritative specification for this change is the external file read at task-planning time:

`C:\Users\TONBO\Downloads\lazy-lands-block-0-spec.md`

This document is the canonical Block 0 "repository bootstrap" spec for Lazy Lands.
It defines scope, required structure, dependencies, done-criteria, constraints, and
a suggested 22-step implementation order. All decisions in `tasks.md` trace back to it.

## Summary

Set up the full technical foundation for the Lazy Lands MVP — a Campaign Companion for
Dungeon Masters. Block 0 does not implement product features. It leaves the repository
ready for fast feature development:

- pnpm monorepo + Turborepo
- Next.js App Router (apps/web) with Tailwind, shadcn/ui, Vitest, Playwright
- FastAPI Clean Architecture skeleton (services/api) with pytest, Ruff, mypy
- Supabase scaffold (config, migrations placeholder, seed.sql)
- Docker + docker-compose production-oriented scaffold (documented-not-verified-locally)
- GitHub Actions CI
- Root README (TFM-deliverable structure), AGENTS.md, CLAUDE.md
- DESIGN.md evolution: extract stable design decisions from handoff/ prototypes

## Confirmed Toolchain Decisions

| Decision | Choice | Notes |
|---|---|---|
| Backend dep manager | `uv` 0.11.23 | Already installed; `uv run`, `uv sync`, uv.lock |
| Python version | 3.12.13 (project-local) | `requires-python = ">=3.12,<3.13"`; CI pinned to 3.12 |
| Supabase CLI | `pnpm add -Dw supabase` | Run via `pnpm supabase`; `pnpm supabase init` generates config.toml |
| Docker | NOT installed; WSL2 NOT installed | Dockerfiles + docker-compose hand-written, marked documented-not-verified-locally |
| Supabase start | DEFERRED | Needs Docker; flagged as deferred verification task |
| Shell | Git Bash (`/usr/bin/bash`) | Shell tasks use bash-compatible syntax |
| Node | LTS (v24.13.0) / pnpm 10.28.1 | OK — shadcn generators usable |

## Delivery Decision

Direct commits to `main` as a **size:exception** for the scaffold.
Work is organized into 6 logical **work-unit commits** (not chained PRs).
Feature branches and PRs begin only AFTER Block 0.

## References

- `PRODUCT.md` — product criteria, principles P1/P2/P3, entity model
- `DESIGN.md` — Print Chronicle design system tokens, typography, components
- `docs/04-architecture.md` — Clean Architecture layers, repo structure
- `docs/08-quality-strategy.md` — testing strategy, CI quality gates
- `handoff/` — pure HTML prototypes (visual reference only)
