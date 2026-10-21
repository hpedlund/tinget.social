# TASK-014: Current and upcoming votes page

**Status**: done
**Priority**: medium
**Depends on**: TASK-003, TASK-005, TASK-002
**Branch**: claude/epic-ritchie-64wpx2

## Goal

A page that shows which matters the Riksdag is deciding on today and in the coming weeks, with links to what is being voted on — so visitors can follow upcoming votes, not only past attendance.

This extends Version 1 beyond the attendance ranking at the owner's request. It uses Riksdagen's document data (betänkanden and the documents they treat) only as links and planning dates; no document content is republished.

## Details

- Pipeline fetches every betänkande of the current riksmöte from `/dokumentlista/?doktyp=bet` and keeps those not yet decided (`beslutad = 0`), with their planned decision date (`beslutsdag`)
- For each, `/dokumentstatus/{dok_id}.json` gives the documents it treats (propositions, motions, framställningar …)
- New data contract file `data/agenda.json`, read through `lib/data/` (`getAgenda()`)
- New page `/voteringar/`: current (today and overdue), upcoming (by date) and not yet scheduled; links to the betänkande and the treated documents on riksdagen.se
- "Voteringar" in the main navigation

## Acceptance Criteria

- [x] The page lists every undecided betänkande of the current riksmöte, grouped by planned decision date
- [x] Each item links to the betänkande on riksdagen.se, and to the propositions and other documents it treats (motions are counted)
- [x] "Today" is the Swedish calendar date in the visitor's browser, so the grouping stays right between data refreshes
- [x] The page says that dates can change and that not every decision goes to a vote
- [x] `npm run data:check` validates `agenda.json`

## Artifacts

- Spec: `docs/specs/TASK-014.md`
