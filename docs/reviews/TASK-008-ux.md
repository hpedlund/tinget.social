# UX Review: TASK-008 — Member detail page

**Result**: PASS WITH NOTES
**Reviewed files**: `app/ledamoter/[id]/page.tsx`, `components/member-trend-table.tsx`, `components/missed-votes.tsx`, `components/ranking-table.tsx`

Verified in Chromium on the static export (`out/`): desktop 1280×900 light, mobile 390×844 dark. Members checked: a ranked member (Helén Pettersson), a member below the threshold for the term (Mohamed Yassin), a member only in 2026/27 with no missed votes (Elin Andersson), and the member with the most missed votes (Jimmie Åkesson, 2 256).

## Accessibility

- Breadcrumb `nav aria-label="Brödsmulor"` with `aria-current="page"`; one `h1`, sections labelled by their `h2` ✔
- Headline figures are text; vote-type totals are a `dl` ✔
- Trend table: row headers per riksmöte, caption explains "Plats" and "Partiets snitt"; "–" for unranked has an `sr-only` "rankas inte"; bars are `aria-hidden` ✔
- Missed votes: native `<details>`/`<summary>` (keyboard: Tab to the summary, Enter toggles); each table has an `sr-only` caption; link text is the vote designation ("JuU2 punkt 2") under the header "Votering hos riksdagen" ✔
- Tab order: skip link → header nav → breadcrumb → source link → caveat link → the four group summaries → footer; links inside closed groups are skipped ✔
- Ranking names are now links with a visible underline and focus outline ✔
- The fairness caveat (`AttendanceCaveat`) is on the page ✔

## Responsive Design

- Mobile 390 px: `scrollWidth` 390 on every member checked, also with a group open ✔
- Trend table hides Voteringar/Frånvarande below `sm`; the missed-vote table hides "Frånvarande totalt" below `sm` ✔
- Five tiles: "Voteringar" spans both columns on mobile, then 2×2; one row of five from `sm` ✔

## Component Patterns

- Tables use the shadcn/ui `Table` with table-level body styling, as in `RankingTable` ✔
- No new primitives or dependencies ✔

## Interaction States

- **Ranked / below threshold**: "Plats 230 av 403 rankade ledamöter." or "Rankas inte: tjänstgjorde under färre än 261 voteringar (en tiondel av perioden)." ✔
- **Only 2026/27**: headline "Närvaro 2026/27 (pågår)" ✔
- **No missed votes**: "Inga missade voteringar." ✔
- **Unknown id**: "Sidan finns inte" (404) ✔
- **Navigation**: ranking name → member page (client-side), Back returns to the ranking ✔
- Figures agree with the ranking (e.g. Agneta Nilsson: 1, 100,0 %, 1 247 voteringar, 0 frånvarande on both) — also enforced at build time ✔
- No hydration warnings in the console ✔

## Fixed during review (included in the implementation commit)

1. "Snitt för S" showed only the dotted-underlined party code; it now names the party ("Snitt för Socialdemokraterna").
2. Five tiles in a two-column grid left one tile alone on mobile; "Voteringar" now spans the row.
3. "Frånvarande totalt" was clipped inside the table's horizontal scroller on mobile; hidden below `sm`.
4. The newest group was open by default (153–499 rows), pushing the footer thousands of pixels down; all groups now start collapsed with their counts in the summary.

## Recommendations

1. Page weight: largest member page 575 kB (142 kB gzipped), average ≈ 86 kB. If more terms are added, emit missed votes per riksmöte as static JSON loaded when a group is opened.
2. The site has no favicon, so browsers log a 404 for `/favicon.ico` on every page (not from this task) — add one in TASK-012.
3. The headline is always the full term; a period selector like the ranking's could come later if visitors ask for it.
4. Politiska vildar (`-`) get no party average, which is correct but unexplained; TASK-010 (Så räknar vi) should mention it.
