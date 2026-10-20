# tinget.social

A Swedish civic tech platform built on Riksdagen (Swedish parliament) open data.

**Version 1:** an open website ranking members of parliament by how often they are present and vote — who shows up to work, and who doesn't.

**Stack**: Next.js 15 · Supabase · TypeScript · Tailwind CSS · shadcn/ui

See [PROJECT.md](PROJECT.md) for full project documentation.

## Task-Driven Development

All work follows a task-driven workflow with a strict two-commit pattern per task:

1. **@planner** breaks features into tasks → `docs/tasks/`
2. **@architect** designs → spec to `docs/specs/TASK-{NNN}.md` → **commit 1 (plan)**
3. **@coder** implements → **commit 2 (code)**
4. **@security** reviews → `docs/reviews/TASK-{NNN}-security.md`
5. **@ux** reviews → `docs/reviews/TASK-{NNN}-ux.md`

Use `@orchestrator` to run the full pipeline end-to-end.

### Agents

| Agent | Role |
|-------|------|
| `@planner` | Break features into small, atomic tasks |
| `@architect` | Design specs with data models, APIs, components |
| `@coder` | Implement following architect specs |
| `@security` | OWASP, GDPR, RLS security review |
| `@ux` | Accessibility, responsive design, UX review |
| `@orchestrator` | End-to-end pipeline coordination |

### Skills

| Skill | Purpose |
|-------|---------|
| `/data-modeling` | Design Supabase schemas and migrations |
| `/riksdagen-api` | Work with Swedish parliament open data APIs |
| `/security-review` | OWASP + GDPR security audit |
| `/component-design` | shadcn/ui component design + accessibility |

### File Instructions (auto-loaded)

- **TypeScript/TSX files** → Next.js App Router conventions
- **Supabase/SQL files** → Supabase client patterns, RLS, migrations
- **Components** → shadcn/ui, Tailwind, accessibility
- **API routes** → Validation, error handling, response format
- **Git** → Conventional commits, branch naming, two-commit rule

## Getting Started

> Application scaffolding coming soon. See PROJECT.md for the planned architecture.

## Data Source

[Riksdagen öppna data](https://www.riksdagen.se/sv/dokument-och-lagar/riksdagens-oppna-data/) — free to use. Källa: Sveriges riksdag.
