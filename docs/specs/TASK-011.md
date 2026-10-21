# Spec: TASK-011 — Daily data refresh

## Summary

A scheduled GitHub Actions workflow, `.github/workflows/data-refresh.yml`, runs the pipeline once a day (and on demand): fetch → compute → check → test → build. When `data/` changed, a separate job commits it to `main` and the existing deploy workflow publishes the site. Riksdagen data is processed in a job that holds only a read token; the job that can write to the repository runs no project code and no npm packages. Any failure stops the run before the commit, so the live site keeps the last good data.

## Data Model

No change. `data/` stays the committed data contract; a refresh commit only touches `data/`.

## Data Flow

```
data-refresh.yml  (schedule 04:23 UTC daily · workflow_dispatch [refresh: boolean])
│
├─ refresh        permissions: contents: read
│   checkout (no persisted credentials) → setup-node → restore .cache/riksdagen
│   → npm ci → data:fetch [--refresh] → data:compute → data:check → test → build
│   → changed = `git status --porcelain -- data/` non-empty
│   → upload data/ as artifact (only when changed) → step summary
│
├─ commit         needs refresh · if changed && ref == main
│   permissions: contents: write
│   checkout (same sha) → replace data/ with the artifact → git add -A data
│   → commit "chore(data): refresh Riksdagen data (votes up to YYYY-MM-DD)"
│   → git push origin HEAD:main   (fails if main moved: next run retries)
│   outputs: sha
│
├─ deploy         needs commit · uses ./.github/workflows/deploy.yml with ref = sha
│   permissions: contents: read, pages: write, id-token: write
│
└─ keepalive      schedule only, main only · permissions: actions: write
    gh api PUT …/actions/workflows/data-refresh.yml/enable
```

- **Why deploy is called, not triggered**: pushes made with `GITHUB_TOKEN` do not start other workflows, so the push from `commit` would not run `deploy.yml`. `deploy.yml` gains a `workflow_call` trigger with an optional `ref` input (empty = the triggering commit, as today) and checks out that ref. It still runs lint, typecheck, tests, `data:check` and build before uploading.
- **Cache**: `actions/cache` on `.cache/riksdagen`, key `riksdagen-{hash of lib/riksdagen/**}-{run_id}`, restore prefix `riksdagen-{hash}-`. Each run saves a new entry; a change to the fetch/normalise code starts from an empty cache. Completed riksmöten come from the cache, the current one is always re-fetched (existing `data:fetch` behaviour). `workflow_dispatch` with `refresh: true` re-downloads everything (picks up corrections Riksdagen makes to past riksmöten).
- **Change detection** is by content: compute is deterministic and has no timestamp, so a day without new votes produces no diff and no commit.
- **Branches**: a manual run on another branch runs the refresh job only (a dry run that reports whether data would change); `commit`, `deploy` and `keepalive` require `refs/heads/main`.
- **Commit message**: `lastVoteDate` is read from `data/meta.json` with `jq` into a shell variable and checked against `^\d{4}-\d{2}-\d{2}$` before use; never interpolated into the script by Actions expressions.
- **Author**: `github-actions[bot] <41898282+github-actions[bot]@users.noreply.github.com>`.

## Security

- Least privilege per job; top-level `permissions: {}`.
- The write token exists only in `commit`, which runs `actions/checkout`, `actions/download-artifact`, `jq` and `git` — no `npm ci`, no project scripts, so neither a compromised dependency nor malformed Riksdagen data can use it.
- All actions pinned to full commit SHAs (new: `actions/cache` v6.1.0, `actions/upload-artifact` v7.0.2, `actions/download-artifact` v8.0.2).
- `concurrency: data-refresh`, `cancel-in-progress: false`; the called deploy keeps its `pages` group.
- No secrets beyond the built-in `GITHUB_TOKEN`.

## Failure visibility

- A failed scheduled run is reported by GitHub's standard workflow-failure notification to the workflow's owner.
- Every run writes a step summary: newest vote date, whether `data/` changed.
- **Keepalive**: GitHub disables scheduled workflows in public repositories after 60 days without repository activity. The summer recess has no votes, hence no data commits, for about three months. The `keepalive` job re-enables the workflow via the API on each scheduled run (the approach used by common keepalive actions); it needs `actions: write` and nothing else.

## UI

`/sa-raknar-vi/#kallor`: "siffrorna räknas om när webbplatsen uppdateras med nya voteringar" → "Uppgifterna hämtas från data.riksdagen.se varje dag, och siffrorna räknas om när det har hållits nya voteringar." (TASK-010 UX recommendation 1.)

## Technical Decisions

- **Commit to `main` directly** rather than opening a PR: the data is validated by the same checks as CI, and a daily PR would need a human to merge. If `main` is protected against direct pushes, the push fails visibly; allow GitHub Actions to bypass, or switch the commit job to opening a PR.
- **Non-fast-forward is not retried**: if `main` moved during the run, the data was computed with possibly outdated code; the next run recomputes.
- **No deploy without a data change**: code changes deploy through the existing push trigger.

## Implementation Order

1. `deploy.yml`: `workflow_call` with `ref` input; checkout uses it.
2. `data-refresh.yml` as above.
3. Methodology page sentence.
4. `docs/DEVELOPMENT.md` (Deployment) and `data/README.md` (how the data is refreshed).
5. Lint/typecheck/test/build; validate workflow YAML (`actionlint` if available).

## Files to Create/Modify

- `.github/workflows/data-refresh.yml` — new
- `.github/workflows/deploy.yml` — `workflow_call` + `ref`
- `app/sa-raknar-vi/page.tsx` — update frequency sentence
- `docs/DEVELOPMENT.md`, `data/README.md` — document the refresh
