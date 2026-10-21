# UX Review: TASK-010 — Methodology page (Så räknar vi)

**Result**: PASS WITH NOTES
**Reviewed files**: `app/sa-raknar-vi/page.tsx`, `components/ranking-explorer.tsx`, `app/ledamoter/[id]/page.tsx`, `app/partier/page.tsx`

Verified in Chromium on the static export (`out/`): desktop 1280×900 light, mobile 390×844 dark, plus a 320 px width check.

## Content

- Every rule matches the implementation (spec table: `summarize`, `computeAttendance`, `rank`, `summarizeParties`, `partyEntries`, `formatPercent`) ✔
- Numbers are not retyped: vote counts, thresholds and dates per period come from `meta.json`, the threshold share from `DEFAULT_THRESHOLD_SHARE` ✔
- Plain Swedish, short sentences; riksmöte, mandatperiod, ersättare, kvittning and politiska vildar are explained where first used; the definition is a sentence plus a worked example, no formula ✔
- Covers the earlier review notes: pooled party attendance vs. median and party switchers (TASK-009), politiska vildar without a party average (TASK-008), short-serving members at 100,0 % ranking above long-serving ones (TASK-006), truncated percentages ✔
- Caveats (kvittning, leave, illness, other duties, votes are only part of the job, no judgement of individuals) are in their own section ✔

## Accessibility

- One `h1`; every section is labelled by its `h2`; a "På den här sidan" nav (`aria-labelledby`) lists all sections as an ordered list of anchor links ✔
- Period table: column headers `scope="col"`, period names as row headers, caption explains "Gräns för ranking" ✔
- Link texts make sense out of context ("Om gränsen för ranking", "Så räknar vi partiernas närvaro", "Skapa ett ärende på GitHub") ✔

## Responsive Design

- 390 px and 320 px: page `scrollWidth` equals the viewport; the period table fits its container. The date column hides below `sm` ✔

## Interaction States

- Linked from every page through `AttendanceCaveat` and the main navigation; deep links from the ranking's few-votes section and the member page's "Rankas inte" line (`#ranking`) and from the party page (`#partier`) ✔
- No client JavaScript added; no console errors ✔

## Fixed during review (included in the implementation commit)

1. At 320 px the period table was 56 px wider than its container; the numeric column headers now wrap.

## Recommendations

1. TASK-011: once the daily refresh exists, change "siffrorna räknas om när webbplatsen uppdateras med nya voteringar" to say they are updated daily.
2. The ranking explorer and member page say "en tiondel av perioden" as text; if the threshold share ever changes, update them together with `DEFAULT_THRESHOLD_SHARE` (the methodology page follows automatically).
