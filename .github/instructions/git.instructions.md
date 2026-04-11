---
description: "Use when making git commits, creating branches, or managing version control. Covers conventional commits, branch naming, and the two-commit rule for task-driven development."
---

# Git Conventions

## Branch Naming

```
task/{NNN}-short-name
```

Examples: `task/003-members-api`, `task/007-vote-detail-page`

One task = one branch. Squash merge to `main`.

## Conventional Commits

Format: `type(TASK-NNN): description`

| Type       | When                              |
|------------|-----------------------------------|
| `feat`     | New feature or functionality      |
| `fix`      | Bug fix                           |
| `refactor` | Code restructuring, no behavior change |
| `docs`     | Documentation, specs, reviews     |
| `test`     | Adding or updating tests          |
| `chore`    | Tooling, config, dependencies     |

### Two-Commit Pattern

Every task produces exactly two commits:

1. **Plan**: `docs(TASK-NNN): design spec for {title}`
   - Contains: spec file (`docs/specs/TASK-NNN.md`) + task status update

2. **Implementation**: `feat(TASK-NNN): implement {title}`
   - Contains: all code changes + task status update to `reviewing`

Review findings (security/UX) are additional commits only if they result in code fixes.

## Commit Messages

- Use imperative mood: "add member list" not "added member list"
- Keep subject line ≤ 72 characters
- No period at end of subject line
- Body optional — use for explaining *why*, not *what*
