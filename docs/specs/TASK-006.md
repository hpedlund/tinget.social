# Spec: TASK-006 — Attendance ranking page

## Summary

Replace the placeholder start page with the attendance ranking for the default period (`meta.defaultPeriodId`, the full 2022–2026 term). The page is a Server Component rendered at build time from `lib/data/` — no client JavaScript of its own. It shows a short intro, the caveat with a link to "Så räknar vi", the ranked table and, separately, the members below the vote threshold. Filters and sorting are TASK-007.

## Page structure (`app/page.tsx`, Server)

```
Home
├── header
│   ├── h1 "Närvaro i riksdagen"
│   ├── lead: "Andel av riksdagens {totalVotes} voteringar {period.label} där ledamoten röstade Ja, Nej eller Avstår."
│   └── "Voteringar från {period.firstVoteDate} till {period.lastVoteDate}" (sv dates) · "Källa: Sveriges riksdag"
├── AttendanceCaveat           — aside, bordered; kvittning/leave/illness/duties; link to /sa-raknar-vi/
├── section "Rankning" (h2, sr-only heading text visible as table caption)
│   └── RankingTable rows=ranked
└── section "Ledamöter med få voteringar" (h2)
    ├── explanation: fewer than {minEligibleVotes} votes (10 %) → not ranked
    └── RankingTable rows=belowThreshold (no rank column)
```

Order puts the caveat directly under the lead so it and the method link are above the fold on desktop (acceptance criterion).

## Components

| Component | File | Kind | Notes |
|-----------|------|------|-------|
| `Table`, `TableHeader`, `TableBody`, `TableRow`, `TableHead`, `TableCell`, `TableCaption` | `components/ui/table.tsx` | Server | shadcn/ui (new-york-v4) source, added by hand (registry not reachable from the dev environment); no dependencies |
| `Badge` | `components/ui/badge.tsx` | Server | shadcn/ui Badge without `cva`/`asChild` (avoids two dependencies); variants `default`, `secondary`, `outline` |
| `AttendanceCaveat` | `components/attendance-caveat.tsx` | Server | Reused by member and party pages later |
| `RankingTable` | `components/ranking-table.tsx` | Server | `rows: (RankedRow \| UnrankedRow)[]`, `caption`, `showRank` |
| `PartyLabel` | `components/party-label.tsx` | Server | `<abbr title="Socialdemokraterna">S</abbr>`; `-` → "Politisk vilde"; no party colours on the ranking (they belong in party contexts, TASK-009) |

Replace the "Under uppbyggnad"/"Kommer snart" labels on `/partier/` and `/sa-raknar-vi/` with `Badge` (TASK-002 UX recommendation 1); the start page no longer has one.

### RankingTable — one responsive table instead of two copies

Columns (desktop `sm:` and up): **Plats** · **Ledamot** · **Parti** · **Valkrets** · **Närvaro** (with a thin bar) · **Voteringar** (eligible: the votes the member could take part in — members served for different lengths of time) · **Frånvarande**.
Mobile (< `sm`): **Plats** · **Ledamot** (party · valkrets as a second line) · **Närvaro**. Hidden columns use `hidden sm:table-cell`, so screen readers get one table, not a duplicated card list, and the HTML stays half the size (≈ 400 rows). This is the "mobile-friendly alternative" required by the task. The table scrolls horizontally inside its own wrapper if a very narrow screen still overflows; the page itself never does.

- `<caption>` (visible, small): "Riksdagsledamöter rankade efter närvaro i voteringar {label}."
- `<th scope="col">` headers; the member name cell is `<th scope="row">`.
- Numbers right-aligned with `tabular-nums`.
- Ties share a rank (from the data); no extra marker.
- The bar is decorative (`aria-hidden`), width = attendance, `bg-primary` on `bg-muted` — theme tokens only.
- Names are plain text for now; TASK-008 turns them into links to `/ledamoter/{id}/`.

## Formatting (`lib/format.ts`)

- `formatPercent(share)`: Swedish, one decimal, **truncated** not rounded (`99,96 %` → `99,9 %`), so "100,0 %" only appears for a member who never missed a vote and the displayed value never contradicts the rank order. Output e.g. `92,3 %` (`Intl.NumberFormat("sv-SE")`, non-breaking space).
- `formatNumber(n)`: `2 610` (sv-SE grouping).
- `formatDate(iso)`: `15 oktober 2026`, formatted from the ISO string's parts in UTC (no time-zone drift at build time).
- Unit-tested.

## Party names (`lib/parties.ts`)

Map of the codes seen in the data (`S`, `M`, `SD`, `C`, `V`, `KD`, `L`, `MP`, `-`) to Swedish names; unknown codes fall back to the code itself. Shared by TASK-007/009.

## Data access

`getDefaultPeriod()`, `getRanking(period.id)` — nothing else. Dates shown are the period's own first/last vote, not `meta.lastVoteDate` (which includes the riksmöte in progress). Numbers come straight from the contract; the page only formats.

## Metadata

`title` stays the layout default; `description`: "Hur ofta varje riksdagsledamot röstar i riksdagens voteringar {label} — rankat från högst till lägst närvaro."

## Testing

- `lib/format.test.ts`: truncation edge cases (0, 1, 0.99996, 0.12345), grouping, dates.
- `partyName` (in `lib/format.test.ts`): known and unknown codes.
- Build; verify in Chromium (desktop 1280×800, mobile 390×844, light + dark): row count = ranked + below-threshold count in the data file, first/last rows match `data/ranking/2022-2026.json`, caveat and method link visible without scrolling on desktop, no horizontal page scroll on mobile.

## Files to Create/Modify

- `components/ui/table.tsx`, `components/ui/badge.tsx`
- `components/attendance-caveat.tsx`, `components/ranking-table.tsx`, `components/party-label.tsx`
- `lib/format.ts`, `lib/parties.ts`, `lib/format.test.ts` (covers both)
- `app/page.tsx`, `app/partier/page.tsx`, `app/sa-raknar-vi/page.tsx` (Badge)
- `docs/tasks/TASK-006.md`, `docs/tasks/BACKLOG.md`
