# TASK-004: Attendance calculation

**Status**: done
**Priority**: high
**Depends on**: TASK-001 (TASK-003 maps Riksdagen data into its input type)
**Branch**: task/004-attendance-calc

## Goal

Pure, unit-tested functions compute attendance per member, party and period exactly as defined in PROJECT.md.

## Details

See PROJECT.md → "Attendance metric (definition)".

- `lib/attendance/`: present = Ja + Nej + Avstår; absent = Frånvarande
- Only votes during the member's own service count; members below a minimum number of eligible votes are flagged rather than ranked (threshold defined in the spec)
- Speaker (talman) excluded; substitutes (ersättare) measured separately
- Party averages and per-riksmöte trends
- Add a test runner (Vitest); fixtures are hand-built normalised records, real-data fixtures follow in TASK-003

## Acceptance Criteria

- [ ] Unit tests cover: normal member, partial-period member, substitute, abstentions, below-threshold member, Speaker exclusion
- [ ] Functions are pure (no I/O) and fully typed
- [ ] Edge cases and threshold documented in the spec and on the method page draft
- [ ] `npm test` runs in CI

## Artifacts

- Spec: `docs/specs/TASK-004.md` *(created by @architect)*
- Security review: `docs/reviews/TASK-004-security.md` *(created by @security)*
- UX review: `docs/reviews/TASK-004-ux.md` *(created by @ux)*
