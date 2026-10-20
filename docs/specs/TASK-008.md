# Spec: TASK-008 — Member detail page

## Summary

One static page per member at `/ledamoter/{id}/` (566 pages): attendance in the headline period with rank and the party's average, totals per vote type, attendance per riksmöte, and every missed vote linking to the vote on data.riksdagen.se. The page is a Server Component; only the missed-vote list is a Client Component, for page weight (see Technical Decisions). Names in the ranking tables become links to these pages.

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

/** [vote id, date, beteckning, punkt, motivfrågan (1) or not (0), Frånvarande in the vote] */
type CompactMissedVote = [string, string, string, number, 0 | 1, number];
compactMissedVotes(groups: MissedVoteGroup[]): { riksmote: string; votes: CompactMissedVote[] }[]
```

`lib/member/load.ts` (server-only) loads a member and their periods' rankings and parties through `lib/data/` and calls the builder; the page and `data:check` use it.

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
│   ├── "Snitt för {partyName}: {Y %}." (omitted for "-"/unknown)
│   └── dl (grid 2 → 5 cols, Voteringar full width on mobile): Voteringar, Ja, Nej, Avstår, Frånvarande
├── section aria-labelledby="per-riksmote": h2 "Per riksmöte"   (when ≥ 1 riksmöte row)
│   └── MemberTrendTable: Riksmöte | Närvaro (+bar) | Plats | Voteringar | Frånvarande | Partiets snitt
└── section aria-labelledby="missade": h2 "Missade voteringar"
    ├── p "{n} voteringar där {name} var frånvarande, nyast först per riksmöte." | "Inga missade voteringar."
    └── MissedVotes (Client) groups={compactMissedVotes(…)}
        per group: details (collapsed) > summary "{rm} — {n} voteringar" > table (sr-only caption)
        Datum | Votering hos riksdagen ("{beteckning} punkt {p}" link, "(motivfrågan)" when so) | Frånvarande totalt (sm+)
```

- **Source links**: member → `https://www.riksdagen.se/sv/ledamoter-och-partier/ledamot/_{id}/` (riksdagen.se redirects to the profile); vote → `https://data.riksdagen.se/votering/{id}/html` (Riksdagen's page of the vote with every member's vote). Both built in `lib/site.ts` from a constant host and `encodeURIComponent(id)`. Vote links are the rendered vote designation; the column header says "Votering hos riksdagen". "Frånvarande totalt" (absent in that vote) gives context: many absent at once often means kvittning.
- **Trend table** "Plats" shows "–" with an `sr-only` "rankas inte" when below threshold; the in-progress riksmöte reads "2026/27 (pågår)".
- **Missed-vote tables** reuse the table-level styling approach of `RankingTable` (no per-cell utility strings): Åkesson has 2 256 missed votes. Groups start collapsed so the page ends after the summary; links in closed groups are not in the tab order.
- **Ranking tables**: the name cell becomes `<Link href="/ledamoter/{id}/" prefetch={false}>` — prefetch off, or ~450 visible links would each fetch a page payload.

## Key UI states

- **Default**: as above; fully static, works without JavaScript.
- **No misses**: "Inga missade voteringar." and no groups.
- **Below threshold in the headline period**: no rank, explanation instead; figures still shown.
- **Unknown id**: 404 page.
- **Errors**: data problems fail the build; the root `app/error.tsx` covers the rest.

## Technical Decisions

- **Server Component, one Client Component for weight**: nothing on the page is interactive; `<details>` gives collapsible groups without JS. The list is still fully prerendered to HTML.
- **Page weight budget**: largest member page ≤ 800 kB (`out/ledamoter/*/index.html`), typical ≤ 150 kB. Rendered as a Server Component, a row appears twice (HTML + RSC element tree): largest page 1.26 MB, all member pages 88 MB. With the list rendered from compact tuple props in a Client Component (as TASK-007): largest 575 kB (142 kB gzip), all member pages 48.7 MB (≈ 86 kB average).
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
2. `components/member-trend-table.tsx`, `components/missed-votes.tsx`.
3. `app/ledamoter/[id]/page.tsx`.
4. Name links in `components/ranking-table.tsx`.
5. `scripts/check.ts`.
6. lint, typecheck, test, data:check, build, browser and size checks.

## Files to Create/Modify

- `lib/member/profile.ts`, `lib/member/profile.test.ts` — view model (pure)
- `lib/site.ts` — `memberSourceUrl`, `voteSourceUrl`
- `lib/member/load.ts` — server-only loader
- `components/member-trend-table.tsx`, `components/missed-votes.tsx` (Client)
- `app/ledamoter/[id]/page.tsx`
- `components/ranking-table.tsx` — name links
- `scripts/check.ts` — build every profile
- `docs/tasks/TASK-008.md`, `docs/tasks/BACKLOG.md` — status
