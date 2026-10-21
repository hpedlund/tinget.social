# TASK-017: How each party voted

**Status**: draft
**Priority**: medium
**Depends on**: TASK-014
**Branch**: task/017-party-breakdown

## Goal

Each vote on a document page shows how each party's members voted.

## Details

- Computed in the pipeline from the existing ballots (the party at the time of the vote); no new Riksdagen request
- Data: per vote `byParty: { party, ja, nej, avstar, franvarande }[]`, in a separate file per riksmöte if it would grow `votes/` noticeably (measure first; Riksdagen has 8 parties plus "-")
- Document page: one compact table per vote, parties in a fixed order, "-" shown as "Politiska vildar"
- Check sums: per-party counts must add up to the vote's counts (build fails otherwise)

## Acceptance Criteria

- [ ] Party tables on every document page, matching Riksdagen's own vote summary for a sample of votes (documented)
- [ ] Sums checked in `data:check`
- [ ] Accessible table (caption, headers) and readable at 390 px
- [ ] Lint, typecheck, tests, build pass

## Artifacts

- Spec: `docs/specs/TASK-017.md` *(created by @architect)*
- Security review: `docs/reviews/TASK-017-security.md` *(created by @security)*
- UX review: `docs/reviews/TASK-017-ux.md` *(created by @ux)*
