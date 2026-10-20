# TASK-001: Project setup, default page and GitHub Pages deploy

**Status**: reviewing
**Priority**: high
**Depends on**: none
**Branch**: task/001-project-setup

## Goal

A Next.js static-export app with a simple Swedish default page builds in CI and is live on GitHub Pages at `https://hpedlund.github.io/tinget.social/`.

## Details

Foundation for everything else. See PROJECT.md → "Static export constraints" and "Deployment".

- Next.js 16 (App Router), TypeScript strict, `output: "export"`, `trailingSlash: true`, `images.unoptimized`
- Tailwind CSS + shadcn/ui base setup (`components.json`, theme CSS variables, `cn()` helper)
- ESLint configured; `npm run lint`, `npm run typecheck`, `npm run build` scripts
- GitHub Actions: build on pull requests; build + deploy to GitHub Pages on push to `main` and manual dispatch
- `basePath` taken from the Pages configuration so the site works on `hpedlund.github.io/tinget.social` now and on the custom domain later without code changes
- Default page (Swedish): name, one-line purpose, "under uppbyggnad" notice, link to the GitHub repository
- No data, no Riksdagen calls yet

## Acceptance Criteria

- [ ] `npm ci && npm run build` produces a static site in `out/`
- [ ] `npm run lint` and `npm run typecheck` pass
- [ ] Pull requests run the build workflow; pushes to `main` deploy to GitHub Pages
- [ ] Workflows use least-privilege `permissions:` and pinned action versions
- [ ] Default page renders correctly under the `/tinget.social/` sub-path (assets and links)
- [ ] Page has `lang="sv"`, a title and description, and passes basic accessibility checks (heading, contrast)

## Artifacts

- Spec: `docs/specs/TASK-001.md` *(created by @architect)*
- Security review: `docs/reviews/TASK-001-security.md` *(created by @security)*
- UX review: `docs/reviews/TASK-001-ux.md` *(created by @ux)*
