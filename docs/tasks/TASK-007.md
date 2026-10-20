# TASK-007: Ranking filters and sorting

**Status**: designed
**Priority**: medium
**Depends on**: TASK-006
**Branch**: claude/focused-pascal-1h7rnf

## Goal

Visitors can filter the ranking by party, constituency and period and sort most-present or most-absent first, with the state kept in the URL.

## Details

- Client component over data already embedded in the page (no runtime fetching beyond static JSON)
- Filter and sort state in URL query parameters (shareable, back button works)
- Result count announced with `aria-live`
- Empty state when no members match

## Acceptance Criteria

- [ ] Filters combine correctly and can be cleared
- [ ] Sorting works in both directions
- [ ] Reloading or sharing the URL restores the same view
- [ ] Keyboard and screen reader accessible

## Artifacts

- Spec: `docs/specs/TASK-007.md` *(created by @architect)*
- Security review: `docs/reviews/TASK-007-security.md` *(created by @security)*
- UX review: `docs/reviews/TASK-007-ux.md` *(created by @ux)*
