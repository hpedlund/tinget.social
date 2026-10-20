---
name: riksdagen-api
description: "Work with Riksdagen öppna data (Swedish parliament open data) APIs. Use when fetching politician data, votes, speeches, documents, or calendar information from data.riksdagen.se. Covers endpoints, parameters, response formats, caching, and attribution."
argument-hint: "What Riksdagen data do you need? (e.g., 'list of current parliament members')"
---

# Riksdagen API Skill

Fetch and integrate data from the Swedish parliament's open data APIs.

## When to Use

- Fetching politician/member (ledamot) information
- Querying voting records (voteringar)
- Searching speeches/debates (anföranden)
- Accessing parliamentary documents (dokument)
- Getting calendar/schedule information (kalender)
- Designing the data pipeline and caching strategy for Riksdagen data

## API Overview

**Base URL**: `https://data.riksdagen.se`
**Formats**: JSON (`&utformat=json`) or XML (default)
**License**: Free, no API key needed. Attribute "Sveriges riksdag" as source.
**Rate limits**: Not formally documented — implement client-side rate limiting (max 5 requests/second recommended)

## Endpoints

### Members (Personlista)

```
GET https://data.riksdagen.se/personlista/?utformat=json
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `fnamn` | string | First name filter |
| `enamn` | string | Last name filter |
| `parti` | string | Party code (S, M, SD, C, V, KD, L, MP) |
| `valkrets` | string | Constituency |
| `rdlstatus` | string | empty = currently serving; `tjanst` = everyone who has served since 2018; `samtliga` = everyone since ~1990 |
| `utformat` | string | `json` or `xml` |

**Response structure**:
```json
{
  "personlista": {
    "@systemdatum": "2026-04-11",
    "@hits": "349",
    "person": [
      {
        "intressent_id": "unique-id",
        "sourceid": "source-id",
        "hanpidfnummer": "...",
        "fodd_ar": "1970",
        "kon": "man",
        "efternamn": "Surname",
        "tilltalsnamn": "FirstName",
        "parti": "S",
        "valkrets": "Stockholms kommun",
        "status": "Tjänstgörande riksdagsledamot",
        "bild_url_80": "https://data.riksdagen.se/filarkiv/bilder/ledamot/...",
        "bild_url_192": "...",
        "bild_url_max": "...",
        "personuppdrag": { "uppdrag": [...] },
        "personuppgift": { "uppgift": [...] }
      }
    ]
  }
}
```

### Votes (Voteringlista)

```
GET https://data.riksdagen.se/voteringlista/?utformat=json
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `rm` | string | Parliamentary year (e.g., `2025/26`) |
| `bet` | string | Committee report number |
| `punkt` | string | Vote point number |
| `parti` | string | Party code |
| `valkrets` | string | Constituency |
| `iid` | string | Member ID (intressent_id) |
| `sz` | number | Page size (number of rows) |
| `gruppering` | string | Group/aggregate results (e.g. `iid`, `parti`) |
| `utformat` | string | `json` or `xml` |

Each row is **one member's vote in one votering** (always 349 rows per votering — one per seat). Verified behaviour (2026-10-20, see `data/README.md` for full value sets):

- Hard cap of **10 000 rows** per request — larger `sz` is ignored and results are silently truncated. Never page a whole riksmöte through it.
- Rows have **no `datum`** (use `/votering/{id}/json` or the dataset).
- Unknown query parameters are silently ignored — check that `@villkor` echoes your filters.
- `gruppering=votering_id` (or `bet`, `iid`) returns one row per group with counts per `rost` — the authoritative **vote index** for a riksmöte.

Key fields:

| Field | Meaning |
|-------|---------|
| `votering_id` | ID of the vote (shared by all members' rows in that vote) |
| `rm`, `beteckning`, `punkt` | Riksmöte, committee report and point voted on |
| `intressent_id` | Member ID — joins to `personlista` |
| `namn`, `parti`, `valkrets` | Member name, party and constituency at the time of the vote |
| `rost` | `Ja`, `Nej`, `Avstår` or `Frånvarande` — the basis of the attendance metric |
| `avser` | Whether the vote concerns the substance (`sakfrågan`) or the reasoning (`motivering`) |
| `datum` | Date/time of the vote |

**Attendance (Version 1)**: present = `Ja` + `Nej` + `Avstår`; absent = `Frånvarande`. See `PROJECT.md` → "Attendance metric" for eligibility rules and caveats.

### Bulk Datasets

For full-year data, prefer the zipped datasets under `https://data.riksdagen.se/dataset/` instead of paging `voteringlista`. Catalogue: `/dataset/katalog/dataset.xml`.

- Votes: `/dataset/votering/votering-{rm}.json.zip` (e.g. `votering-202526.json.zip`) — one JSON file per votering, `{ dokvotering: { votering: Row[] } }`, rows include `datum` (`null` for omröstningar). The CSV variant has no header row.
- **No dataset exists for the current riksmöte** early in the year (404) — use `/votering/{id}/json` per vote.
- Datasets are **not** complete or exact: they lack some omröstningar (e.g. PM votes) and contain voided votes. Reconcile against the vote index (`voteringlista?gruppering=votering_id`). `lib/riksdagen/votes.ts` does this.
- `/dataset/person/person.json.zip` is broken (2-byte files); use `/personlista/?rdlstatus=tjanst` (everyone who has served since 2018, ~770 people) instead.

### Single vote

```
GET https://data.riksdagen.se/votering/{votering_id}/json
```

Returns `{ votering: { dokument, dokvotering? } }`. `dokvotering.votering` has the same row shape as the dataset, including `datum`. For omröstningar (beteckning `MMDD-N`) `dokvotering` is absent — read rows from `voteringlista?rm=…&bet={beteckning}`, date from `dokument.datum`.

### Speeches (Anförandelista)

```
GET https://data.riksdagen.se/anforandelista/?utformat=json
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `rm` | string | Parliamentary year |
| `d` | string | Date (YYYY-MM-DD) |
| `ts` | string | Date from |
| `te` | string | Date to |
| `parti` | string | Party code |
| `intressent_id` | string | Member ID |
| `anftyp` | string | Speech type |
| `utformat` | string | `json` or `xml` |

### Documents (Dokumentlista)

```
GET https://data.riksdagen.se/dokumentlista/?utformat=json
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `sok` | string | Full-text search query |
| `doktyp` | string | Document type (mot, prop, bet, prot, etc.) |
| `rm` | string | Parliamentary year |
| `from` | string | Date from (YYYY-MM-DD) |
| `tom` | string | Date to (YYYY-MM-DD) |
| `parti` | string | Party code |
| `iid` | string | Member ID |
| `utformat` | string | `json` or `xml` |

### Single Document

```
GET https://data.riksdagen.se/dokument/{doc_id}.json
```

## Implementation Pattern

### API Client (`lib/riksdagen/client.ts`)

Implemented in TASK-003 — use `fetchJson` / `fetchBinary` from `lib/riksdagen/client.ts` (throttled, validated, size-capped). The sketch below shows the idea:

```tsx
import { z } from "zod";

const RIKSDAGEN_BASE_URL = "https://data.riksdagen.se";
const DEFAULT_FORMAT = "json";

interface RiksdagenRequestOptions<T> {
  endpoint: string;
  params?: Record<string, string>;
  schema: z.ZodType<T>; // validate — Riksdagen data is untrusted input
}

export async function fetchRiksdagen<T>({
  endpoint,
  params = {},
  schema,
}: RiksdagenRequestOptions<T>): Promise<T> {
  const url = new URL(endpoint, RIKSDAGEN_BASE_URL);
  url.searchParams.set("utformat", DEFAULT_FORMAT);

  for (const [key, value] of Object.entries(params)) {
    if (value) url.searchParams.set(key, value);
  }

  const response = await fetch(url.toString());

  if (!response.ok) {
    throw new Error(`Riksdagen API error: ${response.status}`);
  }

  return schema.parse(await response.json());
}
```

### Fetching & Caching Strategy

**Version 1 — build-time pipeline (current)**

- Riksdagen is called **only** from pipeline scripts in `scripts/` running in GitHub Actions — never from pages or the browser
- Run at most once a day (scheduled workflow) plus on demand; throttle to ≤ 5 requests/second
- Cache raw downloads between runs (`actions/cache`); completed riksmöten rarely change, so only the current one needs re-fetching daily
- Validate every response with `zod` and fail the run on unexpected shapes — never publish half-parsed data
- Write processed results to `data/*.json`; pages read them through `lib/data/` and are built with `generateStaticParams`
- Note: `fetch(..., { next: { revalidate } })` has no effect in static export — do not rely on it

**Later phases — with a backend**

1. **Next.js ISR**: `{ next: { revalidate: N } }` for fetch-level caching (members 24 h, votes/speeches 1 h, calendar 15 min)
2. **Supabase cache tables**: processed data in PostgreSQL; service role writes, public reads (see `/data-modeling`)

## Attribution

**Required on every page displaying Riksdagen data**:

```tsx
<p className="text-xs text-muted-foreground">Källa: Sveriges riksdag</p>
```

## Party Codes

| Code | Party (Swedish) | Party (English) |
|------|----------------|----------------|
| S | Socialdemokraterna | Social Democrats |
| M | Moderaterna | Moderates |
| SD | Sverigedemokraterna | Sweden Democrats |
| C | Centerpartiet | Centre Party |
| V | Vänsterpartiet | Left Party |
| KD | Kristdemokraterna | Christian Democrats |
| L | Liberalerna | Liberals |
| MP | Miljöpartiet | Green Party |
