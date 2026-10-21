# TASK-014: Content-Security-Policy and CORS

**Status**: done
**Priority**: medium
**Depends on**: TASK-012
**Branch**: claude/lucid-tesla-7uijzq

## Goal

Every page ships a Content-Security-Policy that only allows the site's own scripts, styles, images and requests, so injected or third-party code cannot run or send data anywhere. The CORS behaviour of the hosting is understood and documented.

## Details

Follow-up to TASK-012 security finding 5. GitHub Pages cannot set response headers, so the policy is a `<meta http-equiv="Content-Security-Policy">` tag. Next.js emits inline scripts (RSC payload, chunk loader) that differ per page and per build; a post-build step hashes each page's inline scripts into its own policy, so `'unsafe-inline'` is not needed for scripts.

- Post-build step over every HTML file in `out/`; the build fails if a page cannot be given a policy
- No CSP in `next dev` (it needs `eval`)
- CORS: GitHub Pages sends `Access-Control-Allow-Origin: *` on every response and it cannot be changed; assess and document

## Acceptance Criteria

- [x] Every HTML page in the export has a CSP meta tag before its first script
- [x] Inline scripts are allowed by SHA-256 hash only; no `'unsafe-inline'` or `'unsafe-eval'` for scripts
- [x] No CSP violations on any page type, on client-side navigation or when using filters and sorting (checked in a browser)
- [x] Unit tests for the policy and the HTML rewrite
- [x] CORS behaviour documented with its risk assessment
- [x] Security and UX reviews pass

## Artifacts

- Spec: `docs/specs/TASK-014.md` *(created by @architect)*
- Security review: `docs/reviews/TASK-014-security.md` *(created by @security)*
- UX review: `docs/reviews/TASK-014-ux.md` *(created by @ux)*
