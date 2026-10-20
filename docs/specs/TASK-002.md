# Spec: TASK-002 — Site layout and static page shell

## Summary

Give every page a shared header (site name + navigation), a footer (data attribution, non-affiliation note, privacy note, repository link) and a skip link, and add placeholder pages for the Version 1 routes plus a Swedish 404 page. The start page keeps its current "under uppbyggnad" content inside the new layout.

## Data Model

None.

## Data Flow

None — all content is static text.

## Routes

| Route | File | Content |
|-------|------|---------|
| `/` | `app/page.tsx` | Existing intro, adapted to the layout (no full-height centring) |
| `/partier/` | `app/partier/page.tsx` | Heading, one-line purpose, "Kommer snart" notice |
| `/sa-raknar-vi/` | `app/sa-raknar-vi/page.tsx` | Heading, short summary of the metric (from PROJECT.md), "Fullständig metodbeskrivning kommer" notice |
| unknown | `app/not-found.tsx` | "Sidan finns inte" + link to start page (exported as `404.html`) |

Page metadata uses a title template: `%s — tinget.social`; the start page keeps the full default title.

## Component Tree

```
app/layout.tsx (Server)
├── <a href="#innehall"> "Hoppa till innehållet" (visually hidden until focused)
├── SiteHeader (Server) — components/site-header.tsx
│   ├── Link "tinget.social" → /
│   └── MainNav (Client) — components/main-nav.tsx
│       └── <nav aria-label="Huvudmeny"> links: Närvaro (/), Partier, Så räknar vi
│           current page: aria-current="page" + visual style (font weight + underline, not colour alone)
├── <main id="innehall"> {children}
└── SiteFooter (Server) — components/site-footer.tsx
    ├── "Källa: Sveriges riksdag" (link to Riksdagens öppna data)
    ├── "tinget.social är oberoende och har ingen koppling till Sveriges riksdag."
    ├── Privacy: "Inga kakor och ingen spårning. Webbplatsen ligger på GitHub Pages, som kan logga IP-adresser av säkerhetsskäl."
    └── Link "Källkod och synpunkter på GitHub"
```

- `MainNav` is the only client component: it needs `usePathname()` for the current page. `usePathname()` returns the path **without** `basePath`, so comparisons work on both the sub-path and the custom domain.
- Navigation and route constants live in `lib/site.ts` (site name, repository URL, Riksdagen open data URL, nav items) so later pages reuse them.

## Styling

- Shared container: `mx-auto w-full max-w-5xl px-4 sm:px-6`
- Header: border-bottom, site name left, nav right; on narrow screens nav wraps below the name
- Touch targets ≥ 44 px tall for nav links on mobile
- Footer: border-top, `text-sm text-muted-foreground`
- Theme tokens only; visible focus styles on all links

## Technical Decisions

- **Footer attribution on every page** satisfies "Källa: Sveriges riksdag" globally; data pages may add their own source details later.
- **Privacy note in the footer** rather than a separate page — Version 1 collects nothing, one sentence is enough.
- **`next/link`** for internal links so `basePath` is applied automatically; external links are plain `<a>`.
- **No shadcn components yet** — plain elements styled with tokens; the nav does not need `NavigationMenu` for three links.

## Implementation Order

1. `lib/site.ts` constants
2. `components/main-nav.tsx`, `components/site-header.tsx`, `components/site-footer.tsx`
3. Update `app/layout.tsx` (skip link, header, main, footer, title template)
4. Adapt `app/page.tsx`; add `app/partier/page.tsx`, `app/sa-raknar-vi/page.tsx`, `app/not-found.tsx`
5. Verify lint, typecheck, build; check all routes under `/tinget.social/`, keyboard navigation and 404

## Files to Create/Modify

- `lib/site.ts` — site constants and navigation items
- `components/main-nav.tsx` — client nav with current-page state
- `components/site-header.tsx` — header
- `components/site-footer.tsx` — footer with attribution and privacy note
- `app/layout.tsx` — skip link, layout structure, title template
- `app/page.tsx` — adapt to layout
- `app/partier/page.tsx` — placeholder
- `app/sa-raknar-vi/page.tsx` — placeholder with metric summary
- `app/not-found.tsx` — Swedish 404
