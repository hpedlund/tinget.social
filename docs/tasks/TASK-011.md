# TASK-011: Daily data refresh

**Status**: draft
**Priority**: medium
**Depends on**: TASK-005
**Branch**: task/011-data-refresh

## Goal

A scheduled workflow refreshes the data daily, commits changes to `data/` and redeploys the site.

## Details

- Scheduled GitHub Actions workflow (once a day, off-peak) plus manual dispatch
- Runs fetch → compute; commits only when `data/` changed; then builds and deploys
- Least-privilege permissions (`contents: write` only for the commit step)
- Failure is visible (workflow failure notification) and never publishes invalid data

## Acceptance Criteria

- [ ] Workflow runs on schedule and on demand
- [ ] No commit when data is unchanged
- [ ] A failed fetch or validation leaves the live site untouched
- [ ] Security review of the workflow passes

## Artifacts

- Spec: `docs/specs/TASK-011.md` *(created by @architect)*
- Security review: `docs/reviews/TASK-011-security.md` *(created by @security)*
- UX review: `docs/reviews/TASK-011-ux.md` *(created by @ux)*
