# UX Review: TASK-007 — Ranking filters and sorting

**Result**: PASS WITH NOTES
**Reviewed files**: `components/ranking-explorer.tsx`, `components/ranking-filters.tsx`, `components/ranking-table.tsx`, `components/ui/native-select.tsx`, `components/ui/button.tsx`, `app/page.tsx`, `app/error.tsx`

Verified in Chromium on the static export (`out/`): desktop 1280×800 light, mobile 390×844 dark.

## Accessibility

- Filters are a `form role="search"` labelled "Filtrera rankningen"; every select has a visible `<label for>` ✔
- Native `<select>` elements: full keyboard and screen reader support without custom widgets; changes apply on `change`, a same-page update, not a change of context (WCAG 3.2.2) ✔
- Result count in `role="status"` (`aria-atomic`), rendered from the first paint so updates are announced: "Visar 79 av 403 rankade ledamöter. 6 av 48 ledamöter med få voteringar visas separat." ✔
- `aria-sort` on the Närvaro header reflects the order (descending = most present first); the caption also says "högst/lägst närvaro först" and, when filtered, "Plats gäller hela riksdagen." ✔
- "Rensa filter" moves focus to the Period select, so focus is not lost when the empty-state button disappears (verified: `activeElement` = `filter-period`) ✔
- Chevron is decorative (`aria-hidden`); focus rings use the theme `ring` token ✔

## Responsive Design

- Desktop: four selects and the button in one row; the period column is wider so "2022–2026 (mandatperiod)" is not truncated ✔
- Mobile 390 px: Period full width, then Parti + Valkrets, then Ordning + Rensa filter — three rows instead of five; `scrollWidth` 390, no horizontal scroll ✔
- Table markup and sizes unchanged from TASK-006 ✔

## Component Patterns

- shadcn/ui Native Select and Button added as source (no new dependencies), matching Badge/Table ✔
- One `RankingTable` for both lists, as TASK-006 recommended; filtered lists keep its size and accessibility ✔

## Interaction States

- **Default / no JS**: the default view is fully prerendered ✔
- **Shared URL**: reload and a shared link restore period, party, constituency and order (verified `?period=2023-24&parti=SD&ordning=franvaro`) ✔
- **Back/Forward**: each change is one history entry; Back restores the previous view without a reload or fetch ✔
- **Invalid URL values**: ignored per parameter (`?parti=XYZ&period=2023-24&valkrets=<script>` → all parties, 2023/24) ✔
- **Empty**: "Inga rankade ledamöter matchar filtren för 2022–2026." with "Rensa filter"; the below-threshold section is hidden when it has no rows ✔
- **Error**: root `app/error.tsx` with "Försök igen" and a link to the start page ✔
- No hydration warnings in the console ✔

## Fixed during review

1. Period select was truncated on desktop ("2022–2026 (hela manda…"): label shortened to "(mandatperiod)" and the column made wider.
2. On mobile the filters took five full-width rows above the table; now three.
3. The status text said "0 av 48 ledamöter med få voteringar visas separat" when none matched; that sentence now only appears when some do.

## Recommendations

1. A shared filtered URL shows the default view for one frame before hydration (static export cannot read the query at build time). Acceptable now; revisit if the site moves off static export.
2. Arrowing through a closed select in Chromium fires `change` per step, so each step becomes a history entry. If testers find Back tedious, use `replaceState` for changes within a short interval.
3. Page weight: `index.html` 665 kB → 350 kB (59 kB gzipped) with all six periods embedded. Move non-default periods to static JSON files when more terms are added (spec, Data Model).
