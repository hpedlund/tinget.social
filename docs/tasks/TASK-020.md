# TASK-020: Shareable member vote filters

**Status**: draft
**Priority**: low
**Depends on**: TASK-014
**Branch**: task/020-vote-filter-url

## Goal

The member vote list's riksmöte, ballot and search are kept in the URL, so a filtered view can be linked and survives Back.

## Details

- Reuse `lib/use-search-state.ts` (as the ranking does): `?rm=2025-26&rost=F&q=skatt`
- Invalid values fall back to defaults; Back/Forward restore the view
- Link "Frånvarande" counts on the member page (tiles) straight to the filtered list

## Acceptance Criteria

- [ ] Copying the URL reproduces the view
- [ ] Unit tests for parsing and serialising the query
- [ ] Lint, typecheck, tests, build pass

## Artifacts

- Spec: `docs/specs/TASK-020.md` *(created by @architect)*
- Security review: `docs/reviews/TASK-020-security.md` *(created by @security)*
- UX review: `docs/reviews/TASK-020-ux.md` *(created by @ux)*
