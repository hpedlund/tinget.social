# TASK-014: How members voted and what the votes were about

**Status**: done
**Priority**: high
**Depends on**: TASK-008
**Branch**: claude/beautiful-edison-nbmjrk

## Goal

Go beyond missed votes: for every vote a member could take part in, show how they voted (Ja, Nej, Avstår or Frånvarande) and what the vote was about — a link to the document and a short summary of the topic. Use Riksdagen's own summary where it exists and generate one where it does not.

## Details

- Pipeline: fetch, per voted betänkande, its title, Riksdagen's "Beslut i korthet" and the heading of each voted proposal point; titles of omröstningar from the vote document
- Data contract v2: each member's ballots per riksmöte, point headings on votes, a documents file per riksmöte
- Member page: the full, filterable vote list (riksmöte, ballot, text search) replaces the missed-vote list
- A page per voted document: summary, every vote with its result, links to the document and to each vote at Riksdagen
- Generated summaries (Claude API) only where Riksdagen has none, clearly labelled, optional in the data refresh
- Methodology page: what Ja/Nej mean and where summaries come from

## Acceptance Criteria

- [x] Every vote on a member page shows the member's ballot and its topic; filtering by Frånvarande gives the former missed-vote list
- [x] Ballots are checked against the vote files and the member's figures at build time
- [x] Every voted document has a page linking to the document and each vote at riksdagen.se
- [x] Riksdagen's summary is shown as plain text (no source HTML reaches the site)
- [x] Generated summaries are used only when Riksdagen has none, are labelled as AI-generated, and the refresh works without an API key
- [x] Attendance figures are unchanged

## Artifacts

- Spec: `docs/specs/TASK-014.md`
- Security review: `docs/reviews/TASK-014-security.md`
- UX review: `docs/reviews/TASK-014-ux.md`
