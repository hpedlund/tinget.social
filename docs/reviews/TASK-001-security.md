# Security Review: TASK-001 — Project setup, default page and GitHub Pages deploy

**Result**: PASS WITH NOTES
**Reviewed files**: `package.json`, `package-lock.json`, `next.config.ts`, `app/layout.tsx`, `app/page.tsx`, `.github/workflows/ci.yml`, `.github/workflows/deploy.yml`, `.gitignore`

## Findings

| # | Severity | Category | Description | File | Recommendation |
|---|----------|----------|-------------|------|----------------|
| 1 | Low | Dependencies | `npm audit` reports 5 high advisories in dev-only lint tooling (`eslint-config-next` → `@next/eslint-plugin-next` → `fast-glob` → `micromatch`/`braces`, ReDoS-type). No upstream fix available. Not shipped to the site; only runs on trusted repository code. `npm audit --omit=dev` is clean. | `package-lock.json` | Re-check when `eslint-config-next` updates; no action now |
| 2 | Info | CI | Repository must have Pages source set to "GitHub Actions"; the deploy job uses OIDC (`id-token: write`) scoped to the `deploy` job only | `deploy.yml` | None |

## Checks

- Workflows: top-level `permissions: contents: read`; `pages: write` / `id-token: write` only on the deploy job ✔
- All actions pinned to full commit SHAs with version comments ✔
- `persist-credentials: false` on checkout ✔
- No `pull_request_target`; CI on pull requests runs with read-only token ✔
- No secrets used or required ✔
- No external data, no `dangerouslySetInnerHTML`, no third-party scripts, cookies or analytics ✔
- Only external link is the GitHub repository ✔

## RLS Status

No database (Version 1).

## GDPR Notes

No personal data collected. Privacy note about GitHub Pages access logging is planned in TASK-002.
