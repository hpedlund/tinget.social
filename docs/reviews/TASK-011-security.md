# Security Review: TASK-011 — Daily data refresh

**Result**: PASS WITH NOTES
**Reviewed files**: `.github/workflows/data-refresh.yml`, `.github/workflows/deploy.yml`

## Findings

No blocking findings.

## Checks

- **Least privilege**: top-level `permissions: {}`; `refresh` has `contents: read`, `commit` has `contents: write`, `deploy` has `contents: read`, `pages: write`, `id-token: write` (only what the called deploy job needs), and `keepalive` has `actions: write` ✔
- **Untrusted input isolated from the write token**: Riksdagen responses and npm packages run only in `refresh`, which checks out without persisted credentials. `commit` runs `actions/checkout`, `actions/download-artifact`, `jq` and `git` only, and stages only `data/` (`git add -A -- data`) ✔
- **Script injection**: no `${{ }}` expression inside a `run:` script carries external data. `lastVoteDate` is read with `jq` into a shell variable and must match `YYYY-MM-DD` before it goes into the commit message; the repository name reaches `gh` through `env` ✔
- **Invalid data never published**: fetch validates with zod and aborts on anything unexpected; compute writes nothing on error; `data:check`, tests and the build run before the artifact is uploaded; the deploy workflow repeats lint, typecheck, tests, `data:check` and build. Any failure ends the run before the commit, so the live site is unchanged. Verified locally: an unreachable Riksdagen makes `data:fetch` exit 1 ✔
- **No-op days**: compute is deterministic; recomputing from the same cache gave 0 changed files, so no commit and no deploy ✔
- **Branch guard**: `commit`, `deploy` and `keepalive` require `refs/heads/main`; a manual run elsewhere is a dry run ✔
- **Supply chain**: all actions pinned to full commit SHAs, new ones checked against their tags (`actions/cache` v6.1.0, `actions/upload-artifact` v7.0.2, `actions/download-artifact` v8.0.2, all released at least two weeks ago); no new npm dependencies ✔
- **Concurrency**: `data-refresh` group without cancellation; deploy keeps its `pages` group ✔
- **Secrets**: none; only the built-in `GITHUB_TOKEN` ✔
- `actionlint` 1.7.7: no findings (shellcheck not available in the review environment)

## Notes

1. **Artifact trust**: `commit` trusts the `data` artifact from `refresh` in the same run. A compromised npm package in `refresh` could therefore change files under `data/`, but nothing outside it, and the deploy still validates `data/` against the zod schemas. This is the expected boundary for a pipeline that must run npm code on the data.
2. **Keepalive** relies on the workflow-enable API resetting GitHub's 60-day inactivity timer, which is how common keepalive actions work but is not documented behaviour. If GitHub disables the schedule anyway, it emails the owner beforehand and it can be re-enabled in the Actions tab.
3. **Branch protection**: if `main` requires pull requests, the push in `commit` fails (visibly). Allow GitHub Actions to push, or change the job to open a PR.

## RLS Status

No database (Version 1).

## GDPR Notes

No change: the same public data about members, attributed to Sveriges riksdag. The workflow stores nothing beyond the Actions cache (Riksdagen downloads) and a 5-day artifact of `data/`.
