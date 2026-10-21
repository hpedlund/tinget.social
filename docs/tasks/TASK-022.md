# TASK-022: Member vote list without JavaScript

**Status**: draft
**Priority**: low
**Depends on**: TASK-014
**Branch**: task/022-votes-no-js

## Goal

The member page shows the most recent votes as static HTML, so it is useful without JavaScript and to search engines.

## Details

- Prerender the latest ~20 votes on each member page; the client list takes over (hydrates the same rows) when it has loaded
- Measure page weight before/after across the 566 member pages; stay within a stated budget
- Replaces the `<noscript>` note (TASK-014 UX review #6)

## Acceptance Criteria

- [ ] Latest votes visible with JavaScript off
- [ ] Page weight change measured and documented
- [ ] Lint, typecheck, tests, build pass

## Artifacts

- Spec: `docs/specs/TASK-022.md` *(created by @architect)*
- Security review: `docs/reviews/TASK-022-security.md` *(created by @security)*
- UX review: `docs/reviews/TASK-022-ux.md` *(created by @ux)*
