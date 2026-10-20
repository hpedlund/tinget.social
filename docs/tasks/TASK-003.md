# TASK-003: Riksdagen data client and fetch script

**Status**: reviewing
**Priority**: high
**Depends on**: TASK-001
**Branch**: task/003-riksdagen-fetch

## Goal

A script downloads members and all votes for given riksmöten from Riksdagen, validates them with zod and caches the raw downloads.

## Details

See `.github/skills/riksdagen-api/SKILL.md`.

- `lib/riksdagen/`: client with hardcoded base URL, throttling (≤ 5 req/s), `zod` schemas for `personlista` and vote rows
- Prefer bulk datasets under `https://data.riksdagen.se/dataset/` for full-year votes; verify file names and formats against the live site first
- `scripts/fetch.ts`: fetch the riksmöten for the 2022–2026 term and the current one into `.cache/` (git-ignored)
- Fail loudly on unexpected response shapes — never continue with half-parsed data
- Record field names and value sets actually observed (e.g. all `rost` values) in `data/README.md`
- Map vote rows to the `VoteRecord` type from `lib/attendance/types.ts` (TASK-004) and add a real-data test fixture

## Acceptance Criteria

- [ ] `npm run data:fetch` downloads members and votes for the configured riksmöten
- [ ] All responses validated with zod; invalid data aborts the run with a clear error
- [ ] Re-running uses the cache for completed riksmöten
- [ ] Observed vote fields and `rost` values documented
- [ ] Security review: hardcoded base URL, no secrets

## Artifacts

- Spec: `docs/specs/TASK-003.md` *(created by @architect)*
- Security review: `docs/reviews/TASK-003-security.md` *(created by @security)*
- UX review: `docs/reviews/TASK-003-ux.md` *(created by @ux)*
