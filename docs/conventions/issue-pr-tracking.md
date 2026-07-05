# Issue and PR Tracking Conventions

Use GitHub issues for bugs and improvements that need explicit tracking before implementation. Planned SDD work can use SDD artifacts directly unless it also represents a bug or improvement that should be searchable as a separate tracking item.

## Quick Rules

| Work type | Tracking convention |
| --- | --- |
| Bug | Create a GitHub issue with the `bug` label before opening the fixing PR. Link the PR to that issue. |
| Improvement | Create a GitHub issue with an improvement/enhancement label before opening the PR. Link the PR to that issue. |
| Planned SDD work | Use the active SDD artifacts as the planning source. Create an issue only when the work is also a bug or improvement that needs separate tracking. |

## PR Link Format

Make the tracking relationship visible in the PR description with a closing or reference line:

```md
Fixes #29
```

or:

```md
Refs #29
```

Use `Fixes` when the PR fully resolves the issue. Use `Refs` when the PR only documents, investigates, or partially prepares the fix.
