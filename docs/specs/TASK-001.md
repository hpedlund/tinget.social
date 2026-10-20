# Spec: TASK-001 — Project setup, default page and GitHub Pages deploy

## Summary

Scaffold the Next.js 15 static-export application with Tailwind CSS and the shadcn/ui base configuration, add a simple Swedish default page, and deploy it to GitHub Pages with GitHub Actions. The site must work under the project sub-path (`https://hpedlund.github.io/tinget.social/`) now and on the custom domain later (TASK-013) without code changes.

## Data Model

None — no data in this task.

## Data Flow

None. The page is fully static; no Riksdagen calls.

## Build & Deploy

### `next.config.ts`

- `output: "export"`, `trailingSlash: true`, `images: { unoptimized: true }`
- `basePath` read from the environment variable `PAGES_BASE_PATH` (empty string when unset). Locally and on the custom domain it is empty; on `hpedlund.github.io` it is `/tinget.social`.

### Workflows

`.github/workflows/ci.yml` — on `pull_request` and push to non-`main` branches:
- `permissions: contents: read`
- checkout → setup-node (Node 22, npm cache) → `npm ci` → `npm run lint` → `npm run typecheck` → `npm run build`

`.github/workflows/deploy.yml` — on push to `main` and `workflow_dispatch`:
- `concurrency: { group: pages, cancel-in-progress: false }`
- Job `build` (`contents: read`): checkout → setup-node → `actions/configure-pages` (id `pages`) → `npm ci` → lint → typecheck → `npm run build` with `PAGES_BASE_PATH: ${{ steps.pages.outputs.base_path }}` → `actions/upload-pages-artifact` with `path: out`
- Job `deploy` (`pages: write`, `id-token: write`, environment `github-pages`): `actions/deploy-pages`
- `configure-pages` returns `/tinget.social` for the project site and an empty path once a custom domain is set — this is what makes TASK-013 code-free.

All actions pinned to full commit SHAs with the version in a comment:

| Action | Version | SHA |
|--------|---------|-----|
| actions/checkout | v7.0.1 | `3d3c42e5aac5ba805825da76410c181273ba90b1` |
| actions/setup-node | v7.1.0 | `949feb2413d6458794dcd2491c4babbbce0c15c1` |
| actions/configure-pages | v6.0.0 | `45bfe0192ca1faeb007ade9deae92b16b8254a0d` |
| actions/upload-pages-artifact | v5.0.0 | `fc324d3547104276b827a68afc52ff2a11cc49c9` |
| actions/deploy-pages | v5.0.1 | `368f82528645a54fb793d4d04e342629a3f51346` |

`public/.nojekyll` so GitHub Pages serves the `_next/` folder.

### One-time repository setting (manual)

Settings → Pages → Build and deployment → Source: **GitHub Actions**. Pages on a private repository requires a paid plan; on a public repository it is free.

## Component Tree

```
app/layout.tsx (Server) — <html lang="sv">, fonts via system stack, metadata
└── app/page.tsx (Server) — default page
    ├── h1 "tinget.social"
    ├── lead: "Vilka riksdagsledamöter är på plats och röstar — och vilka är det inte?"
    ├── short paragraph: based on Riksdagen open data, independent and non-partisan
    ├── status notice: "Under uppbyggnad" (shadcn-style Badge/Alert styling via theme tokens)
    └── link to the GitHub repository
```

No client components. No `loading.tsx`/`error.tsx` needed (static page, nothing loads at runtime).

## Styling

- Tailwind CSS v4 via `@tailwindcss/postcss`
- shadcn/ui base: `components.json` (style `new-york`, base colour `neutral`, CSS variables, aliases `@/components`, `@/lib/utils`), theme CSS variables in `app/globals.css`, `cn()` helper in `lib/utils.ts` (clsx + tailwind-merge)
- No shadcn components installed yet — added as later tasks need them
- Neutral, institutional tone; light and dark themes via `prefers-color-scheme`

## Technical Decisions

- **Next.js 15 (latest 15.5.x)** to match the documented stack. Next.js 16 is available; upgrading is a separate decision.
- **Manual scaffold instead of `create-next-app`** — keeps the file set minimal and aligned with project conventions.
- **No test runner yet** — added in TASK-004 when there is logic to test.
- **Sub-path via environment** rather than hardcoding `/tinget.social` — avoids a code change when the domain is mapped.

## Implementation Order

1. `package.json`, TypeScript, ESLint, `.nvmrc`
2. Tailwind + shadcn base (`postcss.config.mjs`, `app/globals.css`, `components.json`, `lib/utils.ts`)
3. `next.config.ts`, `app/layout.tsx`, `app/page.tsx`, `public/.nojekyll`
4. Verify `npm run lint`, `npm run typecheck`, `npm run build` locally, also with `PAGES_BASE_PATH=/tinget.social`
5. Workflows `ci.yml` and `deploy.yml`
6. Update `docs/DEVELOPMENT.md` Getting Started

## Files to Create/Modify

- `package.json`, `package-lock.json` — dependencies and scripts
- `tsconfig.json` — strict TypeScript, `@/*` path alias
- `eslint.config.mjs` — Next.js core-web-vitals + TypeScript rules
- `.nvmrc` — Node 22
- `next.config.ts` — static export + basePath
- `postcss.config.mjs` — Tailwind
- `components.json` — shadcn/ui configuration
- `app/globals.css` — Tailwind import + theme tokens
- `app/layout.tsx` — root layout and metadata
- `app/page.tsx` — default page
- `lib/utils.ts` — `cn()` helper
- `public/.nojekyll`
- `.github/workflows/ci.yml`, `.github/workflows/deploy.yml`
- `docs/DEVELOPMENT.md` — Getting Started
