# TASK-013: Custom domain tinget.social

**Status**: reviewing
**Priority**: low
**Depends on**: TASK-001
**Branch**: claude/focused-pascal-1h7rnf

## Goal

The site is served from `https://tinget.social` with HTTPS.

## Details

DNS is mapped (done outside the repository).

- DNS records at the registrar (apex A/AAAA records to GitHub Pages, `www` CNAME)
- Set the custom domain and "Enforce HTTPS" in repository Settings → Pages; verify the domain for the account
- `basePath` becomes empty automatically via the Pages configuration — confirm no hardcoded `/tinget.social` paths remain

## Acceptance Criteria

- [ ] `https://tinget.social` serves the site with a valid certificate
- [ ] `hpedlund.github.io/tinget.social` redirects to the custom domain
- [ ] All links and assets work at the root path

## Artifacts

- Spec: `docs/specs/TASK-013.md` *(created by @architect)*
- Security review: `docs/reviews/TASK-013-security.md` *(created by @security)*
- UX review: `docs/reviews/TASK-013-ux.md` *(created by @ux)*
