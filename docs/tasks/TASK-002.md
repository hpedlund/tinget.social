# TASK-002: Site layout and static page shell

**Status**: reviewing
**Priority**: high
**Depends on**: TASK-001
**Branch**: task/002-site-layout

## Goal

Every page shares a header, footer and navigation, and placeholder pages exist for all Version 1 routes.

## Details

- Root layout: header with site name and navigation (Ranking, Partier, Så räknar vi), footer with "Källa: Sveriges riksdag", non-affiliation note and link to the repository
- Placeholder pages: `/partier/`, `/sa-raknar-vi/`, plus `not-found.tsx`
- Short privacy note (no cookies or tracking; GitHub Pages hosting may log IP addresses) — see PROJECT.md → Legal & Compliance
- Mobile-first, keyboard accessible navigation

## Acceptance Criteria

- [ ] All routes render under the Pages sub-path and in the static export
- [ ] Navigation works with keyboard and shows the current page
- [ ] Footer shows attribution and privacy note on every page
- [ ] Unknown URLs show the custom 404 page
- [ ] UX review passes WCAG 2.1 AA checks for layout and navigation

## Artifacts

- Spec: `docs/specs/TASK-002.md` *(created by @architect)*
- Security review: `docs/reviews/TASK-002-security.md` *(created by @security)*
- UX review: `docs/reviews/TASK-002-ux.md` *(created by @ux)*
