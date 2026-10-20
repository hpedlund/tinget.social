# Development

How this project is built and maintained. For the vision, scope and architecture, see [PROJECT.md](../PROJECT.md).

**Stack (Version 1)**: Next.js 16 (static export) · TypeScript · Tailwind CSS · shadcn/ui · GitHub Actions · GitHub Pages. Supabase is planned for later phases — see [PROJECT.md → When to introduce Supabase](../PROJECT.md#when-to-introduce-supabase-kept-open).

## Getting Started

Requirements: Node.js 22 (see `.nvmrc`).

```bash
npm ci              # install dependencies
npm run dev         # development server at http://localhost:3000
npm run lint        # ESLint
npm run typecheck   # TypeScript
npm run build       # static export to out/
npm run data:fetch  # download + validate Riksdagen data into .cache/ (add -- --refresh to bypass the cache)
```

`data:fetch` needs network access to `data.riksdagen.se`; a first run takes about 30 seconds and downloads ~50 MB. What it fetches and the values observed are documented in [data/README.md](../data/README.md).

To preview the build as GitHub Pages serves it (under `/tinget.social/`):

```bash
PAGES_BASE_PATH=/tinget.social npm run build
```

### Deployment

- **CI** (`.github/workflows/ci.yml`): lint, typecheck and build on every pull request and branch push.
- **Deploy** (`.github/workflows/deploy.yml`): on every push to `main` (and manually), builds and publishes `out/` to GitHub Pages.
- One-time setup: repository Settings → Pages → Source: **GitHub Actions**.
- The site is live at `https://hpedlund.github.io/tinget.social/` until the custom domain is mapped (TASK-013); the sub-path is picked up automatically from the Pages configuration.

## Task-Driven Development

All work follows a task-driven workflow with a two-commit pattern per task:

1. **@planner** breaks features into tasks → `docs/tasks/`
2. **@architect** designs → spec to `docs/specs/TASK-{NNN}.md` → **commit 1 (plan)**
3. **@coder** implements → **commit 2 (code)**
4. **@security** reviews → `docs/reviews/TASK-{NNN}-security.md`
5. **@ux** reviews → `docs/reviews/TASK-{NNN}-ux.md`

Use `@orchestrator` to run the full pipeline end-to-end. Full conventions are in [.github/copilot-instructions.md](../.github/copilot-instructions.md).

### Agents

| Agent | Role |
|-------|------|
| `@planner` | Break features into small, atomic tasks |
| `@architect` | Design specs with data models, data flow and components |
| `@coder` | Implement following architect specs |
| `@security` | OWASP, GDPR, CI/supply-chain (and later RLS) security review |
| `@ux` | Accessibility, responsive design, UX review |
| `@orchestrator` | End-to-end pipeline coordination |

### Skills

| Skill | Purpose |
|-------|---------|
| `/data-modeling` | Design JSON data contracts (Version 1) and Supabase schemas (later) |
| `/riksdagen-api` | Work with Swedish parliament open data |
| `/security-review` | OWASP + GDPR security audit |
| `/component-design` | shadcn/ui component design + accessibility |

### File Instructions (auto-loaded)

- **TypeScript/TSX files** → Next.js App Router conventions, static export constraints
- **Components** → shadcn/ui, Tailwind, accessibility
- **Git** → Conventional commits, branch naming, two-commit rule
- **Supabase/SQL files** → Supabase client patterns, RLS, migrations *(later phases)*
- **API routes** → Validation, error handling, response format *(later phases)*

## Repository Layout

| Path | Contents |
|------|----------|
| `PROJECT.md` | Vision, scope, architecture, deployment |
| `docs/tasks/` | Backlog and task definitions |
| `docs/specs/` | Architect design specs |
| `docs/reviews/` | Security and UX reviews |
| `.github/` | Agent definitions, instructions, skills and (later) workflows |
