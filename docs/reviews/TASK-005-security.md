# Security Review: TASK-005 — Data contract and data access layer

**Result**: PASS WITH NOTES
**Reviewed files**: `lib/data/schemas.ts`, `lib/data/types.ts`, `lib/data/index.ts`, `lib/data/data.test.ts`, `lib/pipeline/periods.ts`, `lib/pipeline/build.ts`, `lib/pipeline/build.test.ts`, `lib/pipeline/fixtures.ts`, `scripts/compute.ts`, `scripts/check.ts`, `package.json`, `data/README.md`

## Findings

| # | Severity | Category | Finding | File | Recommendation |
|---|----------|----------|---------|------|----------------|
| 1 | Low | Integrity | The swap into `data/` (remove managed entry → rename staged entry) is not atomic across entries. A run killed mid-swap leaves `data/` incomplete. It fails closed: `lib/data/` throws, so `next build` and `npm run data:check` fail and nothing invalid is published; `git checkout data/` restores it. | `scripts/compute.ts` | Acceptable. TASK-011 must run `data:check` before committing and never commit after a failed step. |
| 2 | Info | Server-only boundary | `lib/data/` uses `node:fs`; it is only safe in Server Components and `generateStaticParams`. Importing it from a Client Component fails the build (no `fs` in the browser) rather than leaking anything. | `lib/data/index.ts` | Pages pass plain props to Client Components (TASK-007). Optionally add the `server-only` package later. |
| 3 | Info | Data minimisation | Published fields per member: name, party, constituency, `personlista` status (may read `Avliden YYYY-MM-DD`), vote counts and missed vote ids — all from public records about the member's public role. Birth year, gender, portrait URL and contact details are deliberately not written. | `lib/pipeline/build.ts` | None. TASK-008 should show status neutrally or omit it. |

## Checks

- **Path traversal**: `getMember` accepts only numeric ids that are in `members.json` before building a path; `getRanking`/`getParties` accept only period ids listed in `meta.json`, whose schema restricts them to `NNNN-NN(NN)`; vote file names come from riksmöten validated as `NNNN/NN`. Tested with `../meta` ✔
- **Write paths**: every output path is derived from schema-validated values (member ids numeric, period ids from config); `rm -r` targets only fixed names (`MANAGED`, `.cache/compute`) ✔
- **Validation on write and read**: each generated file is parsed with its strict zod schema before anything is written, and again on read; unknown keys, wrong `schemaVersion` and missing files throw ✔
- **Fail closed**: any read/validation error in `data:compute` exits 1 before `data/` is touched (verified with a corrupt cache file); cross-file inconsistencies (unknown member in a ranking, missed vote not in the vote index, stray member files) fail `data:check` / `getMember` ✔
- **Raw cache never published** (TASK-003 finding 2): `data:compute` writes only builder output; `.cache/` stays git-ignored; `data/` is not copied into `out/` ✔
- **No secrets, network or dynamic code**: compute/check do no network I/O; no `eval`, no `dangerouslySetInnerHTML` (no UI in this task) ✔
- **Dependencies**: none added; `npm audit --omit=dev`: 0 vulnerabilities ✔

## RLS Status

No database (Version 1). The `lib/data/` signatures are designed to be re-implemented against Supabase views later.

## GDPR Notes

Processes and publishes voting attendance of members of parliament in their public role, from public Riksdagen records, with attribution. No visitor data. See finding 3 for the fields published.
