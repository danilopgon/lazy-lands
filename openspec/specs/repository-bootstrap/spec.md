# Repository Bootstrap Specification

## Purpose

This specification defines the Block 0 repository foundation for Lazy Lands. It MUST create scaffold, tooling, documentation, and quality gates only; it MUST NOT implement MVP product features beyond placeholders and smoke-testable entry points.

## Requirements

### Requirement: Monorepo Foundation

The repository MUST provide a pnpm workspace and Turborepo root that can coordinate frontend, backend, formatting, linting, typechecking, tests, and environment documentation.

#### Scenario: Root tooling is installed

- GIVEN a fresh checkout of the repository
- WHEN dependencies are installed from the root
- THEN the workspace MUST include `apps/*` and `services/*`
- AND root scripts MUST expose `dev`, `build`, `lint`, `typecheck`, `test`, `format`, and `format:check`.

#### Scenario: Secrets are not committed

- GIVEN environment configuration is documented
- WHEN `.env.example` is inspected
- THEN required public and server variables MUST be named with fake or empty values only
- AND real credentials MUST remain excluded by git ignore rules.

### Requirement: Frontend Scaffold

The repository MUST include a Next.js App Router frontend scaffold with TypeScript, TailwindCSS, shadcn/ui primitives, Supabase client helpers, and smoke-testable placeholder routes.

#### Scenario: Landing entry point exists

- GIVEN the web app is started
- WHEN a user opens `/`
- THEN the page MUST identify Lazy Lands as a Campaign Companion for Dungeon Masters
- AND it MUST link to Login and Register routes.

#### Scenario: Frontend quality gates run

- GIVEN the frontend scaffold exists
- WHEN frontend checks are executed
- THEN unit tests, lint, typecheck, build, and a Playwright smoke test SHOULD be runnable from package scripts.

### Requirement: Backend Scaffold

The repository MUST include a FastAPI backend scaffold following Clean Architecture boundaries with configuration validation, health routing, auth dependency placeholder, and an LLM provider port with a fake provider.

#### Scenario: Health endpoint responds

- GIVEN the API application is running
- WHEN `GET /health` is requested
- THEN it MUST return status 200
- AND the JSON body MUST identify the service as `lazy-lands-api`.

#### Scenario: Backend configuration is validated

- GIVEN required environment variables are provided
- WHEN settings are loaded
- THEN Pydantic-based settings MUST parse application, Supabase, CORS, and LLM provider configuration.

### Requirement: Supabase Scaffold

The repository MUST include a Supabase project scaffold for local Auth, PostgreSQL, and future RLS migrations. When Docker Desktop is available in the current environment, Supabase runtime verification SHOULD be performed during Block 0.

#### Scenario: Supabase files are present

- GIVEN Block 0 is complete
- WHEN the `supabase/` folder is inspected
- THEN it MUST include CLI configuration, a migrations placeholder, seed documentation, and local development instructions.

#### Scenario: Runtime start is verified when Docker is available

- GIVEN Docker Desktop and Docker Compose are available locally
- WHEN Supabase runtime commands are documented and the scaffold exists
- THEN `pnpm supabase start` SHOULD be executed and its result recorded.

#### Scenario: Runtime start is deferred only when Docker is unavailable

- GIVEN Docker is unavailable locally
- WHEN Supabase runtime commands cannot run
- THEN `pnpm supabase start` MUST be marked as deferred verification rather than a failed Block 0 requirement.

### Requirement: Docker and CI Scaffold

The repository MUST provide production-oriented Dockerfiles, docker-compose configuration, and GitHub Actions CI that validates frontend and backend scaffolds with fake secrets.

#### Scenario: CI protects the scaffold

- GIVEN a push or pull request targets `main`
- WHEN CI runs
- THEN frontend and backend jobs MUST execute their configured install, lint/typecheck, test, and build or format checks.

#### Scenario: Docker artifacts are runtime-verified when Docker is available

- GIVEN Docker Desktop and Docker Compose are available locally
- WHEN Dockerfiles or compose files are added
- THEN Docker build and compose validation SHOULD be executed where the scaffold is complete enough to run.

#### Scenario: Docker artifacts are documented-not-verified only without Docker

- GIVEN Docker and WSL2 are unavailable locally
- WHEN Dockerfiles or compose files cannot be executed
- THEN they MUST be clearly marked as documented-not-verified-locally.

### Requirement: Documentation and Design Evolution

The repository MUST preserve product and design source-of-truth documents while adding bootstrap documentation and promoting durable prototype decisions into `DESIGN.md`.

#### Scenario: Base documentation exists

- GIVEN Block 0 documentation is inspected
- WHEN README and agent guidance are opened
- THEN they MUST explain the project purpose, stack, commands, quality expectations, and AI-agent constraints.

#### Scenario: Prototype remains reference-only

- GIVEN design guidance is updated
- WHEN `DESIGN.md` and the shipped `apps/web/` screens are used as design references
- THEN they MUST be treated as visual references only
- AND production UI MUST be rebuilt with React, TailwindCSS, and shadcn/ui rather than copied wholesale.
