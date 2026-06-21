# MVP Scope

## Timeline

Start date: 2026-06-20  
Official deadline: 2026-07-20  
Internal target date: 2026-07-17

## MVP objective

Build a functional and deployed application that demonstrates:

- AI-assisted campaign understanding.
- Persistent campaign memory.
- Human validation of AI-generated memories.
- Coherent next-session generation.
- Authentication and private user data.
- Structured backend architecture.
- Validated AI outputs.
- Clear documentation and final demo.

## Must have

The MVP must include:

- Supabase authentication.
- Protected routes.
- Campaign creation from free text.
- AI extraction of:
  - NPCs.
  - Factions.
  - Initial world state.
- Manual confirmation before saving extracted campaign data.
- Campaign detail view.
- Campaign world state editing.
- Basic open arcs.
- Session registration.
- Rolling accumulated campaign summary.
- Memory suggestions after session registration.
- Accept, reject or edit memory suggestions.
- Active MemoryFacts used during generation.
- Next-session generation.
- Structured generated session output.
- Visible links to previous events or accepted memories.
- Copy generated session content.
- Functional deployment.
- README and documentation.
- Slides.
- Demo video.

## Should have

These features add value but should not block delivery:

- Real PDF export.
- Print-friendly session view.
- Basic Playwright smoke tests.
- Basic observability.
- Inline editing of generated session content.
- Better visual polish.

## Could have

Only if the core flow is already stable:

- Advanced visual identity.
- Timeline view.
- Advanced filtering.
- Better generated-session layout.
- More detailed faction reasoning.

## Won't have in the TFM MVP

These are explicitly out of scope:

- Billing.
- Free/Premium plans enforcement.
- RAG.
- Embeddings.
- Vector database.
- Multi-user campaign collaboration.
- Shared campaigns.
- Mobile app.
- Standalone one-shot generator.
- Complex relationship graph.
- Advanced memory compiler.
- Obsidian sync.

## Sacred demo path

The demo must prioritize this path:

1. Login.
2. Open or create a campaign.
3. Show NPCs, factions and arcs.
4. Register a session.
5. Review memory suggestions.
6. Accept or edit a memory.
7. Generate a next session.
8. Show how the output reuses previous context.
9. Copy or export the session.

## Scope rule

If a task does not improve the sacred demo path, it is not Must.
