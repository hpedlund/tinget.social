# Security Review: TASK-003 — Riksdagen data client and fetch script

**Result**: PASS WITH NOTES
**Reviewed files**: `lib/riksdagen/config.ts`, `lib/riksdagen/client.ts`, `lib/riksdagen/schemas.ts`, `lib/riksdagen/normalized.ts`, `lib/riksdagen/votes.ts`, `lib/riksdagen/members.ts`, `lib/riksdagen/cache.ts`, `lib/riksdagen/errors.ts`, `lib/riksdagen/compare.ts`, `lib/riksdagen/types.ts`, `scripts/fetch.ts`, `package.json`, `.gitignore`

## Findings

| # | Severity | Category | Description | File | Recommendation |
|---|----------|----------|-------------|------|----------------|
| 1 | Low | Resource limits | When the server sends no `Content-Length`, the body is fully buffered before the 128 MB cap is checked, so a misbehaving response could use up to that much memory (plus whatever arrives before the check). | `lib/riksdagen/client.ts` | Acceptable for a trusted single host in CI. Stream with a running byte count if the cap ever needs to be hard. |
| 2 | Info | Data minimisation | `raw/personlista-tjanst.json` keeps the full response, including officials' public contact details (`personuppgift`) and 148 non-MP officials. It lives only in the git-ignored `.cache/`; `members.json` keeps only voters and no contact data. | `lib/riksdagen/members.ts` | TASK-005/011: never publish raw cache files or commit them to `data/`; if `.cache/` is stored with `actions/cache`, that is acceptable (public data, repo-scoped). |
| 3 | Info | Supply chain | New dependencies: `zod` 4.6.5, `fflate` 0.8.3 (both zero-dependency), `tsx` 4.23.15 (dev). Pinned exact. `npm audit --omit=dev`: 0 vulnerabilities. Remaining dev-only advisories are the pre-existing `eslint-config-next` → `fast-glob` → `micromatch`/`braces` chain (TASK-001). | `package.json` | None. |

## Checks

- **Hardcoded base URL** ✔ — `RIKSDAGEN_BASE_URL` is a constant; `buildUrl()` resolves every path against it and rejects any other origin; `redirect: "error"` prevents being redirected elsewhere. Query values are set via `URLSearchParams` (encoded).
- **No secrets** ✔ — no tokens, keys or env-based configuration; only a descriptive `User-Agent`.
- **Untrusted input validated with zod** ✔ — every response (dataset files, `/votering/{id}`, `voteringlista`, `personlista`) and every cached file read back is validated. Strict enums for `rost`, `avser`, `votering`; regexes for ids, dates, `rm`, `punkt`; image URLs restricted to `https://data.riksdagen.se`.
- **Fail loudly** ✔ — schema errors, count mismatches against the vote index, truncated (`@antal` ≥ 10 000) or unfiltered (`@villkor`) `voteringlista` results, duplicate ids, missing dates and voters missing from `personlista` all abort with exit code 1 before that riksmöte's normalised file is written. Writes are atomic (temp file + rename). Verified by feeding invalid rows to the schemas.
- **Path traversal** ✔ — cache file names come from constants, riksmöte slugs (from config) or vote ids that passed the GUID regex. Zip entry names are never used as paths.
- **Zip bomb** ✔ — only `.json` entries are inflated and the total uncompressed size is capped at 1 GB.
- **Throttling** ✔ — one serial queue, ≥ 200 ms between request starts (≤ 5 req/s); retries only on network errors and 5xx, with backoff.
- **No `eval`, no shell-outs, no dynamic imports** ✔
- **No site impact** ✔ — nothing under `app/` or `components/` imports `lib/riksdagen/`; the static build is unchanged.
- **GitHub Actions** — no workflow changes in this task (scheduled fetch is TASK-011).

## RLS Status

No database (Version 1).

## GDPR Notes

The pipeline processes data about members of parliament in their public role, from the official public source (Riksdagen). `members.json` is limited to people who appear in the vote data, with name, party, constituency, status, birth year, gender, portrait URL and chamber assignments — no contact details. No visitor data is involved.
