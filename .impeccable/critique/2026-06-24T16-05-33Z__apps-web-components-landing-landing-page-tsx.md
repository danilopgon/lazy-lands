---
target: apps/web/components/landing/landing-page.tsx
total_score: 26
p0_count: 0
p1_count: 2
p2_count: 2
p3_count: 2
timestamp: 2026-06-24T16-05-33Z
slug: apps-web-components-landing-landing-page-tsx
status: pre-fix-snapshot
fixed_in: feat/impeccable-critique-landing
---

> **Historical snapshot** — captured before the fix pass.
> All P1/P2/P3 findings below were resolved in `feat/impeccable-critique-landing`.
> Do not treat this as current-state guidance.

### Design Health Score

| #         | Heuristic                       | Score     | Key Issue                                                            |
| --------- | ------------------------------- | --------- | -------------------------------------------------------------------- |
| 1         | Visibility of System Status     | 3         | "Open beta" badge doesn't explain what open beta means               |
| 2         | Match System / Real World       | 4         | D&D vocabulary is impeccably on-point throughout                     |
| 3         | User Control and Freedom        | 2         | Mobile nav overlay has no keyboard escape / focus trap               |
| 4         | Consistency and Standards       | 2         | Three CTA labels for one action; "Pricing" link mislabeled           |
| 5         | Error Prevention                | 3         | No forms = limited surface; trust signals preempt payment anxiety    |
| 6         | Recognition Rather Than Recall  | 3         | Nav anchors work; Philosophy section is navigation-orphaned          |
| 7         | Flexibility and Efficiency      | 2         | No skip-to-content; no keyboard path to primary CTA                  |
| 8         | Aesthetic and Minimalist Design | 3         | Print Chronicle is disciplined; Spec stripe is a banned anti-pattern |
| 9         | Error Recovery                  | 2         | No keyboard close path in mobile nav overlay                         |
| 10        | Help and Documentation          | 2         | "The Scribe" is introduced without naming it as AI                   |
| **Total** |                                 | **26/40** | **Adequate — clear, addressable gaps**                               |

### Anti-Patterns Verdict

**LLM assessment:** The Print Chronicle system is distinctive and consistently applied. Not AI-looking at first glance. Second-order reflexes: 3-column feature grid, dark-background numbered steps, "Three steps. Not one more." copy trope.

**Deterministic scan:** CLI detector unavailable. Manual findings: banned left-border stripe at `briefing-mock.tsx:20`; hardcoded color at `how-it-works.tsx:70`; index-based conditional border at `pillars.tsx:44`.

### Overall Impression

Strong design identity held consistently. The landing promises product proof ("See it on a real campaign") and doesn't deliver it — both demo CTAs are locked. For skeptical DMs, the page asks for commitment before showing evidence. That's the single biggest opportunity.

### What's Working

1. Print Chronicle DNA is coherent and held — no radius slipping, ink shadows consistent, three-font hierarchy clean.
2. Hero copy is specific: "Your campaign, without the amnesia" addresses the real pain memorably.
3. BriefingMock shows an actual product artifact (session briefing with NPCs + memory-in-play) rather than vague illustrations.

### Priority Issues

**[P1] `Spec` component uses a banned left-border accent stripe**

- `briefing-mock.tsx:20`: `borderLeft: '3px solid var(--accent)', paddingLeft: 14` — explicit violation of DESIGN.md absolute ban.
- Fix: Replace with ledger pattern — single bordered row with hard vertical dividers, or top border above stat number.

**[P1] Three CTA labels for one action**

- Nav: "Start" / Hero: "Start your chronicle →" / Final CTA: "Create account →"
- Fix: Standardize on "Start your chronicle →" everywhere except nav. Kill "Create account →".

**[P2] "The Scribe" introduced without naming the AI**

- The word "AI" doesn't appear in the hero or trust signals.
- Fix: Add one clause in hero subheading or trust signals: "Your AI companion proposes, you decide what's canon."

**[P2] Both high-value demo CTAs are behind ComingSoonButton**

- "See it on a real campaign" and "Tour a demo campaign" are both disabled.
- Fix: Embed a looping GIF/video of session-log → memory-review → briefing flow. Static screenshot tour would also close the trust gap.

**[P3] Philosophy section is navigational dead air**

- 140px padding, one centered quote, no nav anchor.
- Fix: Merge into How It Works closing, or replace with real DM testimonial.

### Persona Red Flags

**Skeptical Veteran DM:** Clicks "See it on a real campaign" → disabled state. Highest abandonment moment. "7 sessions of context" is a low bar for session 32+. NodeGraph has no legend.

**New DM:** "The Scribe never decides canon" — doesn't know what Scribe is yet. "Faction posture, session over session" assumes D&D vocabulary. Questions about AI hallucination unanswered.

### Minor Observations

- `how-it-works.tsx:70`: `rgba(236,228,211,0.72)` — hardcoded color, breaks in dark mode.
- `hero.tsx:21`: `text-[13vw]` scales 48px→117px between 375–900px; needs mid-breakpoint cap.
- Marquee lacks hover-to-pause (WCAG 2.2 SC 2.2.2).
- `pillars.tsx:44`: index-based conditional border hardcodes 3 pillars.
- Footer/nav "Pricing" → registration CTA mislabeled.

### Questions to Consider

1. "The Scribe is never called AI in the hero. When does the user learn what they're signing up for?"
2. "Both live-demo CTAs are locked. What's the smallest proof-of-concept you could ship right now?"
3. "The Philosophy section holds key positioning. What if a real DM's voice replaced it there?"
