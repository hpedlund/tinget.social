# TASK-021: Votes that differ from the party majority

**Status**: draft
**Priority**: medium
**Depends on**: TASK-017
**Branch**: task/021-party-line

## Goal

On a member page, votes where the member voted differently from the majority of their party's present members can be listed.

## Details

- **Needs a product decision before design**: whether to show this at all, the exact definition (majority of the party's Ja/Nej ballots? how Avstår and ties count), and wording that states the fact without judging it (PROJECT.md: "never editorialise about individuals")
- Computed in the pipeline from TASK-017's per-party counts; a filter in the member vote list, plus a count with an explanation on "Så räknar vi"
- Not a ranking and not a score

## Acceptance Criteria

- [ ] Definition and wording approved and documented on the methodology page
- [ ] Sample checked by hand against Riksdagen's vote pages
- [ ] Lint, typecheck, tests, build pass

## Artifacts

- Spec: `docs/specs/TASK-021.md` *(created by @architect)*
- Security review: `docs/reviews/TASK-021-security.md` *(created by @security)*
- UX review: `docs/reviews/TASK-021-ux.md` *(created by @ux)*
