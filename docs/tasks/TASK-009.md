# TASK-009: Party overview page

**Status**: in progress
**Priority**: medium
**Depends on**: TASK-005, TASK-002
**Branch**: claude/focused-pascal-1h7rnf

## Goal

`/partier/` shows average attendance per party for each period, linking to the party's members in the ranking.

## Details

- Average and spread per party, number of members
- Party colours only in party contexts (see `/component-design` skill)
- Link to the ranking filtered by that party

## Acceptance Criteria

- [ ] All parties in the period are shown with correct averages
- [ ] Links open the ranking pre-filtered by party
- [ ] Accessible without relying on colour alone

## Artifacts

- Spec: `docs/specs/TASK-009.md` *(created by @architect)*
- Security review: `docs/reviews/TASK-009-security.md` *(created by @security)*
- UX review: `docs/reviews/TASK-009-ux.md` *(created by @ux)*
