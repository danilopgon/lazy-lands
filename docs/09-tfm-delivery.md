# TFM Delivery

## Official deadline

2026-07-20

## Internal target date

2026-07-17

## Required deliverables

The final delivery must include:

- Source code.
- Complete documentation.
- Deployed project.
- Project presentation slides.
- Demo/explanation video with screen capture.

## Repository

The repository should include:

- Application source code.
- `README.md`.
- `docs/` folder.
- Deployment information.
- Links to slides and video.
- Test user credentials if login is required.

## README checklist

The root project README should include:

- Project description.
- Problem solved.
- Tech stack.
- Architecture summary.
- Installation instructions.
- Environment variables.
- Available scripts.
- Project structure.
- Main features.
- AI usage.
- AI output validation.
- Testing and quality strategy.
- Deployment URL.
- Demo user and password.
- Slides URL.
- Video URL.
- Post-MVP roadmap.

## Form fields

The final submission form requires:

- Full student name.
- Enrollment email.
- GitHub repository URL.
- Deployment URL.
- Slides URL.
- Video URL.
- Test user.
- Test password.

## Demo video target length

5-8 minutes.

## Demo video script

### 1. Introduction

Introduce Lazy Lands as a Campaign Companion for Dungeon Masters.

Suggested line:

"Hi, I’m Dani, and this is Lazy Lands, a Campaign Companion for Dungeon Masters that uses AI to preserve narrative continuity between role-playing sessions."

### 2. Problem

Explain that campaign preparation becomes harder because context accumulates over time.

Focus on:

- NPCs.
- Factions.
- Consequences.
- Open arcs.
- Forgotten details.

### 3. Solution

Explain the product flow:

- Capture campaign context.
- Register played sessions.
- Validate memories.
- Generate coherent next-session proposals.

### 4. Demo

Show:

1. Login.
2. Campaign list.
3. Campaign detail.
4. NPCs, factions and open arcs.
5. Register a session.
6. Review memory suggestions.
7. Accept or edit a memory.
8. Generate next session.
9. Show continuity links.
10. Copy or export session.

### 5. Architecture

Mention:

- Next.js frontend.
- FastAPI backend.
- Supabase Auth and DB.
- LLM Provider abstraction.
- Pydantic validation.
- Prompts versioned as templates.

### 6. Quality

Mention:

- AI outputs are validated.
- Private data is protected with ownership/RLS.
- Critical flows are tested.
- The project is deployed.

### 7. Closing

Suggested line:

"Lazy Lands does not replace the Dungeon Master. It helps them remember, organize and prepare better."

## Slides structure

Recommended slides:

1. Title.
2. Problem.
3. Product solution.
4. Main user flow.
5. Architecture.
6. AI system.
7. Data and security.
8. Demo screenshots.
9. Quality strategy.
10. Roadmap and conclusion.

## Final delivery checklist

- [ ] GitHub repository is public or access is configured.
- [ ] Deployment works.
- [ ] Demo user works.
- [ ] README is complete.
- [ ] `docs/` folder exists.
- [ ] Slides are public.
- [ ] Video is public or accessible.
- [ ] README includes all URLs.
- [ ] Final form is filled.
