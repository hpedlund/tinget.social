# UX Review: TASK-006 — Attendance ranking page

**Result**: PASS WITH NOTES
**Reviewed files**: `app/page.tsx`, `components/ranking-table.tsx`, `components/attendance-caveat.tsx`, `components/party-label.tsx`, `components/ui/table.tsx`, `components/ui/badge.tsx`, `lib/format.ts`

Verified in Chromium on the static export (`out/`): desktop 1280×800 light and dark, mobile 390×844 dark.

## Accessibility

- One `h1`, then `h2` "Rankning 2022–2026" and "Ledamöter med få voteringar"; sections labelled by their headings ✔
- Tables have a visible `<caption>` (count, period, what "Voteringar" means, tie rule), `th scope="col"` headers and the member name as `th scope="row"` ✔
- Party codes are `<abbr title="Socialdemokraterna">`; `-` expands to "Politisk vilde" ✔
- The attendance bar is decorative (`aria-hidden`); the percentage is always text, so nothing relies on the bar or on colour ✔
- Keyboard order: skip link → site name → nav → source link → "Så räknar vi"; no focusable table content ✔
- Contrast: theme tokens only (`foreground`, `muted-foreground`, `primary` on `muted`), same palette as TASK-002 ✔

## Responsive Design

- Desktop: caveat and the "Så räknar vi" link are inside the first viewport ✔
- Mobile 390 px: columns collapse to Plats · Ledamot (party · valkrets on a second line) · Närvaro; `scrollWidth` 390 — no horizontal scroll; caveat link inside the first viewport ✔
- `tabular-nums` and right alignment keep numbers aligned ✔

## Component Patterns

- shadcn `Table` for the header; body rows are plain `tr`/`td` styled once at table level (fix 2). `Badge` replaces the hand-rolled status labels on `/partier/` and `/sa-raknar-vi/` (TASK-002 recommendation 1) ✔
- `AttendanceCaveat` is reusable on member and party pages ✔

## Interaction States

- Fully pre-rendered: no runtime loading or error states. A missing or invalid data file fails the build (TASK-005) ✔
- The below-threshold section is omitted when it has no rows ✔

## Fixed during review

1. **Freshness date** showed the newest vote in all data (15 October 2026, riksmöte 2026/27), not the period shown. Now "Voteringar från 17 oktober 2022 till 13 augusti 2026".
2. **Page weight**: per-cell utility classes made `index.html` 2.0 MB (66 kB gzipped). Body cells now carry at most one short marker class: 665 kB, visually identical.
3. **"Röstade" column** was hard to read next to members who served for very different lengths of time; replaced by "Voteringar" (votes the member could take part in) next to "Frånvarande".
4. **Below-threshold text** said the members were "oftast ersättare"; several are ministers with a single vote. Now "till exempel ersättare, statsråd eller ledamöter som lämnat riksdagen".

## Recommendations

1. TASK-007: keep the filtered list in the same table component so size and accessibility carry over; announce the result count with `aria-live`.
2. TASK-008: make member names links to `/ledamoter/{id}/`.
3. Members with full attendance over few votes (e.g. 381) rank above long-serving members at 99.8 %. This is the documented method; TASK-010 should explain it in plain words.
