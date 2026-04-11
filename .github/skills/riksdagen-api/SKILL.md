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
- Designing caching strategies for Riksdagen data

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
| `rdlstatus` | string | `tjl` (active) or `ers` (substitute) |
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
| `utformat` | string | `json` or `xml` |

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

```tsx
const RIKSDAGEN_BASE_URL = "https://data.riksdagen.se";
const DEFAULT_FORMAT = "json";

interface RiksdagenRequestOptions {
  endpoint: string;
  params?: Record<string, string>;
  revalidate?: number; // ISR cache in seconds
}

export async function fetchRiksdagen<T>({
  endpoint,
  params = {},
  revalidate = 3600,
}: RiksdagenRequestOptions): Promise<T> {
  const url = new URL(endpoint, RIKSDAGEN_BASE_URL);
  url.searchParams.set("utformat", DEFAULT_FORMAT);

  for (const [key, value] of Object.entries(params)) {
    if (value) url.searchParams.set(key, value);
  }

  const response = await fetch(url.toString(), {
    next: { revalidate },
  });

  if (!response.ok) {
    throw new Error(`Riksdagen API error: ${response.status}`);
  }

  return response.json();
}
```

### Caching Strategy

1. **Next.js ISR**: Use `{ next: { revalidate: N } }` for fetch-level caching
   - Member profiles: 24 hours (`86400`)
   - Vote results: 1 hour (`3600`)
   - Speeches: 1 hour (`3600`)
   - Calendar: 15 minutes (`900`)

2. **Supabase cache tables**: For processed/transformed data that's expensive to compute
   - Store raw API responses in JSONB columns
   - Track `fetched_at` and `expires_at` for cache invalidation
   - Service role writes, public reads

3. **Static generation**: Use `generateStaticParams` for politician profile pages with ISR

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
