# Spec: TASK-005 — Data contract and data access layer

## Summary

Add the pipeline's second step, `npm run data:compute` (`scripts/compute.ts`), which reads the validated cache written by `npm run data:fetch`, runs the attendance calculation (`lib/attendance/`) per period and writes small, versioned, deterministic JSON files to `data/`. Add `lib/data/`, the only module pages may use to read them: typed, zod-validated, async functions that fail loudly when a file is missing or invalid. `data/README.md` documents every file.

## Periods

| Period id | Label | Kind | Riksmöten |
|-----------|-------|------|-----------|
| `2022-2026` | 2022–2026 | `term` | 2022/23, 2023/24, 2024/25, 2025/26 |
| `2022-23` … `2025-26` | 2022/23 … | `riksmote` | that riksmöte |
| `2026-27` | 2026/27 | `riksmote` | 2026/27 (current, incomplete) |

Derived from `TERM_RIKSMOTEN` and `CURRENT_RIKSMOTE` in `lib/riksdagen/config.ts`. The default period (`meta.defaultPeriodId`) is the full term `2022-2026`, as TASK-006 suggests. Each period is computed with `computeAttendance` on its own records, so ranks and the 10 % threshold are per period.

## Data Model (files in `data/`)

Every file carries `schemaVersion` (1) and `source` (`"Sveriges riksdag"`). Shapes are defined once as zod schemas in `lib/data/schemas.ts`; types in `lib/data/types.ts` are inferred from them. Schemas are strict (unknown keys rejected) so contract drift fails the build.

```ts
// Shared
Summary = { counts: { ja, nej, avstar, franvarande }, eligible, present, attendance } // attendance 0..1, unrounded

// data/meta.json
{ schemaVersion, source, sourceUrl, defaultPeriodId, lastVoteDate,
  periods: [{ id, label, kind: "term" | "riksmote", riksmoten: string[], complete: boolean,
              totalVotes, minEligibleVotes, firstVoteDate, lastVoteDate }] }

// data/ranking/{periodId}.json
{ schemaVersion, source, periodId, totalVotes, minEligibleVotes,
  ranked:         [{ rank, memberId, name, party, constituency, ...Summary }],  // rank 1 first
  belowThreshold: [{ memberId, name, party, constituency, ...Summary }] }      // by name

// data/parties.json
{ schemaVersion, source,
  periods: [{ periodId, parties: [{ party, memberCount, ...Summary,
                                    rankedMembers: number,
                                    spread: { min, median, max } | null }] }] }

// data/members.json  (index)
{ schemaVersion, source, members: [{ id, name, party, constituency }] }      // by id

// data/members/{id}.json
{ schemaVersion, source, id, name, firstName, lastName, sortName, party, constituency, status,
  total: Summary,                                         // all riksmöten in the data
  byRiksmote: [{ riksmote, ...Summary }],                 // ascending
  periods: [{ periodId, rank: number | null, ...Summary }], // periods the member voted in, in meta order
  missedVoteIds: string[] }                               // Frånvarande, in date order

// data/votes/{riksmote-slug}.json
{ schemaVersion, source, riksmote,
  votes: [{ id, date, beteckning, punkt, avser, counts }] } // by date, then id
```

Field rules:

- `name`, `party`, `constituency` on ranking rows and member files come from the member's most recent vote **in that scope** (TASK-004 rule 8); member files use all riksmöten. `firstName`, `lastName`, `sortName`, `status` come from `personlista` (current values).
- Party code `-` (politisk vilde) is kept as is; display names are a UI concern.
- `parties[].spread` is min/median/max `attendance` of the **ranked** members whose `party` (latest in the period) is that party; `null` when there are none. `rankedMembers` is that count. The pooled `attendance` stays the headline figure (TASK-004 rule 7).
- Birth year, gender, image URL and contact data are **not** published (not needed for Version 1; data minimisation).

### Deviation from the data-modeling skill: no `generatedAt`

The skill asks for `generatedAt` in every file. A wall-clock timestamp would make every run produce a diff, which conflicts with this task's acceptance criterion (identical input → identical output) and TASK-011 ("no commit when data is unchanged"). Instead `meta.json` carries `lastVoteDate` (and per-period first/last vote dates), which is derived from the data, shows how current it is, and only changes when Riksdagen has new votes. The commit date of `data/` is the generation time.

### Determinism

- Objects are built with a fixed key order; every array has an explicit sort (ids with the locale-independent `compare`, names with `sv` collation as in `lib/attendance/`).
- Output is `JSON.stringify(value, null, 2)` + newline: line-based diffs show exactly which numbers changed.
- Input order does not matter (tested by shuffling).

### Size

`data/` is **build input only**; it is not copied to `out/`. What gets published is the pre-rendered HTML (plus the ranking rows TASK-007 embeds for client-side filtering). Estimated from the counts in `data/README.md`: ~566 member files dominated by `missedVoteIds` (~151 000 Frånvarande rows × ~45 bytes ≈ 7 MB), votes ≈ 0.5 MB, rankings ≈ 6 × 100 kB, everything else a few kB — about 8 MB in total. The real figure is recorded in `data/README.md` when the first snapshot is generated.

## Data Flow

```
.cache/riksdagen/votes-*.json, members.json  (data:fetch, validated)
  └─ scripts/compute.ts            read via lib/riksdagen/cache.ts
       └─ lib/pipeline/build.ts    pure: votes + members → { path → contract object }
            toVoteRecords → computeAttendance per period → files
       └─ validate every file with lib/data/schemas.ts
       └─ stage in .cache/compute/, then replace data/{meta,parties,members}.json
          and data/{ranking,members,votes}/ (stale files removed; data/README.md untouched)

data/*.json  ──►  lib/data/index.ts (read + zod, memoised)  ──►  pages (build time)
```

Any validation error aborts before `data/` is touched (exit 1).

## API Surface — `lib/data/`

```ts
getMeta(): Promise<Meta>
getPeriods(): Promise<Period[]>                     // meta order: term first, then riksmöten ascending
getDefaultPeriod(): Promise<Period>
getRanking(periodId: string): Promise<Ranking>      // throws on unknown period
getParties(periodId: string): Promise<PartyEntry[]> // throws on unknown period
getAllMemberIds(): Promise<string[]>                // for generateStaticParams
getMembers(): Promise<MemberIndexEntry[]>
getMember(id: string): Promise<MemberDetail | null> // null if not in the index; missedVotes joined with vote details
```

- Reads from `path.join(process.cwd(), "data")`; `createDataSource(dir)` exposes the same functions over another directory (tests).
- A missing or invalid file throws `Error("Invalid data file …")` with the formatted zod issues → `next build` fails.
- Ids are checked against the meta/index before any path is built (no path traversal from route params).
- Server-only: imports `node:fs`. Pages pass plain props to Client Components.

## Technical Decisions

- **Member files reference missed votes by id** and `getMember` joins them with `data/votes/*.json`: ~2 600 vote rows stored once instead of repeating date/beteckning/punkt in ~151 000 places.
- **Per-period ranking files** keep each page's input small and let TASK-007 embed only the period it needs.
- **`lib/pipeline/`** holds the pure builder so it is unit-tested without I/O; `scripts/compute.ts` does only I/O.
- **Initial snapshot**: committed with the implementation if `data.riksdagen.se` is reachable from the development environment; otherwise generated by the first `data:fetch` + `data:compute` run (locally or by TASK-011) and committed then. `npm run data:check` validates whatever is in `data/`.

## Testing

- `lib/pipeline/build.test.ts`: fixture with three riksmöten (two in a term, one current) — periods and meta, ranking per period, threshold per period, parties incl. spread, member files (periods, ranks, missed votes), vote index, determinism (twice + shuffled input), every file passes its schema, unknown ballot member rejected.
- `lib/data/data.test.ts`: writes a built fixture to a temp dir; every getter, `getMember` join, unknown id → `null`, unknown period throws, missing file throws, invalid file throws.

## Implementation Order

1. `lib/data/schemas.ts`, `lib/data/types.ts`
2. `lib/pipeline/periods.ts`, `lib/pipeline/build.ts` + tests
3. `lib/data/index.ts` + tests
4. `scripts/compute.ts`, `scripts/check.ts`, npm scripts `data:compute`, `data:check`
5. `data/README.md`, `docs/DEVELOPMENT.md`
6. Lint, typecheck, test, build

## Files to Create/Modify

- `lib/data/schemas.ts`, `lib/data/types.ts`, `lib/data/index.ts`, `lib/data/data.test.ts`
- `lib/pipeline/periods.ts`, `lib/pipeline/build.ts`, `lib/pipeline/build.test.ts`
- `scripts/compute.ts`, `scripts/check.ts`
- `package.json` — `data:compute`, `data:check`
- `data/README.md` — contract documentation
- `docs/DEVELOPMENT.md` — new commands
- `docs/tasks/TASK-005.md`, `docs/tasks/BACKLOG.md` — status
