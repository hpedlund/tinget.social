# tinget.social — Workspace Instructions

## Project Context

This is **tinget.social**, a Swedish civic tech platform built on Riksdagen (Swedish parliament) open data. **Version 1 scope** is a public, read-only website ranking members of parliament by voting attendance (present vs. `Frånvarande`). No accounts, auth or user content in Version 1 — don't build features outside this scope unless a task explicitly asks for it. See `PROJECT.md` for the full vision, metric definition and later phases.

## Tech Stack

**Version 1 (current)** — static site, no backend:

- **Framework**: Next.js 15 (App Router) with static export (`output: "export"`)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS + shadcn/ui
- **Data**: Pipeline scripts (`scripts/`) fetch Riksdagen data in GitHub Actions and write JSON to `data/`
- **Hosting**: GitHub Pages
- **External data**: Riksdagen öppna data (`https://data.riksdagen.se`)

**Later (not yet introduced)**: Supabase (PostgreSQL, Auth, RLS) and a Node host (Hetzner VM or Vercel). Do not add Supabase, auth, API routes or server actions unless a task explicitly introduces the backend.

## Key Conventions

- Server Components by default (rendered at build time) — `"use client"` only when interactivity required
- Respect static export limits: no Server Actions, request-time Route Handlers, Middleware, `cookies()`/`headers()`, ISR or `next/image` optimisation; every dynamic route needs `generateStaticParams`
- All data reads go through `lib/data/` — pages and components never read `data/*.json` or call Riksdagen directly
- Attendance logic lives in `lib/attendance/` as pure, unit-tested functions
- `zod` validation at all system boundaries — especially Riksdagen responses in the pipeline (treat as untrusted)
- shadcn/ui components as base — extend, don't replace
- Mobile-first Tailwind: base → `sm:` → `md:` → `lg:`
- Theme CSS variables — no hardcoded hex colors
- No secrets, cookies, analytics or third-party scripts in Version 1

See file-specific instructions (`.github/instructions/`) for detailed patterns. `supabase.instructions.md` and `api.instructions.md` apply only once the backend is introduced.

## Task-Driven Development

All work follows a **task-driven workflow** with a strict two-commit pattern.

### Task Lifecycle

```
draft → designed → implementing → reviewing → done
```

1. **@planner** breaks features into tasks → writes task files to `docs/tasks/`
2. **@architect** designs a task → writes spec to `docs/specs/TASK-{NNN}.md` → **commits the plan**
3. **@coder** implements the spec → **commits the implementation** → hands off to review
4. **@security** reviews → writes findings to `docs/reviews/TASK-{NNN}-security.md`
5. **@ux** reviews → writes findings to `docs/reviews/TASK-{NNN}-ux.md`

### Two-Commit Rule

Every task produces exactly two commits on its branch:
1. `docs(TASK-NNN): design spec for {title}` — spec file + task status update
2. `feat(TASK-NNN): implement {title}` — all code changes

Review findings (security/UX) are additional commits if they result in fixes.

### Git Workflow

- **Branches**: `task/{NNN}-short-name` (e.g., `task/003-members-api`)
- **Commits**: `type(TASK-NNN): description` — conventional commits
- **One task = one branch** → squash merge to `main`
- Git history IS the project history — commit messages tell the story

### Task Files

```
docs/
├── tasks/
│   ├── BACKLOG.md          # All tasks, status, and ordering
│   └── TASK-NNN.md         # Individual task definitions
├── specs/
│   └── TASK-NNN.md         # Architect design specs
└── reviews/
    ├── TASK-NNN-security.md  # Security findings
    └── TASK-NNN-ux.md        # UX findings
```

## Language

- All code, comments, commits, and docs in **English**
- Swedish only in user-facing UI and Swedish URL slugs (`/ledamoter/`, `/voteringar/`)

## Attribution

When displaying Riksdagen data: "Källa: Sveriges riksdag"
