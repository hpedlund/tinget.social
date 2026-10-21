# Spec: TASK-014 — Current and upcoming votes page

## Summary

A static page at `/voteringar/` listing the betänkanden the chamber has yet to decide on in the current riksmöte, grouped by planned decision date, each linking to the betänkande and the documents it treats on riksdagen.se. Data comes from the same build-time pipeline as the attendance figures.

## Source

Verified 2026-10-21:

- `/dokumentlista/?doktyp=bet&rm=2026/27&utformat=json&sz=200&p=N` — one entry per betänkande with `dok_id`, `beteckning`, `titel`, `organ` (committee), `beslutsdag` (`YYYY-MM-DD` or empty), `debattdag`, `beslutad` (`"0"`/`"1"`). Paged (`@sida`, `@sidor`, `@traffar`). 82 betänkanden on 2026-10-21, none decided, 9 without a date.
- `/dokumentstatus/{dok_id}.json` — `dokreferens.referens[]` with `referenstyp = "behandlar"` lists the treated documents (`ref_dok_id`, `ref_dok_typ` `prop`/`mot`/`frsrdg`/…, `ref_dok_rm`, `ref_dok_bet`, `ref_dok_titel`, `ref_dok_dokumentnamn`). Absent until the betänkande is published, and for subsidiarity checks and committee initiatives.
- Links: `https://www.riksdagen.se/sv/dokument-och-lagar/dokument/_{dok_id}/` redirects to the document's page for any type; the id-only path without the `_` does not.

## Pipeline

- `lib/riksdagen/agenda.ts` → `fetchAgenda(riksmote)`: pages through `dokumentlista` (checks the total against `@traffar`), keeps `beslutad = 0`, fetches `dokumentstatus` per item (≈ 80 requests, throttled like everything else). Raw responses go to `.cache/riksdagen/raw/dokumentlista/` and `raw/dokumentstatus/`; the normalised result to `.cache/riksdagen/agenda.json`. Always re-fetched.
- zod: `dok_id` (also used in cache file names) must match `^[0-9A-Za-zÅÄÖåäö]{1,32}$`; dates must be dates or empty; `beslutad` is `"0"`/`"1"`.
- `lib/pipeline/agenda.ts` → `buildAgendaFile(agenda)`: pure, deterministic; propositions first, then skrivelser, then other documents; motions are only counted (a budget betänkande can treat hundreds).

## Data contract

`data/agenda.json` (`schemaVersion` 1):

```ts
{
  riksmote: "2026/27",
  items: {
    dokId, beteckning, title, committee,
    decisionDate: string | null, debateDate: string | null,
    documents: { dokId, label /* "Proposition 2025/26:285" */, title }[],
    motions: number,
  }[] // by decisionDate (unscheduled last), then beteckning
}
```

No fetch timestamp, so an unchanged schedule produces no diff. `data:check` also checks that the agenda is for the latest riksmöte in the data.

## Page

- `app/voteringar/page.tsx` (Server Component): heading, short explanation, caveat that dates are planning and that points nobody asks to vote on are decided without a vote, source line.
- `components/agenda-list.tsx` (Client Component): groups with `groupAgenda(items, today)` from `lib/agenda/schedule.ts` into **Aktuella** (decision date ≤ today), **Kommande** (by date) and **Ännu utan beslutsdag** (collapsed). `today` comes from `useSyncExternalStore`: the build date on the server and during hydration, the Swedish calendar date (`Europe/Stockholm`) in the browser — the deploy is not daily, so grouping by build date alone would go stale.
- Each item: "Betänkande {beteckning} · {committee name}", title linking to the betänkande, "Behandlar:" linked documents and the motion count. A treated document's title is hidden when it repeats the betänkande's.
- Nav: "Voteringar" between "Närvaro" and "Partier".

## Out of scope

Point-by-point proposals, results of held votes on the page, and how parties voted — later phases.
