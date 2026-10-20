# Spec: TASK-008 — Member detail page

## Summary

One static page per member at `/ledamoter/{id}/` (566 pages): attendance in the headline period with rank and the party's average, totals per vote type, attendance per riksmöte, and every missed vote linking to the vote on data.riksdagen.se. The page is a Server Component with no client JavaScript of its own. Names in the ranking tables become links to these pages.

## Data Model

No change to the data contract. The page reads, through `lib/data/`:

- `getMember(id)` — member file with `missedVotes` resolved (`MemberDetail`)
- `getPeriods()`, `getDefaultPeriod()`
- `getRanking(periodId)` for each period the member has — the member's row gives the party in that period and the ranked count ("plats 12 av 349")
- `getParties(periodId)` — the party's pooled attendance in the same period

A pure builder turns them into a view model:

```ts
// lib/member/profile.ts
interface MemberPeriodRow {
  periodId: string; label: string; kind: "term" | "riksmote"; complete: boolean;
  rank: number | null;          // null = below the period's threshold
  rankedCount: number;          // ranking.ranked.length
  minEligibleVotes: number;
  counts: VoteCounts; eligible: number; attendance: number;
  party: string;                // the member's party in this period (ranking row)
  partyAttendance: number | null; // pooled party attendance; null for "-" or no entry
}

interface MissedVoteGroup { riksmote: string; votes: MissedVote[] }  // votes in date order

interface MemberProfile {
  headline: MemberPeriodRow;      // default period if the member has it, else their latest period
  riksmoten: MemberPeriodRow[];   // kind = "riksmote", oldest first
  missed: MissedVoteGroup[];      // newest riksmöte first; only riksmöten with misses
  missedCount: number;
}

buildMemberProfile(member, { defaultPeriodId, periods, rankings, parties }): MemberProfile
```

- **Figures match the ranking page by construction**: the builder throws if the member's row in a period's ranking is missing or its `rank`, `attendance`, `eligible` or `counts.franvarande` differ from the member file — a mismatch fails `next build` (and `npm run data:check`, which builds every profile).
- 115 members only have `2026-27` (new members after the 2026 election); their headline is that period.
- Nothing is computed in the browser; the builder only selects and joins precomputed values.

## Routes

`app/ledamoter/[id]/page.tsx`

- `generateStaticParams` → `getAllMemberIds()`; `export const dynamicParams = false`. In the static export an unknown id has no file, so GitHub Pages serves `404.html` (the root `not-found.tsx`). The page also calls `notFound()` if `getMember` returns `null`.
- `generateMetadata`: title = name (layout template adds "— tinget.social"); description = "Närvaro i riksdagens voteringar för {name} ({party}), {constituency}: {X %} {label}." (constituency omitted when empty).

## Component Tree

```
app/ledamoter/[id]/page.tsx (Server)
├── nav aria-label="Brödsmulor": "Närvaro" (link /) › name (aria-current="page")
├── header
│   ├── h1 {name}
│   ├── p: "{partyName} ({code}) · {constituency} · {status}"   (status omitted if it starts with "Avliden")
│   ├── p: "Källa: Sveriges riksdag (ledamotens sida)" — links to riksdagen.se profile
│   └── AttendanceCaveat
├── section aria-labelledby="narvaro": h2 "Närvaro {label}" (+ " (pågår)")
│   ├── big figure {X %} + "Plats {rank} av {rankedCount}" | "Rankas inte — färre än {min} voteringar under perioden."
│   ├── "{partyName}s snitt: {Y %}" (omitted for "-"/unknown)
│   └── dl (grid 2 → 5 cols): Voteringar, Ja, Nej, Avstår, Frånvarande
├── section aria-labelledby="per-riksmote": h2 "Per riksmöte"   (when ≥ 1 riksmöte row)
│   └── MemberTrendTable: Riksmöte | Närvaro (+bar) | Plats | Voteringar | Frånvarande | Partiets snitt
└── section aria-labelledby="missade": h2 "Missade voteringar"
    ├── p "{n} voteringar där {name} var frånvarande, nyast först per riksmöte." | "Inga missade voteringar."
    └── per group: details (newest open) > summary "{rm} — {n} voteringar" > MissedVotesTable
        Datum | Votering ("{rm}:{beteckning} punkt {p}" link, "(motivfrågan)" when so) | Ja–Nej (result)
```

- **Source links**: member → `https://www.riksdagen.se/sv/ledamoter-och-partier/ledamot/_{id}/` (riksdagen.se redirects to the profile); vote → `https://data.riksdagen.se/votering/{id}/html` (Riksdagen's page of the vote with every member's vote). Both built in `lib/site.ts` from a constant host and `encodeURIComponent(id)`. Vote links are the rendered vote designation (descriptive link text); the column header says "Votering (riksdagen.se)".
- **Trend table** "Plats" shows "–" with an `sr-only` "rankas inte" when below threshold; the in-progress riksmöte reads "2026/27 (pågår)".
- **Missed-vote tables** reuse the table-level styling approach of `RankingTable` (no per-cell utility strings): Åkesson has 2 256 missed votes.
- **Ranking tables**: the name cell becomes `<Link href="/ledamoter/{id}/" prefetch={false}>` — prefetch off, or ~450 visible links would each fetch a page payload.

## Key UI states

- **Default**: as above; fully static, works without JavaScript.
- **No misses**: "Inga missade voteringar." and no groups.
- **Below threshold in the headline period**: no rank, explanation instead; figures still shown.
- **Unknown id**: 404 page.
- **Errors**: data problems fail the build; the root `app/error.tsx` covers the rest.

## Technical Decisions

- **Server Component only**: nothing on the page is interactive; `<details>` gives collapsible groups without JS.
- **Page weight budget**: largest member page ≤ 800 kB (`out/ledamoter/*/index.html`), typical ≤ 150 kB. A Server Component's markup appears twice (HTML + RSC payload), so missed-vote rows are kept minimal. If the budget is exceeded, render the missed-vote list from compact tuple props in a Client Component (as TASK-007).
- **Status shown neutrally** (TASK-005 security note): the `personlista` status is public role information; "Avliden …" is not shown — it adds nothing to attendance figures.
- **Party average** is the pooled party attendance from `parties.json` for the same period and the member's party in that period — not the party's current members.
- **Security**: ids reaching URLs are schema-validated numeric strings (members) or Riksdagen vote ids, always `encodeURIComponent`-ed into fixed hosts. All text is rendered as React text.

## Testing

- `lib/member/profile.test.ts`: headline = default period, fallback to latest period; riksmöte rows oldest first; party per period from the ranking row; party average lookup and `null` for `-`; misses grouped newest riksmöte first, date order inside; throws on missing ranking row or mismatching figures.
- `lib/site` URL helpers: encoding.
- `scripts/check.ts`: builds every member's profile (enforces the cross-file agreement in CI).
- Browser (Chromium on `out/`, desktop and 390 px): a ranked member, a below-threshold member, a 2026/27-only member, Åkesson; ranking name links navigate; unknown id → 404; keyboard through breadcrumb, details and links; no horizontal scroll.
- Size check per the budget above.

## Implementation Order

1. `lib/site.ts` URL helpers; `lib/member/profile.ts` + tests.
2. `components/member-trend-table.tsx`, `components/missed-votes-table.tsx`.
3. `app/ledamoter/[id]/page.tsx`.
4. Name links in `components/ranking-table.tsx`.
5. `scripts/check.ts`.
6. lint, typecheck, test, data:check, build, browser and size checks.

## Files to Create/Modify

- `lib/member/profile.ts`, `lib/member/profile.test.ts` — view model (pure)
- `lib/site.ts` — `memberSourceUrl`, `voteSourceUrl`
- `components/member-trend-table.tsx`, `components/missed-votes-table.tsx`
- `app/ledamoter/[id]/page.tsx`
- `components/ranking-table.tsx` — name links
- `scripts/check.ts` — build every profile
- `docs/tasks/TASK-008.md`, `docs/tasks/BACKLOG.md` — status
