# TASK-008: Member detail page

**Status**: designed
**Priority**: medium
**Depends on**: TASK-005, TASK-002
**Branch**: claude/focused-pascal-1h7rnf

## Goal

Each member has a static page showing attendance per riksmöte, totals per vote type and the votes they missed.

## Details

- `app/ledamoter/[id]/page.tsx` with `generateStaticParams` and `dynamicParams = false`
- Totals (Ja/Nej/Avstår/Frånvarande), trend per riksmöte, list of missed votes linking to the source on riksdagen.se
- Context: party average for the same period
- Metadata (title, description) per member

## Acceptance Criteria

- [ ] A page is generated for every member in the data
- [ ] Figures match the ranking page
- [ ] Missed votes link to the corresponding Riksdagen source
- [ ] Unknown member IDs give the 404 page

## Artifacts

- Spec: `docs/specs/TASK-008.md` *(created by @architect)*
- Security review: `docs/reviews/TASK-008-security.md` *(created by @security)*
- UX review: `docs/reviews/TASK-008-ux.md` *(created by @ux)*
