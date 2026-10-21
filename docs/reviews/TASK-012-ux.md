# UX Review: TASK-012 — Pre-launch review

**Result**: PASS WITH NOTES
**Scope**: every page type on the static export (`out/`), plus the live site `https://tinget.social/`

## Automated accessibility (WCAG 2.1 A/AA)

axe-core 4.10.3 (tags `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `best-practice`) in Chromium, at 1280×900 light and 390×844 dark:

| Page | Violations |
|------|-----------:|
| `/` (default) | 0 |
| `/?parti=S` (filtered) | 0 |
| `/?period=2026-27` (riksmöte in progress) | 0 |
| `/ledamoter/0653578338415/` (ranked, no missed votes) | 0 |
| `/ledamoter/0796071663617/` (below threshold) | 0 |
| `/partier/` | 0 |
| `/sa-raknar-vi/` | 0 |
| 404 page | 0 |

No page scrolls horizontally at either width. The only console error is the 404 response on the 404 test page itself.

## Manual checks

- **Keyboard**: every focus stop shows a visible focus ring. The order is: skip link → site name → navigation → source link → caveat link → filters → table links (start page); on the methodology page, the table of contents follows the source link. The skip link moves focus into `<main>`. There are no keyboard traps ✔
- **Filters**: the native selects change the view with the arrow keys and update the URL without moving focus or changing context (WCAG 3.2.2) ✔
- **Reflow**: 320 px (≈ 400 % zoom of a 1280 px window) checked in TASK-006…010; tables scroll inside their container, and the page itself never does ✔
- **Motion**: no animations or keyframes in the CSS, so `prefers-reduced-motion` needs no handling ✔
- **Language and titles**: `<html lang="sv">`; each page has a unique `<title>` ("Partier — tinget.social", the member's name, …) ✔
- **Fairness caveat** on every page with figures; "Källa: Sveriges riksdag" in the header text and footer ✔

## SEO and sharing

- `metadataBase` is `https://tinget.social`. Every page has a canonical URL, and filter states consolidate to `/` ✔
- Open Graph: page-specific title, description, URL, `sv_SE` locale and the shared 1200×630 `og.png` (site name, "Närvaro i riksdagen", the question, source line) on every page, including member pages and the 404 page ✔
- `sitemap.xml` lists 569 URLs: 3 pages and 566 members, with `lastmod` = newest vote date. `robots.txt` allows everything and points to the sitemap ✔
- The favicon (`icon.svg`) follows the browser's colour scheme. This fixes the missing-favicon console error noted since TASK-006 ✔

## Not covered: screen reader

No screen reader is available in the review environment. Before announcing, check with NVDA + Firefox or VoiceOver + Safari:

1. The start page: the table caption and headers are read, and a change of filters is understandable (the result count line has `role="status"` and should be announced).
2. A member page: the trend table and the missed-votes list.
3. `/partier/`: party names with their codes, and "–" cells reading "inga ledamöter".

## Recommendations

1. Run the screen reader check above.
2. Post-launch: consider a party-specific or member-specific share image; the shared image is enough for launch.
