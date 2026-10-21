# Spec: TASK-013 — Custom domain tinget.social

## Summary

DNS and the Pages custom domain are configured outside the repository (registrar and repository Settings → Pages). The site already deploys to the root path: `actions/configure-pages` returns an empty `base_path` once a custom domain is set, and `next.config.ts` reads it. This task records the canonical site URL in code (needed for absolute URLs in TASK-012: `metadataBase`, sitemap, robots), verifies the live domain and updates the documentation, which still describes the github.io sub-path and a `CNAME` file.

## Data Model

None.

## Configuration

- `lib/site.ts`: `SITE_URL = "https://tinget.social"`. Single source for absolute URLs; nothing else hardcodes the host.
- **No `public/CNAME`**: with a custom GitHub Actions Pages workflow, GitHub ignores a `CNAME` file; the domain lives in the Pages settings. PROJECT.md is corrected.
- **`PAGES_BASE_PATH` stays**: it is empty on the custom domain and keeps forks (served under `/<repo>/`) working. Comments in `next.config.ts` and `deploy.yml` are updated.

## Verification (live)

| Check | Method |
|-------|--------|
| `https://tinget.social/` serves the site with a valid certificate | `curl` with certificate verification: 200 |
| `www.tinget.social` redirects to the apex | `curl`: 301 → `https://tinget.social/` |
| Assets and links at the root path | HTML references `/_next/…`; `/partier/`, `/sa-raknar-vi/`, a member page return 200 |
| `hpedlund.github.io/tinget.social/` redirects; HTTP → HTTPS | GitHub Pages behaviour once the custom domain and "Enforce HTTPS" are set; confirm in a browser (not reachable from the CI-less review environment) |

## Files to Create/Modify

- `lib/site.ts` — `SITE_URL`
- `next.config.ts`, `.github/workflows/deploy.yml`, `components/main-nav.tsx` — comments
- `PROJECT.md`, `docs/DEVELOPMENT.md`, `.github/instructions/nextjs.instructions.md` — custom domain is live, no `CNAME` file
