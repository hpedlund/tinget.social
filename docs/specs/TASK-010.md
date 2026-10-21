# Spec: TASK-010 — Methodology page (Så räknar vi)

## Summary

`/sa-raknar-vi/` replaces the short placeholder with the full method description in plain Swedish: what attendance means, which votes count for whom, periods and the ranking threshold, how party figures are formed, what the numbers do not show, where the data comes from and how to report errors. It is a static Server Component. Every rule it states is the rule implemented in `lib/attendance/` (TASK-004), `lib/pipeline/` (TASK-005) and `lib/format.ts`; the numbers it quotes (votes and threshold per period, date of the newest vote) are read from `meta.json` through `lib/data/`, so the page cannot drift from the data. The ranking, member and party pages already link to it through `AttendanceCaveat`; this task adds deep links from the places that mention the threshold or party figures.

## Data Model

No change to the data contract. The page reads `getMeta()` (`lastVoteDate`, `defaultPeriodId`, `periods[]` with `label`, `kind`, `complete`, `totalVotes`, `minEligibleVotes`, `firstVoteDate`, `lastVoteDate`).

The threshold share is rendered from `DEFAULT_THRESHOLD_SHARE` in `lib/attendance/` (not retyped), via a small pure helper:

```ts
// lib/format.ts
formatShare(0.1) → "10 %"   // whole percent, for rules rather than measured values
```

## Content (rules → source of truth)

| Section (h2, id) | States | Implemented in |
|---|---|---|
| Lead | Every vote records each seat as Ja, Nej, Avstår or Frånvarande; data up to `lastVoteDate`; Källa: Sveriges riksdag | `meta.json`, data/README |
| Närvaro (`#narvaro`) | Närvaro = (Ja + Nej + Avstår) / voteringar ledamoten kunde delta i. Avstår counts as present (showed up and took a position). Worked example. Shown with one decimal, cut off rather than rounded, so 100,0 % means no missed vote | `summarize`, `formatPercent` |
| Vilka voteringar räknas (`#voteringar`) | All recorded votes in the chamber (huvudvoteringar, incl. omröstningar such as the PM vote); a member counts only for votes where they held a seat. On leave or as statsråd → an ersättare takes the seat and is measured on their own votes; the absent member is neither present nor absent for those votes. Talman never votes and is not in the data; the talmansersättare is measured like other members. Voided votes Riksdagen does not list are excluded | `computeAttendance` (eligible = own records), data/README |
| Perioder (`#perioder`) | Whole term (default) and each riksmöte, each ranked separately; ongoing riksmöte marked "pågår". Table: Period · Voteringar · Gräns för ranking · Första–senaste votering | `meta.periods` |
| Ranking (`#ranking`) | Ranked when eligible for at least 10 % of the period's votes (rounded up); others listed under "Ledamöter med få voteringar". Highest attendance first; equal attendance shares the place, then alphabetical. A short-serving member with 100,0 % can rank above a long-serving member at 99,8 % — that is the method, not an error | `rank`, `DEFAULT_THRESHOLD_SHARE` |
| Partier (`#partier`) | Party attendance = all votes the party's members could take part in, pooled (not the mean of members); median, lowest, highest from ranked members by latest party in the period. Each vote counts for the party at the time, so a party switcher appears in both; substitutes count for their own votes. Politiska vildar (no party) are shown apart and have no party average | `summarizeParties`, `partyEntries` |
| Vad siffrorna inte visar (`#begransningar`) | Data shows *that* someone was absent, not *why*. Kvittning explained; parental leave, illness, official duties (e.g. abroad for Riksdagen). Votes are only part of the job (committees, constituency work). Shows whether, not how, someone voted. Never a judgement of individuals | PROJECT.md caveats |
| Källor och rådata (`#kallor`) | Riksdagens öppna data (link); which sources are used (voteringslistor, bulk vote datasets, single votes, personlista); each missed vote on a member page links to Riksdagen's record of the vote; computed files in `data/` in the repository with full history, and the code. Updates: figures are recomputed when the site is rebuilt with new data — newest vote date shown | data/README, `voteSourceUrl` |
| Hittat ett fel? (`#fel`) | Report via GitHub issues (link); include page and what looks wrong | `REPOSITORY_URL` |

Plain language: short sentences, Swedish terms explained the first time (riksmöte, votering, ersättare, kvittning). No formulas in code font; the definition is a sentence plus an example.

## Routes

`app/sa-raknar-vi/page.tsx` — static Server Component, `metadata` title "Så räknar vi", description "Hur närvaron i riksdagens voteringar räknas, vilka voteringar som ingår och vad siffrorna inte visar."

## Component Tree

```
app/sa-raknar-vi/page.tsx (Server)
├── header (max-w-2xl)
│   ├── h1 "Så räknar vi"
│   ├── p lead
│   ├── p "Källa: Sveriges riksdag. Uppgifterna gäller voteringar till och med {date}."
│   └── nav aria-label="Innehåll" → ol of anchor links to each h2
├── section#narvaro … section#fel (aria-labelledby → h2), prose max-w-2xl
└── section#perioder contains PeriodTable (inline in the page; shadcn Table):
    caption, th scope=col: Period | Voteringar | Gräns för ranking | Voteringar från–till (sm+)
    rows: label (+ " (pågår)"), formatNumber(totalVotes), formatNumber(minEligibleVotes), dates
```

- No client JavaScript; plain `<a>` for external links, `Link` for internal ones.
- Link styling: the shared `underline underline-offset-4 …` class used on other pages.
- Removes the "Fullständig metodbeskrivning kommer" badge.

## Deep links from other pages

- `components/ranking-explorer.tsx`: "(en tiondel av perioden)" in the few-votes paragraph gets a link "Varför?" → `/sa-raknar-vi/#ranking`.
- `app/ledamoter/[id]/page.tsx`: the "Rankas inte" line links "Så räknar vi" → `/sa-raknar-vi/#ranking`.
- `app/partier/page.tsx`: the party-assignment paragraph ends with a link → `/sa-raknar-vi/#partier`.

## Technical Decisions

- **Numbers from data, rules from code constants**: the period table and the date come from `meta.json`; the threshold share from `DEFAULT_THRESHOLD_SHARE`. Prose describing rules is static text, checked against the implementation in this spec's table.
- **One page file**: the content is page-specific; no new shared components besides the formatting helper.
- **Update frequency**: the daily refresh is TASK-011 and not built yet, so the page says the figures are recomputed when new data is fetched and shows the newest vote date. TASK-011 should change that sentence to "varje dag".

## Implementation Order

1. `formatShare` in `lib/format.ts` + test.
2. Rewrite `app/sa-raknar-vi/page.tsx` per the table above.
3. Deep links in ranking explorer, member page and party page.
4. `npm run lint`, `typecheck`, `test`, `data:check`, `build`; check `/sa-raknar-vi/` in the export.

## Files to Create/Modify

- `lib/format.ts`, `lib/format.test.ts` — `formatShare`
- `app/sa-raknar-vi/page.tsx` — full methodology page
- `components/ranking-explorer.tsx` — link to `#ranking`
- `app/ledamoter/[id]/page.tsx` — link to `#ranking`
- `app/partier/page.tsx` — link to `#partier`
