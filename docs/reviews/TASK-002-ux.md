# UX Review: TASK-002 — Site layout and static page shell

**Result**: PASS WITH NOTES
**Reviewed files**: `components/main-nav.tsx`, `components/site-header.tsx`, `components/site-footer.tsx`, `app/layout.tsx`, `app/page.tsx`, `app/partier/page.tsx`, `app/sa-raknar-vi/page.tsx`, `app/not-found.tsx`

Verified in Chromium served under `/tinget.social/` with a GitHub Pages-like server (directory redirects, 404 fallback): desktop 1280×800 light, mobile 390×844 dark.

## Accessibility

- First Tab focuses "Hoppa till innehållet", which targets `<main id="innehall">` ✔ (padding on focus fixed during review)
- `<nav aria-label="Huvudmeny">`; current page has `aria-current="page"` and is marked by weight + underline, not colour alone ✔
- One `h1` per page; `lang="sv"` ✔
- Visible focus outlines on all links ✔

## Responsive Design

- Mobile: name and nav stack, nav links ≥ 44 px tall, no horizontal scroll (`scrollWidth` 390) ✔

## Component Patterns

Theme tokens only. The repeated "Kommer snart" / "Under uppbyggnad" label markup can become a shadcn `Badge` once components are added.

## Interaction States

- Unknown URL returns HTTP 404 with the Swedish "Sidan finns inte" page and a link home ✔
- Client-side navigation between pages updates the current-page state ✔

## Recommendations

1. When shadcn components are introduced (TASK-006), replace the status labels with `Badge`.
2. TASK-010 replaces the method summary on `/sa-raknar-vi/` with the full description.
