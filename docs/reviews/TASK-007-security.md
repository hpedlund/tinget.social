# Security Review: TASK-007 — Ranking filters and sorting

**Result**: PASS
**Reviewed files**: `lib/ranking/explorer.ts`, `lib/use-search-state.ts`, `components/ranking-explorer.tsx`, `components/ranking-filters.tsx`, `components/ranking-table.tsx`, `components/ui/native-select.tsx`, `components/ui/button.tsx`, `app/page.tsx`, `app/error.tsx`, `lib/parties.ts`

## Findings

No findings.

## Checks

- **URL query is untrusted input**: `parseViewState` accepts a value only on an exact match against the known periods, party codes and constituencies from the build-time data (`Array.includes`, no object-key lookup, so `toString` and similar are rejected — tested); anything else falls back to the default. Values are never interpolated into `href`, `style`, `src` or HTML ✔
- **Output encoding**: names, parties, constituencies and labels are React text children; no `dangerouslySetInnerHTML`. The bar width is still computed from the schema-validated attendance (0–1) ✔
- **History**: `pushState` is called with `location.pathname` + our own `toSearch` output + `location.hash` — always same origin and same path; no open redirect, no `location.href` assignment ✔
- **Error boundary**: `app/error.tsx` shows a fixed message and never renders `error.message` or the digest ✔
- **Data access**: the page reads only via `lib/data/` (`getPeriods`, `getDefaultPeriod`, `getRanking`); the client receives already validated, public data as props; no runtime fetching ✔
- **Static export**: no Server Actions, route handlers, middleware or request-time `searchParams`; the only client code is the explorer and the error boundary ✔
- **No tracking, cookies or storage**: view state lives only in the URL; no `localStorage`, no third-party resources ✔
- **Dependencies**: none added — shadcn Native Select and Button copied as source without `class-variance-authority`/`@radix-ui/react-slot`; `npm audit --omit=dev`: 0 vulnerabilities ✔

## RLS Status

No database (Version 1).

## GDPR Notes

Same public data as TASK-006 (members' attendance in their public role, attributed to Sveriges riksdag). Filter choices stay in the visitor's URL and are not sent anywhere: the site has no server-side logic, and GitHub Pages may log the requested URL including the query string, as already covered by the privacy note in the footer.
