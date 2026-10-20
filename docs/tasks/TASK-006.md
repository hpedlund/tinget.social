# TASK-006: Attendance ranking page

**Status**: designed
**Priority**: high
**Depends on**: TASK-005, TASK-002
**Branch**: claude/focused-pascal-1h7rnf

## Goal

The start page shows all members ranked by attendance for the default period, with a clear link to the method and caveats.

## Details

- Server component rendered at build time from `getRanking`
- Columns: rank, name, party, constituency, attendance %, votes present/absent
- Members below the vote threshold listed separately
- Short caveat text (kvittning, leave) with link to "Så räknar vi"
- Mobile-friendly alternative to the table
- Default period decided in the spec (suggested: full 2022–2026 term)

## Acceptance Criteria

- [ ] All members of the default period are listed and correctly ranked
- [ ] Numbers match the data contract exactly
- [ ] Caveat and method link visible without scrolling on desktop
- [ ] Table usable on mobile; tabular numbers aligned
- [ ] UX and security reviews pass

## Artifacts

- Spec: `docs/specs/TASK-006.md` *(created by @architect)*
- Security review: `docs/reviews/TASK-006-security.md` *(created by @security)*
- UX review: `docs/reviews/TASK-006-ux.md` *(created by @ux)*
