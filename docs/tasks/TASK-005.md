# TASK-005: Data contract and data access layer

**Status**: reviewing
**Priority**: high
**Depends on**: TASK-003, TASK-004
**Branch**: claude/focused-pascal-1h7rnf

## Goal

The pipeline writes versioned JSON files to `data/`, and pages read them only through typed `lib/data/` functions.

## Details

See PROJECT.md → "Data access layer" and `/data-modeling` skill.

- `scripts/compute.ts`: cached raw data → attendance → `data/*.json` (deterministic output)
- Files: ranking per period, one file per member, party overview, metadata (`schemaVersion`, `generatedAt`, source, riksmöten)
- `lib/data/types.ts` + zod schemas; `lib/data/` functions: `getPeriods`, `getRanking`, `getMember`, `getAllMemberIds`, `getParties`
- `data/README.md` documents every file
- Commit an initial data snapshot — *pending: `data.riksdagen.se` was not reachable from the development environment; run `npm run data:fetch && npm run data:compute` and commit `data/`*

## Acceptance Criteria

- [x] `npm run data:compute` regenerates identical output for identical input
- [x] Build fails if a data file is missing or invalid (every `lib/data/` read throws; `npm run data:check`)
- [x] No page or component imports `data/` directly
- [x] Total data size stays small enough for static hosting (documented; `data/` is build input only)

## Artifacts

- Spec: `docs/specs/TASK-005.md` *(created by @architect)*
- Security review: `docs/reviews/TASK-005-security.md` *(created by @security)*
- UX review: `docs/reviews/TASK-005-ux.md` *(created by @ux)*
