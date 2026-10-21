# TASK-019: Committees (utskott) on votes

**Status**: draft
**Priority**: low
**Depends on**: TASK-018
**Branch**: task/019-utskott

## Goal

Votes and documents show which committee prepared them, and the member vote list and index can be filtered by committee.

## Details

- Committee from the beteckning prefix (`JuU` → Justitieutskottet, `FöU` → Försvarsutskottet …): a small static table validated in the pipeline; an unknown prefix fails `data:check` so new committees are noticed
- Shown on document pages and in the member list's sub-line
- Filter by committee in the member vote list and the vote index

## Acceptance Criteria

- [ ] Every betänkande has a committee name; omröstningar have none
- [ ] Unknown prefixes reported by `data:check`
- [ ] Lint, typecheck, tests, build pass

## Artifacts

- Spec: `docs/specs/TASK-019.md` *(created by @architect)*
- Security review: `docs/reviews/TASK-019-security.md` *(created by @security)*
- UX review: `docs/reviews/TASK-019-ux.md` *(created by @ux)*
