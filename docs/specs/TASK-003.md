# Spec: TASK-003 — Riksdagen data client and fetch script

## Summary

Add a small Riksdagen client (`lib/riksdagen/`) and a pipeline entry point (`scripts/fetch.ts`, run with `npm run data:fetch`) that downloads all members and every vote row for the 2022–2026 term (riksmöten 2022/23–2025/26) and the current riksmöte (2026/27). Every response is validated with `zod`; the raw downloads are cached in `.cache/riksdagen/` (git-ignored) and a validated, normalised copy per riksmöte is written next to them for TASK-004/005 to read. Completed riksmöten are fetched once and then served from the cache.

## Live-site findings (verified 2026-10-20)

These replace the assumptions in `.github/skills/riksdagen-api/SKILL.md` where they differ.

| Source | Finding | Consequence |
|--------|---------|-------------|
| `/dataset/votering/votering-{rm}.json.zip` (e.g. `votering-202526.json.zip`, 12 MB) | One JSON file per votering, shape `{ dokvotering: { votering: Row[] } }`; rows include `datum` | Preferred source for completed riksmöten |
| `/dataset/votering/votering-{rm}.csv.zip` | Single CSV **without a header row**, positional columns | Not used — JSON is self-describing |
| `/dataset/votering/votering-202627.*` | **404** — no dataset yet for the current riksmöte | API fallback needed |
| `/dataset/person/person.json.zip` | Broken: every file inside is 2 bytes | Not used |
| `/voteringlista/` | Hard cap of **10 000 rows** per request (`sz` above that is ignored); rows have **no `datum`**; unknown query parameters are silently ignored (visible in `@villkor`) | Never page `voteringlista` for a whole year; check `@antal` < cap and `@villkor` |
| `/voteringlista/?rm=…&gruppering=votering_id` | One row per votering with counts per `rost` | Lists the votes of the current riksmöte (≤ ~800/year) |
| `/votering/{id}/json` | `{ votering: { dokument, dokvotering? } }`; `dokvotering.votering` has the same row shape as the dataset, incl. `datum` | One request per new vote in the current riksmöte |
| `/votering/{id}/json` for *omröstningar* (beteckning `MMDD-N`, e.g. PM vote `1015-1`) | No `dokvotering`, only `dokument` with `datum` | Rows from `voteringlista?rm=…&bet={beteckning}`, date from `dokument.datum` |
| Dataset rows for omröstningar | `datum: null` (3 votes in 2025/26) | Date looked up via `/votering/{id}/json` → `dokument.datum` |
| `/personlista/?rdlstatus=tjanst` | 773 persons (11 MB): everyone who served since 2018. Covers **every** `intressent_id` that voted in 2022/23–2026/27 | Members source (`samtliga` is 32 MB and mostly irrelevant) |
| Votes per votering | Always 349 rows (one per seat); a member on leave has no row — the ersättare has one | Eligibility (TASK-004) can be derived from the rows themselves |

## Data Model

Nothing in `data/` yet (that is TASK-005). Cache layout (git-ignored):

```
.cache/riksdagen/
├── raw/
│   ├── dataset/votering-202223.json.zip     # bulk dataset, as downloaded
│   ├── votering/{votering_id}.json          # /votering/{id}/json responses
│   ├── voteringlista/{rm}-{query}.json      # voteringlista responses (current riksmöte)
│   └── personlista-tjanst.json
├── votes-2022-23.json                       # validated, normalised (one per riksmöte)
├── members.json                             # validated, normalised
├── observed.json                            # value sets seen in this run (for data/README.md)
└── manifest.json                            # per riksmöte: source, complete, counts, fetchedAt
```

Normalised types (`lib/riksdagen/types.ts`, inferred from zod schemas in `lib/riksdagen/normalized.ts`):

```ts
type Rost = "Ja" | "Nej" | "Avstår" | "Frånvarande";
interface Ballot { memberId: string; name: string; party: string; constituency: string; rost: Rost }
interface Vote {
  id: string;            // votering_id
  riksmote: string;      // "2025/26"
  beteckning: string;    // "JuU22" or "1015-1" (omröstning)
  punkt: number;
  avser: "sakfrågan" | "motivfrågan" | "frågan";
  date: string;          // YYYY-MM-DD — always set
  ballots: Ballot[];     // sorted by memberId
}
interface RiksmoteVotes { schemaVersion: 1; riksmote: string; source: "dataset" | "api"; fetchedAt: string; votes: Vote[] }

interface ChamberAssignment { role: string; status: string; from: string; to: string | null } // organ_kod "kam" only
interface Member {
  id: string; firstName: string; lastName: string; sortName: string;
  party: string; constituency: string; status: string;
  birthYear: number | null; gender: string; imageUrl: string | null;
  chamberAssignments: ChamberAssignment[];
}
interface Members { schemaVersion: 1; fetchedAt: string; members: Member[] }
```

Output is deterministic apart from `fetchedAt`: votes sorted by date, beteckning, punkt, id; members by id.

## Data Flow

```
scripts/fetch.ts
  for rm in RIKSMOTEN (lib/riksdagen/config.ts):
    completed rm with valid cache (manifest.complete && votes file valid) → skip
    vote index       → voteringlista gruppering=votering_id (ids + per-rost counts)
    dataset exists?  → download zip → unzip (fflate) → validate each file → normalise
    for each id in the index:
      in dataset     → use it
      else           → /votering/{id}/json (rows + datum, cached)
                       | omröstning: voteringlista bet=… rows + dokument.datum
      → counts must equal the index; null dates filled via /votering/{id}/json
    dataset votes not in the index → excluded, listed in observed.json
    write votes-{rm}.json + manifest entry (complete = rm !== CURRENT_RIKSMOTE)
  personlista rdlstatus=tjanst (always refreshed) → validate → normalise → members.json
  check every ballot.memberId exists in members → else abort
  write observed.json, print summary
```

- **Client** (`lib/riksdagen/client.ts`): `RIKSDAGEN_BASE_URL = "https://data.riksdagen.se"` is a constant; callers pass a path only and the client asserts the resolved URL's origin. All requests go through one serial throttle (≥ 200 ms between request starts → ≤ 5 req/s), with a 120 s timeout, 2 retries with backoff on network errors / 5xx, a 128 MB response size cap, and a `User-Agent` naming the project. `fetchJson(path, params, schema)` validates; `fetchBinary(path)` returns `null` on 404.
- **Validation**: strict enums for fields that affect the metric (`rost`, `avser`, `votering` = `huvud`); regex checks for ids, `rm`, dates and `punkt`; every votering file must contain ≥ 1 row, a single `votering_id` and the expected `rm`; no duplicate `votering_id` across files or member within a vote; voteringlista responses must have `@antal` below the 10 000 cap. Any failure throws with the source (file/URL) and the zod issue path, and the script exits 1 **before** writing that riksmöte's normalised file.
- **Zip safety**: only `.json` entries are inflated; total uncompressed size capped (1 GB); entry names are never used as file paths.
- **Cache semantics**: completed riksmöten are reused when their normalised file validates; `--refresh` forces a full re-download. For the current riksmöte, `/votering/{id}` raw responses are reused (a held vote does not change), so daily runs fetch only new votes. Writes go to a temp file then rename, so an aborted run never leaves a half-written file.

`lib/riksdagen/cache.ts` exports `readRiksmoteVotes(rm)` and `readMembers()` (validated reads) for TASK-004/005.

## Component Tree

None — no UI.

## Technical Decisions

- **JSON datasets over CSV**: the CSV has no header; JSON field names make zod validation meaningful.
- **Per-vote API for the current riksmöte** rather than paging `voteringlista`: the 10 000-row cap makes year-wide queries silently truncate, and `voteringlista` rows lack dates. Per-vote requests are naturally incremental.
- **`rdlstatus=tjanst`** for members (suggested by the maintainer and verified to cover all voters in the term).
- **Normalised cache files**: TASK-004/005 read ~20 MB compact files instead of re-parsing ~180 MB of raw JSON per riksmöte.
- **Strict enums** make a new `rost`/`avser` value stop the pipeline instead of skewing the metric silently.
- **Dependencies** (pinned exact): `zod` 4.6.5, `fflate` 0.8.3 (zero-dependency unzip), `tsx` 4.23.15 (dev, runs TS scripts with path aliases).
- **The vote index is authoritative, not the dataset** *(revised during implementation)*: comparing every dataset with `voteringlista?gruppering=votering_id` showed the datasets both **lack** votes (the 2022 PM vote, a 2024 no-confidence vote, `KU32` 2023) and **contain** votes that are not in the index (four voided votes in 2024/25 with 339–344 of 349 `Frånvarande`; one 2025/26 vote that was held again two days later). So for every riksmöte the index is fetched first; dataset votes not in it are excluded (and listed in `observed.json`), index votes missing from the dataset are fetched via `/votering/{id}/json`, and every vote's per-`rost` counts must match the index. Details in `data/README.md`.

## Implementation Order

1. Add dependencies and `data:fetch` script to `package.json`
2. `lib/riksdagen/config.ts`, `client.ts`, `schemas.ts` (raw), `normalized.ts` + `types.ts`
3. `lib/riksdagen/votes.ts` (dataset and API paths), `members.ts`, `cache.ts`
4. `scripts/fetch.ts` (orchestration, manifest, observed values, summary)
5. Run against the live site; write `data/README.md` from `observed.json`
6. Update the riksdagen-api skill with the verified findings; DEVELOPMENT.md command list
7. `npm run lint`, `npm run typecheck`, `npm run build`

## Files to Create/Modify

- `package.json` / `package-lock.json` — `zod`, `fflate`, `tsx`; `data:fetch` script
- `lib/riksdagen/config.ts` — base URL, riksmöten, cache paths, limits
- `lib/riksdagen/client.ts` — throttled, validated fetch
- `lib/riksdagen/schemas.ts` — zod schemas for raw responses
- `lib/riksdagen/normalized.ts` — zod schemas for normalised cache files
- `lib/riksdagen/types.ts` — exported types
- `lib/riksdagen/votes.ts` — fetch + normalise votes per riksmöte
- `lib/riksdagen/members.ts` — fetch + normalise members
- `lib/riksdagen/cache.ts` — atomic writes, validated reads, manifest
- `scripts/fetch.ts` — entry point
- `data/README.md` — observed fields and value sets
- `.github/skills/riksdagen-api/SKILL.md` — corrected endpoint notes
- `docs/DEVELOPMENT.md` — `npm run data:fetch`
