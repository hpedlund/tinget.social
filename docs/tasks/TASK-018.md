# TASK-018: Vote index per riksmöte

**Status**: draft
**Priority**: medium
**Depends on**: TASK-014
**Branch**: task/018-vote-index

## Goal

A page per riksmöte lists every voted document, so votes can be browsed without going through a member.

## Details

- `/voteringar/{riksmöte}/` (static): documents by date of their last vote, newest first: title, beteckning, number of votes, summary heading
- `/voteringar/` redirects or links to the newest riksmöte; "Voteringar" in the main navigation
- Client-side text filter over titles (reuse the static JSON from TASK-014 where possible)
- Document pages' breadcrumbs: Voteringar › riksmöte › beteckning
- Sitemap entries

## Acceptance Criteria

- [ ] Every document page is reachable from an index page
- [ ] Navigation and breadcrumbs updated; works without JavaScript (the filter is an enhancement)
- [ ] Lint, typecheck, tests, build pass

## Artifacts

- Spec: `docs/specs/TASK-018.md` *(created by @architect)*
- Security review: `docs/reviews/TASK-018-security.md` *(created by @security)*
- UX review: `docs/reviews/TASK-018-ux.md` *(created by @ux)*
