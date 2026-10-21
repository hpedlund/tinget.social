# UX Review: TASK-009 — Party overview page

**Result**: PASS WITH NOTES
**Reviewed files**: `app/partier/page.tsx`, `components/party-table.tsx`, `components/party-trend-table.tsx`, `components/party-swatch.tsx`

Verified in Chromium on the static export (`out/`): desktop 1280×900 light, mobile 390×844 dark, plus a 320 px width check.

## Accessibility

- One `h1`, sections labelled by their `h2`; both tables use row headers per party and a caption that explains the figures ✔
- **Colour is never the only carrier**: the party swatch is `aria-hidden` and always next to the party name (headline table) or code with its full name as `abbr` title (trend table, as in the ranking). Light colours (SD yellow) and dark ones (KD navy on the dark theme) get a border so the swatch stays visible ✔
- Links: the full party name is the link text, the caption says "Välj ett parti för att se dess ledamöter i rankingen" ✔
- "–" for a party without members in a riksmöte has an `sr-only` "inga ledamöter"; bars are `aria-hidden` and the value is text ✔
- Tab order: skip link → header nav → source link → caveat link → eight party links → politiska vildar link → footer ✔
- The fairness caveat (`AttendanceCaveat`) is on the page ✔

## Responsive Design

- Mobile 390 px: page `scrollWidth` 390; both tables fit their container (358/358) ✔
- Headline table hides "Lägst–högst", "Ledamöter" and the party code below `sm`; the trend table uses `text-xs` and tighter padding below `sm`, and "(pågår)" wraps under "2026/27" ✔
- 320 px: page does not scroll; the tables scroll inside their container (342 and 358 px wide) ✔

## Component Patterns

- shadcn/ui `Table` with table-level body styling, as `MemberTrendTable` ✔
- No client JavaScript added; page HTML 50 kB (7 kB gzipped) ✔
- No new primitives or dependencies ✔

## Interaction States

- **Party link**: "Kristdemokraterna" → `/?parti=KD`, the ranking opens with the party filter set (25 rows); Back returns to `/partier/` ✔
- **Politiska vildar**: separate sentence, link to `/?parti=-` (9 rows) ✔
- **Ties**: 2026/27 shows six parties at 100,0 % — no ranks are shown, so ties need no handling ✔
- **In-progress riksmöte**: "2026/27 (pågår)" ✔
- No hydration warnings; the only console error is the missing favicon (known, TASK-012) ✔

## Fixed during review (included in the implementation commit)

1. "Lägst–högst" showed "45,9 %–100,0 %": the percent sign is preceded by a no-break space, so a plain-space replace missed it. Now "45,9–100,0 %".
2. On mobile the headline table was wider than the screen and clipped the caption; the party code is hidden below `sm`.
3. On mobile the trend table clipped "2026/27 (pågår)" and its caption; smaller text and padding below `sm`, with "(pågår)" on its own line.

## Recommendations

1. The headline is always the default period; a period selector could come later, as on the ranking page. The trend table already covers every riksmöte.
2. TASK-010 (Så räknar vi) should explain pooled party attendance vs. the median, why a member who switched party counts in both parties, and why politiska vildar are shown apart.
