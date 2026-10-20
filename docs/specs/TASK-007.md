# Spec: TASK-007 — Ranking filters and sorting

## Summary

Make the start page's ranking explorable: filter by period, party and constituency (valkrets), sort most present or most absent first, and keep that state in the URL so a view can be reloaded, shared and navigated with the back button. The ranking moves from a Server Component into one Client Component, `RankingExplorer`, that receives every period's rows as compact props at build time. Static export has no request-time `searchParams`, so the HTML is always the default view; the URL state is applied right after hydration.

## Data Model

No change to the data contract. The page reads `getPeriods()`, `getDefaultPeriod()` and `getRanking(id)` for every period through `lib/data/`, and a pure function turns them into a compact client payload:

```ts
// lib/ranking/explorer.ts
/** [member index, rank (0 = below threshold), attendance, eligible, absent, party index, constituency index] */
type CompactRow = [number, number, number, number, number, number, number];

interface ExplorerPeriod {
  id: string; label: string; kind: "term" | "riksmote"; complete: boolean;
  totalVotes: number; minEligibleVotes: number;
  firstVoteDate: string | null; lastVoteDate: string | null;
  rows: CompactRow[];            // ranked rows in rank order, then below-threshold rows alphabetically (as in the file)
}

interface ExplorerData {
  defaultPeriodId: string;
  members: { id: string; name: string }[];   // each member once
  parties: string[];                          // codes; PARTY_NAMES order, unknown codes last
  constituencies: string[];                   // sorted with sv collation
  periods: ExplorerPeriod[];                  // meta order: term first, then riksmöten
}
```

- Party and constituency are stored **per row**, not per member: a member can change party (to `-`) or constituency between periods.
- `absent` = `counts.franvarande`; `attendance` is passed through unchanged — the browser never computes attendance.
- Why tuples: the payload is serialised into the page's RSC data. All six periods are ≈ 150 kB raw (≈ 33 kB gzip) as tuples versus ≈ 350 kB as row objects. Replacing the Server Component table's serialised element tree (≈ 375 kB today) with these props should make `index.html` *smaller* than the TASK-006 665 kB. Budget: `out/index.html` ≤ 665 kB.
- When the payload outgrows ~100 kB gzip (several terms), switch non-default periods to static JSON files emitted at build time; the decoder is the seam.

## View state

```ts
interface ViewState {
  periodId: string;                 // default: data.defaultPeriodId
  party: string | null;             // null = all
  constituency: string | null;      // null = all
  order: "narvaro" | "franvaro";    // most present first (default) | most absent first
}
```

URL query parameters, Swedish and readable; default values are omitted so the default view is the bare `/`:

| Param | Example | Valid values |
|-------|---------|--------------|
| `period` | `period=2023-24` | a period id in the data |
| `parti` | `parti=SD`, `parti=-` | a party code in `data.parties` |
| `valkrets` | `valkrets=Sk%C3%A5ne+l%C3%A4ns+v%C3%A4stra` | a constituency in `data.constituencies` |
| `ordning` | `ordning=franvaro` | `franvaro` |

- `parseViewState(search, data)`: the query string is untrusted input — each value is accepted only if it is in the corresponding list (exact match), otherwise that parameter falls back to its default. Unknown parameters are ignored. Never throws.
- `toSearch(state, data)`: `URLSearchParams` in fixed order `period, parti, valkrets, ordning`, defaults omitted; returns `""` or `"?…"`.

## Selecting rows

`selectRows(data, state) → { period, ranked: TableRow[], belowThreshold: TableRow[], totalRanked, totalBelow }`

- Decode the period's rows into `TableRow { memberId, name, party, constituency, rank: number | null, attendance, eligible, absent }`.
- Filter both lists by party and constituency (AND).
- `ranked` keeps rank order for `narvaro`; for `franvaro` it is **stable-sorted by rank descending**, so tied members stay alphabetical in both directions. Ranks are always the overall rank in the period (filtering never re-numbers).
- `belowThreshold` is filtered but always alphabetical (it is not a ranking).
- `totalRanked` / `totalBelow` are the unfiltered counts for the status text.

## Data Flow

```
build: app/page.tsx (Server)
  getPeriods() + getRanking(id) ×6  ──► buildExplorerData()  ──► <RankingExplorer data={…}/> props
browser:
  location.search ──useSearchState──► parseViewState ──► selectRows ──► tables
  select change ──► toSearch ──► history.pushState + notify ──► re-render
  back/forward  ──► popstate ──► re-render
```

### `lib/use-search-state.ts` (client hook)

`useSearchState(): [search: string, push: (search: string) => void]`

- `useSyncExternalStore(subscribe, () => location.search, () => "")`: the server snapshot is `""`, so hydration matches the prerendered default view and React re-renders with the real query string right after hydration (no hydration mismatch).
- `subscribe` listens to `popstate` and to an in-module listener set.
- `push(search)`: `history.pushState(history.state, "", pathname + search + hash)` and notify listeners. Next.js integrates native `pushState` with its router; no navigation or RSC fetch happens. Every change is one history entry, so Back undoes the last change.
- Why not `useSearchParams`: in a static export it forces the component to bail out to client rendering up to the nearest `<Suspense>`, so the HTML would contain no table at all. Why not `router.push`: it triggers a route transition and fetches the RSC payload for the same page.

## Component Tree

```
app/page.tsx (Server)
├── header
│   ├── h1 "Närvaro i riksdagen"
│   ├── lead: "Andel av riksdagens voteringar där ledamoten röstade Ja, Nej eller Avstår."  (period-neutral now)
│   ├── "Källa: Sveriges riksdag"
│   └── AttendanceCaveat (unchanged)
└── RankingExplorer data={…} (Client, components/ranking-explorer.tsx)
    ├── section aria-labelledby="rankning"
    │   ├── h2#rankning "Rankning {period.label}"
    │   ├── p: "{totalVotes} voteringar från {first} till {last}." (+ " Riksmötet pågår." when !complete)
    │   ├── RankingFilters (Client, components/ranking-filters.tsx)
    │   │   form role="search" aria-label="Filtrera rankningen" (onSubmit preventDefault)
    │   │   ├── NativeSelect "Period"  — "2022–2026 (hela mandatperioden)", "2022/23", …, "2026/27 (pågår)"
    │   │   ├── NativeSelect "Parti"   — "Alla partier", "Socialdemokraterna (S)", …, "Politiska vildar (-)"
    │   │   ├── NativeSelect "Valkrets" — "Alla valkretsar", 29 constituencies
    │   │   ├── NativeSelect "Ordning" — "Högst närvaro först" | "Lägst närvaro först"
    │   │   └── Button variant=outline "Rensa filter"
    │   ├── p role="status" (aria-live polite, aria-atomic) — result count
    │   ├── RankingTable rows=ranked sortDirection   — or EmptyState when ranked is empty
    └── section aria-labelledby="fa-voteringar"  (only when belowThreshold non-empty after filtering)
        ├── h2 "Ledamöter med få voteringar"
        ├── explanation (unchanged, uses period.minEligibleVotes)
        └── RankingTable rows=belowThreshold
```

- Selects apply immediately on `change` (a same-page content update, not a change of context — WCAG 3.2.2 holds). Each select has a visible `<label>`. Layout: one column on mobile, `sm:grid-cols-2`, `lg:` four selects + button in a row.
- **Rensa filter** resets period, party and constituency to defaults and keeps the sort order (sorting is not a filter). It is always rendered; when nothing is filtered it is a no-op. After clearing, focus moves to the Period select so focus is never lost (the empty-state button disappears on clear).
- **Status text** (`role="status"`, present from first render so later updates are announced):
  - unfiltered: "Visar alla {n} rankade ledamöter."
  - filtered: "Visar {k} av {n} rankade ledamöter." and, when the period has below-threshold members, " {k2} av {n2} ledamöter med få voteringar visas separat."
- **Empty state** (ranked list empty): bordered box in place of the table, "Inga rankade ledamöter matchar filtren {period}." + `Button` "Rensa filter". The below-threshold section is hidden when it has no rows.
- **Caption** of the ranked table: "{k} riksdagsledamöter rankade efter närvaro i voteringar {label}, {högst|lägst} närvaro först. … Lika närvaro ger delad plats." plus, when filtered, "Plats gäller hela riksdagen." Below-threshold caption as today with the filtered count.
- `RankingTable` gets `sortDirection?: "ascending" | "descending"` → `aria-sort` on the Närvaro header (descending = most present first). It takes `TableRow` instead of the contract rows.

### Shared UI

| Component | File | Notes |
|-----------|------|-------|
| `NativeSelect` | `components/ui/native-select.tsx` | shadcn/ui Native Select (new-york-v4) shape: styled `<select>` with a decorative chevron (inline SVG, `aria-hidden`), `appearance-none`, theme tokens, `focus-visible` ring, `h-9`. No dependencies. |
| `Button` | `components/ui/button.tsx` | shadcn/ui Button without `cva`/`asChild` (like Badge); variants `default`, `outline`; one size. |

No new npm dependencies.

## Key UI states

- **Before hydration / no JavaScript**: the default view is fully rendered (table, counts, filters showing defaults). Without JS the selects do nothing; acceptable for Version 1.
- **Shared URL**: the default view is shown for one frame, then the URL view. No loading spinner (no fetch).
- **Invalid URL values**: silently ignored per parameter (e.g. `?parti=XYZ&period=2023-24` → all parties, 2023/24). The URL is not rewritten.
- **Empty**: see above.
- **Errors**: the explorer does no I/O; add a root `app/error.tsx` (Client) as the boundary the coder guidelines require — "Något gick fel" + "Försök igen" (`reset`) + link to the start page.

## Technical Decisions

- **All periods embedded** rather than fetched: no loading or error states, works offline once loaded, and the compact payload is smaller than today's serialised table. Revisit with more terms (see Data Model).
- **One client component, filtered client-side**: as `PROJECT.md` prescribes for static export.
- **Overall rank kept when filtered** — "plats 12 av 349" stays true and matches member pages (TASK-008); the caption says so.
- **Body-cell styling stays table-level** (TASK-006 page-weight fix) — `RankingTable` markup is unchanged apart from props.
- **Security**: query values are only compared against known lists and rendered as React text; nothing from the URL reaches `href`, `style` or HTML. `pushState` keeps the same path and origin.
- **Performance**: re-filtering ≤ 600 rows on change is trivial; `selectRows` is memoised on `(search)`.

## Testing

- `lib/ranking/explorer.test.ts` (fixture data, no files):
  - `buildExplorerData`: members de-duplicated; per-period party/constituency kept; party order; constituency sv order; rank 0 for below-threshold; round trip through `selectRows` equals the contract rows.
  - `parseViewState`: defaults for `""`; each valid param; invalid values per param fall back; `toString`-like and empty values rejected; `toSearch(parseViewState(x))` normalises.
  - `selectRows`: party filter, constituency filter, combined, empty result; `franvaro` reverses ranks with ties alphabetical; below-threshold filtered and alphabetical.
- Browser (Chromium on `out/`, desktop and 390 px): filter + sort + reload restores the view; Back undoes the last change; Rensa filter; empty state (e.g. `?parti=-&valkrets=Gotlands+län`); status text updates; keyboard-only operation; no hydration warnings in the console; no horizontal scroll on mobile.
- Size check: `out/index.html` ≤ 665 kB.

## Implementation Order

1. `lib/ranking/explorer.ts` + tests.
2. `components/ui/native-select.tsx`, `components/ui/button.tsx`.
3. `lib/use-search-state.ts`.
4. `components/ranking-table.tsx` (row type, `aria-sort`), `components/ranking-filters.tsx`, `components/ranking-explorer.tsx`.
5. `app/page.tsx`, `app/error.tsx`.
6. lint, typecheck, test, build, browser check, size check.

## Files to Create/Modify

- `lib/ranking/explorer.ts` — compact payload, view state parse/serialise, row selection (pure)
- `lib/ranking/explorer.test.ts` — unit tests
- `lib/use-search-state.ts` — URL query state hook (client)
- `components/ui/native-select.tsx`, `components/ui/button.tsx` — shadcn/ui primitives
- `components/ranking-explorer.tsx` — client explorer
- `components/ranking-filters.tsx` — filter form
- `components/ranking-table.tsx` — `TableRow` props, `aria-sort`
- `app/page.tsx` — builds the payload, period-neutral header
- `app/error.tsx` — root error boundary
- `docs/tasks/TASK-007.md`, `docs/tasks/BACKLOG.md` — status
