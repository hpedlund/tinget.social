# Spec: TASK-014 — How members voted and what the votes were about

## Summary

Every member page lists every vote the member could take part in, with their ballot and the topic, filterable by riksmöte, ballot and text. Each voted document (betänkande or omröstning) gets a static page at `/voteringar/{riksmöte}/{slug}/` with Riksdagen's "Beslut i korthet", every vote's result and links to Riksdagen. Where Riksdagen has published no summary, a labelled AI summary generated in the data refresh may be shown.

## What Riksdagen provides (observed 2026-10-21)

| Need | Source | Coverage |
|------|--------|----------|
| Betänkande per vote (`dok_id`, title, "Beslut i korthet") | `/dokumentlista/?doktyp=bet&rm=…` (`notisrubrik`, `notis`; 200 per page, ≈ 3 pages per riksmöte) | 899 of 899 voted beteckningar; every voted betänkande has a `notis` |
| Heading of each proposal point (what a vote is about) | `/utskottsforslag/{dok_id}.json` (≈ 26 kB; `dokumentstatus` is ≈ 360 kB) | Every vote in a betänkande |
| Omröstningar (`MMDD-N`, PM / no-confidence votes) | `/votering/{id}/json` → `dokument.titel` (already cached by the vote fetch) | 6 votes; no betänkande, no summary |

Ja in a betänkande vote is a vote for the committee's proposal, Nej for the counter-proposal (usually a reservation). `notis` is HTML (`p`, `ul/li`, a few `span`, `a`, `del`, `strong`).

## Data model (contract v2)

- `votes/{rm}.json` entries gain `rubrik: string | null` (the point heading).
- `members/{id}.json`: `missedVoteIds` → `ballots: { riksmote, votes }[]`, `votes` one character per vote in the vote file's order: `J N A F` or `-` (no ballot). 2 600 characters per member instead of up to ~2 000 GUIDs: `data/` shrinks from 8.0 to 5.2 MB.
- New `documents/{rm}.json`: `{ beteckning, kind, dokId, title, summary: { source: "riksdagen" | "generated", heading, blocks: { type: "p" | "li", text }[], model } | null }`.
- New pipeline input `data/generated-summaries.json` (committed, never written by `data:compute`).
- `schemaVersion` 1 → 2. Attendance figures are byte-identical apart from that field.

**Integrity**: `getMember` checks each ballot string's length against the vote file and its J/N/A/F tallies against `byRiksmote` — a misaligned file fails `next build` and `data:check`. `data:check` also checks that every document has votes and that page slugs are unique.

## Pipeline

1. `data:fetch` → `lib/riksdagen/documents.ts`, per riksmöte after its votes: list betänkanden (re-fetched every run, so a `notis` published later is picked up), fetch proposal points per voted betänkande (cached; in the current riksmöte re-fetched when a voted point is missing), omröstning titles from the cached vote document. HTML → plain-text blocks in `lib/riksdagen/html-text.ts`. Writes `.cache/riksdagen/documents-{rm}.json`. A beteckning with several or no documents is reported and left without a topic — topics never abort the run.
2. `data:summarize` (new, optional) → documents with no Riksdagen summary and no generated one for the same `dokId`: Claude (`claude-opus-5-5`, structured output, server-side refusal fallback) from the betänkande's text or, for omröstningar, from title, date and counts only, with instructions not to state facts outside the source. At most 20 per run; texts over 600 000 characters are skipped, not cut. Entries are dropped once Riksdagen publishes its own. No `ANTHROPIC_API_KEY` → lists candidates and exits 0.
3. `data:compute` → Riksdagen's summary if present, else a generated one with a matching `dokId`, else `null`.

## Site

- `lib/data/`: `getRiksmoten`, `getVotes(rm)`, `getDocuments(rm)`, `getDocument(rm, beteckning)`; `getMember` returns the member file (ballots checked).
- `app/data/voteringar/[file]/route.ts`: static JSON per riksmöte (`/data/voteringar/2025-26.json`, ≤ 100 kB): `[id, date, beteckning, punkt, motivfrågan, rubrik]` tuples plus titles. Shared by all member pages instead of repeating ~800 rows of text in 566 pages.
- `components/member-votes.tsx` (Client Component): ballots arrive as props (a few kB); fetches the riksmöte's list once, joins (`lib/member/votes.ts`, pure), filters by riksmöte / ballot / words, newest first, 50 at a time. Replaces `components/missed-votes.tsx`. `<noscript>` note; status in a live region.
- `app/voteringar/[riksmote]/[slug]/page.tsx`: 899 static pages; slug = lower-case ASCII beteckning (`FöU9` → `fou9`); vote anchors `#votering-{id}` (the member list links straight to the vote).
- Methodology: new section `#arenden` (Ja/Nej, topics, AI summaries). Sitemap includes the document pages.

## Technical decisions

- **Ballot strings aligned to the vote file** instead of id lists: compact, deterministic, verifiable.
- **Client-side vote list from shared static JSON**: page weight; the document pages stay fully static and crawlable.
- **Plain text only**: summaries are converted to text blocks in the pipeline; React escapes them. No `dangerouslySetInnerHTML`.
- **Generated summaries are input, not output**: generated once, reviewable in git, never regenerated by `data:compute` (which stays deterministic and offline).
- **Not in scope**: party breakdown per vote, outcome ("bifall/avslag") interpretation, an index of all votes.
