# TASK-023: Document coverage in the data refresh summary

**Status**: draft
**Priority**: low
**Depends on**: TASK-015
**Branch**: task/023-refresh-report

## Goal

Each data refresh run reports how complete the topics are, so gaps are noticed without reading logs.

## Details

- In the workflow's step summary: documents per riksmöte, votes without a document, documents without Riksdagen's summary, generated summaries used/kept/dropped, unresolved beteckningar (from `observed.json`)
- No failure on gaps (topics never block a refresh), but a visible warning

## Acceptance Criteria

- [ ] Step summary shows the figures on every run
- [ ] Workflow still has least-privilege permissions

## Artifacts

- Spec: `docs/specs/TASK-023.md` *(created by @architect)*
- Security review: `docs/reviews/TASK-023-security.md` *(created by @security)*
- UX review: `docs/reviews/TASK-023-ux.md` *(created by @ux)*
