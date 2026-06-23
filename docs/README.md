# Lazy Lands Documentation

This folder contains the working documentation for Lazy Lands, structured for Spec-Driven Development.

Lazy Lands is a Campaign Companion for Dungeon Masters. It helps a DM capture campaign context, record what happened during sessions, validate important memories, and generate coherent proposals for future sessions.

The goal of this documentation is to make the product understandable for both humans and AI coding agents.

## How to use these docs

Read the documents depending on the task you are working on.

| If you are working on... | Read first |
|---|---|
| Product understanding | `00-product-brief.md` |
| MVP boundaries | `01-mvp-scope.md` |
| User stories and acceptance criteria | `02-requirements-and-acceptance.md` |
| Entities, concepts and domain rules | `03-domain-model.md` |
| Frontend/backend structure | `04-architecture.md` |
| AI prompts, validation and memory flow | `05-ai-system.md` |
| Backend endpoints | `06-api-contracts.md` |
| Supabase, Auth, ownership and RLS | `07-data-security-and-rls.md` |
| Testing, CI and quality gates | `08-quality-strategy.md` |
| Final Master Project delivery | `09-tfm-delivery.md` |
| Implementation roadmap and block status | `10-roadmap.md` |

## Recommended reading order for new agents

1. `00-product-brief.md`
2. `01-mvp-scope.md`
3. `03-domain-model.md`
4. `04-architecture.md`
5. `05-ai-system.md`
6. `02-requirements-and-acceptance.md`
7. The specific document related to the task.

## Core product flow

The MVP must support this end-to-end flow:

1. The DM signs up or logs in.
2. The DM creates a campaign from free text.
3. The AI extracts NPCs, factions and initial world state.
4. The DM reviews and confirms the extracted campaign data.
5. The DM records what happened after a played session.
6. The AI suggests important memories.
7. The DM accepts, rejects or edits memory suggestions.
8. The DM asks Lazy Lands to prepare the next session.
9. The AI generates a structured session proposal using campaign context.
10. The DM reviews and copies or exports the proposal.

## Product principle

Lazy Lands does not replace the Dungeon Master.

It remembers, organizes and proposes.

The DM keeps creative control.
