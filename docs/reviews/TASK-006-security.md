# Security Review: TASK-006 — Attendance ranking page

**Result**: PASS
**Reviewed files**: `app/page.tsx`, `components/ranking-table.tsx`, `components/attendance-caveat.tsx`, `components/party-label.tsx`, `components/ui/table.tsx`, `components/ui/badge.tsx`, `lib/format.ts`, `lib/parties.ts`, `app/partier/page.tsx`, `app/sa-raknar-vi/page.tsx`

## Findings

No findings.

## Checks

- **Output encoding**: all data (names, party codes, constituencies) is rendered as React text children; no `dangerouslySetInnerHTML`. The only inline style is the bar width, computed from a schema-validated number in 0–1 ✔
- **Data access**: the page reads only through `lib/data/` (`getDefaultPeriod`, `getRanking`); no direct `data/` imports, no runtime fetching ✔
- **Static export**: Server Component rendered at build time; no Server Actions, route handlers, `cookies()`/`headers()` or request-time `searchParams` ✔
- **No client code added**: no `"use client"`; the only script is Next's runtime ✔
- **Links**: one external link to riksdagen.se (same tab, no `target="_blank"`), internal link to `/sa-raknar-vi/` ✔
- **Prototype keys**: `partyName` uses `Object.hasOwn`, so a code like `toString` falls back to the code (tested) ✔
- **No tracking, cookies or third-party resources**: fonts, styles and data are all first-party ✔
- **Dependencies**: none added — shadcn Table/Badge copied as source (Badge without `class-variance-authority`/`@radix-ui/react-slot`); `npm audit --omit=dev`: 0 vulnerabilities ✔

## RLS Status

No database (Version 1).

## GDPR Notes

Shows name, party, constituency and attendance of members of parliament in their public role, from public Riksdagen records, with attribution and the required fairness caveat. No visitor data collected.
