# TASK-010: Methodology page (Så räknar vi)

**Status**: done
**Priority**: high
**Depends on**: TASK-004, TASK-002
**Branch**: claude/focused-pascal-1h7rnf

## Goal

`/sa-raknar-vi/` explains in plain Swedish how attendance is calculated, its limitations and where the data comes from.

## Details

- Definition, eligibility rules, threshold, treatment of Avstår, substitutes and the Speaker
- Caveats: kvittning, parental leave, illness, official duties — absence ≠ not working
- Data source, update frequency, link to raw data and to `data/` in the repository
- How to report errors (GitHub issues)

## Acceptance Criteria

- [x] Content matches the implemented calculation exactly
- [x] Readable by a general audience (plain language, no jargon)
- [x] Linked from the ranking, member and party pages

## Artifacts

- Spec: `docs/specs/TASK-010.md` *(created by @architect)*
- Security review: `docs/reviews/TASK-010-security.md` *(created by @security)*
- UX review: `docs/reviews/TASK-010-ux.md` *(created by @ux)*
