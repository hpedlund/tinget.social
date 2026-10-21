# Spec: TASK-009 — Party overview page

## Summary

`/partier/` replaces the placeholder with a fully static Server Component page: attendance per party in the default period (pooled attendance, the median and range of the party's ranked members, member counts) and a party × riksmöte table. Each party name links to the ranking pre-filtered by that party. No client JavaScript is added.

## Data Model

No change to the data contract. The page reads, through `lib/data/`:

- `getPeriods()`, `getDefaultPeriod()`
- `getParties(periodId)` for every period — pooled summary, `memberCount`, `rankedMembers` and `spread` (min/median/max of ranked members), best first

A pure builder turns them into a view model:

```ts
// lib/party-overview/overview.ts
interface PartyRow {
  party: string;               // code, e.g. "S"
  name: string;                // partyName(code)
  attendance: number;          // pooled: present / eligible over all the party's members
  memberCount: number;
  rankedMembers: number;
  spread: { min: number; median: number; max: number } | null;
  rankingHref: string;         // "/?parti=S", period added when not the default
}

interface PartyOverview {
  period: Period;              // the default period
  parties: PartyRow[];         // best first (order of parties.json); excludes "-"
  independents: PartyRow | null; // "-" (politiska vildar), shown separately
  riksmoten: Period[];         // kind = "riksmote", oldest first
  trend: { party: string; name: string; cells: (number | null)[] }[]; // per riksmöte; null = not in that riksmöte
}

buildPartyOverview({ defaultPeriodId, periods, parties: Map<periodId, PartyEntry[]> }): PartyOverview
rankingHref(party: string, periodId: string, defaultPeriodId: string): string
```

- **"Average" = pooled attendance**: all votes the party's members could take part in, together — the figure the member page already shows as "Partiets snitt". It weights members by how many votes they served, so a member who served briefly does not count as much as a full-term member. The median of the ranked members is shown next to it.
- **Party assignment** (TASK-004): the pooled figure and `memberCount` count each vote for the party the member had at that vote (a member who switched counts in both parties; substitutes for their own votes); `spread` uses ranked members by their latest party in the period. The page says so.
- **Trend order**: parties in headline order; parties that only appear in other periods follow, in `PARTY_CODES` order. `"-"` is not in the trend table.
- **`rankingHref`** builds the query with `URLSearchParams` (`parti`, plus `period` only when not the default), matching what `parseViewState` reads. Unknown values are already ignored by the ranking.

`lib/party-overview/load.ts` (server-only) loads every period's parties through `lib/data/` and calls the builder; the page and `data:check` use it.

## Routes

`app/partier/page.tsx` — static, `metadata` description "Genomsnittlig närvaro i riksdagens voteringar per parti {label}." via `generateMetadata`.

## Component Tree

```
app/partier/page.tsx (Server)
├── header
│   ├── h1 "Partier"
│   ├── p lead: "Partiernas närvaro i riksdagens voteringar: andelen voteringar där partiets ledamöter röstade Ja, Nej eller Avstår."
│   ├── p "Källa: Sveriges riksdag."
│   └── AttendanceCaveat
├── section aria-labelledby="narvaro": h2 "Närvaro {label}" (+ " (pågår)")
│   ├── PartyTable rows={parties}
│   │   caption: what Närvaro, Median and Lägst–högst mean; "Välj ett parti för att se dess ledamöter i rankingen."
│   │   Parti (th: swatch + Link name + code) | Närvaro (+bar) | Median | Lägst–högst (sm+) | Ledamöter (sm+)
│   └── p (when independents): "Politiska vildar (ledamöter utan parti): {n} ledamöter, {X %} närvaro. Visa dem i rankingen." (link)
└── section aria-labelledby="per-riksmote": h2 "Per riksmöte"
    └── PartyTrendTable: Parti | 2022/23 | … | 2026/27 (pågår)  — percent text per cell, "–" + sr-only "inga ledamöter" when null
```

- **Party colours** (`/component-design`: only in party contexts): `partyColor(code)` in `lib/parties.ts`, used only as an `aria-hidden` swatch next to the party name on this page. The name is always shown, so nothing depends on colour. The swatch has a border so light colours (SD yellow) stay visible on both themes.
- **Links**: `<Link href={rankingHref} prefetch={false}>` with the full party name as link text; the code follows as muted plain text.
- **Tables** follow `MemberTrendTable`: shadcn `Table`, table-level body styling, `tabular-nums`, bars `aria-hidden`. Lower-priority columns hide below `sm`; the trend table has six columns and scrolls inside the table container on narrow screens if needed (no page scroll).
- **Lägst–högst**: "45,9–100,0 %"; "–" when `spread` is `null` (no ranked members).
- **Ledamöter**: `memberCount`, with "{rankedMembers} rankade" muted when they differ.

## Key UI states

- **Default**: as above; fully static, works without JavaScript.
- **Tied attendance** (2026/27: six parties at 100,0 %): order from `parties.json` (stable), no ranks are shown, so ties need no handling.
- **No independents** in the default period: the paragraph is omitted.
- **Errors**: data problems fail the build; the root `app/error.tsx` covers the rest.

## Technical Decisions

- **No period selector**: the headline is the default period (as on the member page) and the trend table shows every riksmöte, so all periods in the data are on the page without client JS. The page is ≈ 100 rows of text.
- **Politiska vildar separate**: they are not a party, and their pooled figure is not a party average; listing them in the table would rank them among parties. They are still shown, with a link to their rows in the ranking.
- **Security**: party codes reach URLs only through `URLSearchParams`; all text is rendered as React text; colours are fixed constants, not data.

## Testing

- `lib/party-overview/overview.test.ts`: headline period = default; parties in data order without `"-"`; independents extracted; trend cells per riksmöte with `null` for a missing party, parties only in other periods appended; `rankingHref` with/without period and encoding of `-`.
- `scripts/check.ts`: builds the overview (every period must have a `parties.json` entry).
- Browser (Chromium on `out/`, desktop and 390 px, light and dark): party link opens the ranking filtered by that party; independents link; keyboard order; no horizontal page scroll.

## Implementation Order

1. `partyColor` in `lib/parties.ts`; `lib/party-overview/` + tests.
2. `components/party-table.tsx`, `components/party-trend-table.tsx`.
3. `app/partier/page.tsx`.
4. `scripts/check.ts`.
5. lint, typecheck, test, data:check, build, browser check.

## Files to Create/Modify

- `lib/parties.ts` — `partyColor(code)`
- `lib/party-overview/overview.ts`, `lib/party-overview/overview.test.ts` — view model (pure)
- `lib/party-overview/load.ts` — server-only loader
- `components/party-table.tsx`, `components/party-trend-table.tsx`
- `app/partier/page.tsx`
- `scripts/check.ts`
- `docs/tasks/TASK-009.md`, `docs/tasks/BACKLOG.md` — status
