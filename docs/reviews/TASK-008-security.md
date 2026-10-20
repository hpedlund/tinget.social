# Security Review: TASK-008 — Member detail page

**Result**: PASS
**Reviewed files**: `app/ledamoter/[id]/page.tsx`, `lib/member/profile.ts`, `lib/member/load.ts`, `lib/site.ts`, `components/member-trend-table.tsx`, `components/missed-votes.tsx`, `components/ranking-table.tsx`, `scripts/check.ts`

## Findings

| # | Severity | Category | Finding | File | Recommendation |
|---|----------|----------|---------|------|----------------|
| 1 | Info | Data minimisation | `personlista` status is shown as public role information ("Tidigare riksdagsledamot", minister titles); a status starting with "Avliden" is not shown, as TASK-005 recommended. | `app/ledamoter/[id]/page.tsx` | None. |

## Checks

- **Route parameters**: `generateStaticParams` comes from the member index and `dynamicParams = false`, so only known ids are prerendered; `getMember` also rejects non-numeric ids (`memberIdSchema`) and unknown ids → `notFound()`. In the export an unknown id has no file and GitHub Pages serves `404.html` (verified) ✔
- **Outbound links**: built only in `lib/site.ts` on fixed hosts (`www.riksdagen.se`, `data.riksdagen.se`) with `encodeURIComponent(id)`; member ids are numeric and all 2 611 vote ids in the data are GUIDs. Plain same-tab links, no `target="_blank"`. A test shows a crafted id stays inside its path segment ✔
- **Output encoding**: names, statuses, designations and dates are React text; no `dangerouslySetInnerHTML`. Bar widths come from schema-validated attendance (0–1) ✔
- **Data integrity**: `buildMemberProfile` throws when a member file and a ranking disagree (rank, attendance, eligible, Frånvarande), so `next build` and `npm run data:check` (CI) fail instead of publishing contradicting figures ✔
- **Data access**: pages read only via `lib/data/`; the client component receives already validated, public data as props; no runtime fetching ✔
- **Static export**: no Server Actions, route handlers, middleware or request-time APIs ✔
- **Prefetching**: ranking links use `prefetch={false}`, so the start page does not fetch ~450 member payloads ✔
- **No tracking, cookies or storage**; no third-party resources are loaded — riksdagen.se is only reached when a visitor follows a link ✔
- **Dependencies**: none added; `npm audit --omit=dev`: 0 vulnerabilities ✔

## RLS Status

No database (Version 1).

## GDPR Notes

Each member now has a page that gathers their attendance and missed votes. This is data about the public exercise of their office, published by Sveriges riksdag and attributed to it, with the fairness caveat on every page. No birth year, gender, portrait or contact details are published (TASK-005). Deceased members' status is not shown. Data is refreshed from source, so corrections at Riksdagen flow through on the next run.
