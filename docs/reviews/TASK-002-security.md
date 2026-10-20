# Security Review: TASK-002 — Site layout and static page shell

**Result**: PASS
**Reviewed files**: `lib/site.ts`, `components/main-nav.tsx`, `components/site-header.tsx`, `components/site-footer.tsx`, `app/layout.tsx`, `app/page.tsx`, `app/partier/page.tsx`, `app/sa-raknar-vi/page.tsx`, `app/not-found.tsx`

## Findings

No findings.

## Checks

- Static text only; no external data, no `dangerouslySetInnerHTML` ✔
- External links are hardcoded constants in `lib/site.ts` (riksdagen.se, github.com); no user-controlled URLs ✔
- One client component (`MainNav`) reads only `usePathname()`; no browser storage, cookies or third-party scripts ✔
- No new dependencies ✔

## RLS Status

No database (Version 1).

## GDPR Notes

Footer privacy note states that no cookies or tracking are used and that GitHub Pages may log IP addresses — accurate for the current setup.
