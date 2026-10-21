# UX review: TASK-014 — How members voted and what the votes were about

Checked in Chromium against the static export at 1100 px and 390 px (member `0103624617217`, document `2025/26:SkU30`).

## Findings

| # | Finding | Severity | Status |
|---|---------|----------|--------|
| 1 | On 390 px the date column took a third of the width and clipped the ballot ("Avs…"). | Medium | Fixed: the date moves into the sub-line below the topic on small screens |
| 2 | "Ja"/"Nej" are easily read as for/against a change. Both the member page and the document page explain that Ja is a vote for the committee's proposal and Nej for the counter-proposal; the methodology page adds that the ballot alone does not say what someone was for. | Medium | Addressed in copy |
| 3 | Many point headings are generic ("Regeringens lagförslag", "Övriga frågor"). The sub-line always adds beteckning, point and the betänkande's title, and the link opens the summary. | Low | Accepted |
| 4 | AI summaries must not look like Riksdagen's text. They get the heading "Sammanfattning" (not "Beslut i korthet") and a bordered notice above the source note explaining origin and limits, linking to the methodology. | — | OK |
| 5 | Accessibility: labelled filters in a `role="search"` form, result count in a polite live region, table with a screen-reader caption and column headers, focus-visible styles, links distinguishable by underline, theme variables only. Vote cards on the document page are an ordered list with `h3` headings and anchors that leave room on scroll. | — | OK |
| 6 | The vote list needs JavaScript; a `<noscript>` note says so and points to Riksdagen. Document pages are fully static. | Low | Accepted (page weight, see spec) |
| 7 | "Missade voteringar" is gone as a heading; its content is the "Frånvarande" filter, mentioned in the intro with the count. | Low | Accepted |

No open findings.
