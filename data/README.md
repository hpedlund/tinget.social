# Data

Generated data files for the site (the data contract) will live here from TASK-005. This file currently documents the **Riksdagen input** that `npm run data:fetch` downloads, as actually observed on 2026-10-20.

Source: [Riksdagens öppna data](https://www.riksdagen.se/sv/dokument-och-lagar/riksdagens-oppna-data/). **Källa: Sveriges riksdag.**

## Fetch pipeline

`npm run data:fetch` (add `-- --refresh` to ignore the cache) writes to `.cache/riksdagen/` (git-ignored):

| File | Contents |
|------|----------|
| `raw/dataset/votering-{rm}.json.zip` | Bulk vote dataset, as downloaded |
| `raw/votering/{votering_id}.json` | `/votering/{id}/json` responses (never change once a vote is held) |
| `raw/voteringlista/{rm}-by-vote.json` | Vote index per riksmöte (`gruppering=votering_id`) |
| `raw/personlista-tjanst.json` | `/personlista/?rdlstatus=tjanst` |
| `votes-{rm}.json` | Validated, normalised votes (see `lib/riksdagen/normalized.ts`) |
| `members.json` | Validated, normalised members: only people who appear in the vote data |
| `manifest.json` | Per riksmöte: source, complete, counts, fetch time |
| `observed.json` | Value sets seen in the last run (basis for the tables below) |

Riksmöten: 2022/23–2025/26 (2022–2026 term, cached once complete) and 2026/27 (current, refreshed on every run). Read the normalised files with `readRiksmoteVotes()` and `readMembers()` from `lib/riksdagen/cache.ts`.

### How votes are assembled

1. The **vote index** (`/voteringlista/?rm=…&gruppering=votering_id`) decides which votes exist and how many `Ja`/`Nej`/`Avstår`/`Frånvarande` each has.
2. Rows come from the **bulk dataset** `/dataset/votering/votering-{rm}.json.zip` when Riksdagen publishes one (one JSON file per vote).
3. Votes in the index but missing from the dataset, and every vote when there is no dataset yet (the current riksmöte), are fetched from **`/votering/{id}/json`**. *Omröstningar* (e.g. the vote on a new prime minister) have no rows there; they are read from `/voteringlista/?rm=…&bet={beteckning}`.
4. Every vote's per-`rost` counts must equal the index, or the run aborts.
5. Dataset votes that are **not in the index** are excluded and listed in `observed.json` (see below).

## Vote rows

One row per seat per vote: every vote has exactly **349 rows**. A member on leave has no row; their ersättare (substitute) has one. The Speaker (talman) never has a row — the talmansersättare votes in that seat.

| Field (raw) | Normalised | Observed |
|-------------|------------|----------|
| `votering_id` | `Vote.id` | GUID, upper-cased (shared by all rows of a vote) |
| `rm` | `Vote.riksmote` | e.g. `2025/26` |
| `beteckning` | `Vote.beteckning` | Committee report (`JuU22`) or omröstning `MMDD-N` (`1015-1`) |
| `punkt` | `Vote.punkt` | Integer; `0` for omröstningar |
| `avser` | `Vote.avser` | `sakfrågan`, `motivfrågan`, `frågan` (omröstningar only) |
| `votering` | — | Always `huvud` (validated, then dropped) |
| `datum` | `Vote.date` | `YYYY-MM-DD` (time part, when present, is `00:00:00`). `null` for omröstningar in the dataset — taken from the vote document instead |
| `intressent_id` | `Ballot.memberId` | Numeric string; joins to `personlista` |
| `namn`, `parti`, `valkrets` | `name`, `party`, `constituency` | As at the time of the vote |
| `rost` | `Ballot.rost` | **`Ja`, `Nej`, `Avstår`, `Frånvarande`** — no other value seen in any riksmöte |

Raw fields dropped: `hangar_id`, `fornamn`, `efternamn`, `kon`, `fodd`, `iort`, `banknummer`, `valkretsnummer`, plus `dok_id`, `punkttyp`, `systemdatum`, `votering_url_xml` in API rows. `voteringlista` rows have **no `datum`**.

### Observed per riksmöte

| Riksmöte | Votes | Rows | People | First – last vote | Ja | Nej | Avstår | Frånvarande | From API |
|----------|------:|-----:|-------:|-------------------|---:|----:|-------:|------------:|---------:|
| 2022/23 | 566 | 197 534 | 402 | 2022-10-17 – 2023-09-13 | 120 132 | 33 205 | 16 587 | 27 610 | 2 |
| 2023/24 | 595 | 207 655 | 382 | 2023-10-25 – 2024-09-25 | 121 353 | 36 359 | 19 019 | 30 924 | 1 |
| 2024/25 | 652 | 227 548 | 370 | 2024-09-25 – 2025-06-18 | 131 871 | 39 235 | 22 972 | 33 470 | 0 |
| 2025/26 | 797 | 278 153 | 375 | 2025-09-17 – 2026-08-13 | 173 861 | 54 186 | 20 547 | 29 559 | 0 |
| 2026/27 | 1 | 349 | 349 | 2026-10-15 | 99 | 248 | 0 | 2 | 1 |

`avser`: `motivfrågan` 5–14 votes per riksmöte; `frågan` only for omröstningar (PM votes, no-confidence votes).

`parti` values in vote rows: `S`, `M`, `SD`, `C`, `V`, `KD`, `L`, `MP` and **`-`** (politisk vilde — member without a party group; 227–5 396 rows per riksmöte).

### Known source discrepancies

| Riksmöte | Issue | Handling |
|----------|-------|----------|
| 2022/23 | Dataset lacks the PM vote `1017-1` (2022-10-17) and `KU32` (2023-06-16) | Fetched from the API |
| 2023/24 | Dataset lacks the no-confidence vote `0117-1` (2024-01-17) | Fetched from the API |
| 2024/25 | Dataset has 4 votes not in the index — `SkU3` p1 ×2 (2024-10-16), `FiU6` p1 and p2 (2024-11-06) — with 339–344 of 349 `Frånvarande`: evidently voided votes | Excluded |
| 2025/26 | Dataset has `SfU31` p1 on 2026-06-15 (174–172), not in the index; the index has `SfU31` p1 held again on 2026-06-17 | Excluded (the re-held vote is kept) |

Other source quirks: dataset zip entry names can contain stray non-ASCII bytes; `/votering/{id}/json` returns an empty `200` for votes not in the index; unknown `voteringlista` query parameters are silently ignored (the pipeline checks `@villkor`), and results are silently truncated at 10 000 rows (the pipeline checks `@antal`).

## Members

`/personlista/?rdlstatus=tjanst` returns everyone who has served since 2018 (773 people). People without an `intressent_id` (148 — Riksbank, JO and other officials who never sat in the chamber) and anyone without a vote in the configured riksmöten are dropped: **566 members** remain.

| Field (raw) | Normalised | Observed |
|-------------|------------|----------|
| `intressent_id` | `id` | Numeric string |
| `tilltalsnamn`, `efternamn`, `sorteringsnamn` | `firstName`, `lastName`, `sortName` | |
| `parti`, `valkrets` | `party`, `constituency` | **Current** values; may be empty for former members |
| `status` | `status` | e.g. `Tjänstgörande riksdagsledamot`, `Tidigare riksdagsledamot`, `Tillgänglig ersättare`, `Tjänstgörande statsrådsersättare`, minister titles, `Avliden  YYYY-MM-DD` (two spaces) |
| `fodd_ar` | `birthYear` | Four digits, or empty → `null` |
| `kon` | `gender` | `man`, `kvinna` (`Okänt` exists in the full list, not among voters) |
| `bild_url_192` | `imageUrl` | `https://data.riksdagen.se/filarkiv/bilder/ledamot/…_192.jpg` |
| `personuppdrag.uppdrag[]` (`organ_kod = kam`) | `chamberAssignments[]` | See below |

Chamber assignments (`organ_kod = kam`):

- `roll_kod`: `Riksdagsledamot`, `Ersättare`, `Statsrådsersättare`, `Talmansersättare`, `Förste/Andre/Tredje vice talman` (and `Talman` in the full list)
- `status`: `Tjänstgörande`, `Ledig`, `Ersättare`, `Ledig Ersättare`, and empty (11 rows)
- `from`/`tom`: `YYYY-MM-DD` or `YYYY-MM-DD HH:MM:SS`; `tom` may be empty (open-ended) → `to: null`

Not used: `/dataset/person/person.json.zip` (every file inside is 2 bytes) and `person.csv.zip`.
