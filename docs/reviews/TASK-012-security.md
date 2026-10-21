# Security Review: TASK-012 — Pre-launch review (whole repository)

**Result**: PASS WITH NOTES
**Reviewed files**: the whole repository on `claude/focused-pascal-1h7rnf`: `app/**`, `components/**`, `lib/**` (especially `lib/riksdagen/*`, `lib/data/*`, `lib/pipeline/*`, `lib/ranking/explorer.ts`, `lib/use-search-state.ts`, `lib/site.ts`), `scripts/{fetch,compute,check}.ts`, `.github/workflows/{ci,deploy,data-refresh}.yml`, `package.json`, `package-lock.json`, `next.config.ts`, `public/`, `.gitignore`, and the full git history (secret scan). The SEO work for this task that was uncommitted at review time (`app/sitemap.ts`, `app/robots.ts`, `app/og.png/route.tsx`, `app/icon.svg`, `lib/metadata.ts`, the `metadata` changes in `app/**/page.tsx` and `app/layout.tsx`) was also read. The live site was checked at `https://tinget.social/`.

No critical, high or medium findings. The notes below are about hardening and repository settings. None of them blocks launch.

## Findings

| # | Severity | Category | Description | File | Recommendation |
|---|----------|----------|-------------|------|----------------|
| 1 | Low | Transport / headers | The live site sends no `Strict-Transport-Security` header (checked: `server: GitHub.com`, only `cache-control`, `etag`, `access-control-allow-origin: *` and similar). GitHub Pages cannot add HSTS for a custom domain. **Scenario**: a visitor on a hostile network (public Wi-Fi) types `tinget.social` or follows an `http://` link. An active attacker intercepts the first plain-HTTP request before the 301 to HTTPS and serves altered figures, which damages credibility. The site has no logins, cookies or forms, so nothing can be stolen. | GitHub Pages hosting (no file) | Accept for launch. Confirm that **Enforce HTTPS** is ticked in Settings → Pages; the review environment could not verify the HTTP→HTTPS redirect because plain HTTP is blocked here. If a CDN or host in front of Pages is ever added, send `Strict-Transport-Security: max-age=31536000; includeSubDomains` and consider HSTS preload. |
| 2 | Low | Repository settings | `main` has **no branch protection** (`GET /branches/main/protection` → 404 "Branch not protected"). Anything holding a `contents: write` token can force-push or rewrite `main`. That covers the maintainer's PAT/session and the `commit` job in `data-refresh.yml`. Every push to `main` deploys (`deploy.yml`). **Scenario**: a stolen maintainer token, or a compromised first-party action in the `commit` job, force-pushes code to `lib/`/`app/`. `deploy.yml` builds and publishes it, which defaces the site, and the force-push also rewrites the public data history that the "Så räknar vi" page points to. | GitHub settings; `.github/workflows/data-refresh.yml:101` | Add a ruleset on `main`: block force pushes and deletion, and require the CI status check for pull requests. Add **GitHub Actions** as a bypass actor (or allow it to push) so the data-refresh commit still works, as `docs/DEVELOPMENT.md` already anticipates. |
| 3 | Low | Supply chain | `npm audit` reports 5 high advisories, all in **dev-only** lint tooling (`eslint-config-next@16.4.2` → `@next/eslint-plugin-next` → `fast-glob@3.3.1` → `micromatch@4.0.8` → `braces@3.0.3`, GHSA-vfj7-8cjw-p6xm, stack-exhaustion DoS from nested glob patterns). The only fix npm offers is a downgrade to `eslint-config-next@14`. The globs come from repository config, not from input, and none of this reaches the site. `npm audit --omit=dev`: **0 vulnerabilities**. This is unchanged since TASK-001. | `package-lock.json` | No action for launch. Re-check when `eslint-config-next` updates. |
| 4 | Low | Supply chain | There is no `.github/dependabot.yml` (or Renovate). All actions are pinned to SHAs and all npm packages to exact versions, which is good. Without an update bot, though, security fixes (for example a future `next` advisory) only arrive when someone bumps a version by hand. **Scenario**: a Next.js advisory affecting static export or client runtime is published; the site keeps shipping the vulnerable `next@16.4.2` until someone happens to notice. | `.github/` (missing file) | **Fixed in this task**: `.github/dependabot.yml` (actions and npm, weekly, grouped). Original recommendation: add `dependabot.yml` with `package-ecosystem: github-actions` and `npm` (weekly, grouped). Dependabot updates SHA pins together with their `# vX.Y.Z` comments. At minimum, enable Dependabot security alerts and updates in repository settings. |
| 5 | Info | Headers / CSP | There is no Content-Security-Policy. GitHub Pages cannot set response headers, and a `<meta http-equiv>` CSP has limits: Next emits **inline scripts** (the RSC payload `self.__next_f.push(…)`; 3 inline `<script>` on `/`) and inline `style` attributes (attendance bars). Nonces need a per-request server, which static export does not have. Hashes differ per page and per build. `frame-ancestors`, `report-uri` and `sandbox` are ignored in meta. No XSS sink was found (see Checks), so the practical gain is defence in depth. | `app/layout.tsx` | **Recommendation (not implemented):** after launch, add a production-only meta CSP in `app/layout.tsx`: `default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'none'`. It does not stop inline injection, but it blocks loading or exfiltrating to third-party origins and enforces the "no third-party scripts" rule. Test client navigation (RSC `.txt` fetches need `connect-src 'self'`) and leave it off in `next dev`, which needs `eval`. A strict hash-based policy would need a post-build step that hashes each HTML file's inline scripts into its meta tag. Only do that if the site starts rendering riskier content. |
| 6 | Info | Headers | There is no `X-Frame-Options`/`frame-ancestors` (Pages cannot send it, and meta cannot express it), and no `X-Content-Type-Options`. **Scenario**: a third party frames the site, which is harmless because the site has no state-changing actions, logins or forms to clickjack. | GitHub Pages hosting | Accept. Revisit when hosting moves to a server (later phases with accounts). |
| 7 | Info | CI / artifact trust | The `commit` job (the only job with `contents: write`) downloads the `data` artifact produced by `refresh`, which ran `npm ci` and project code. It commits whatever the artifact contains under `data/` (`git add -A -- data`) without re-validating. **Scenario**: a compromised npm dependency in `refresh` writes plausible but false figures, or arbitrary extra files under `data/`, and they are committed to `main` with the bot identity. The token cannot escape `data/`, cannot touch workflows, and `deploy.yml` re-runs `data:check` and the build. The same compromised dependency could also alter the deploy build directly, so this adds no new capability. | `.github/workflows/data-refresh.yml:85-101` | Optional hardening without npm: in `push`, reject the run if `git status --porcelain -- data` lists a path outside `data/(meta\|parties\|members).json`, `data/(ranking\|members\|votes)/[0-9-]+\.json` and `data/README.md`. |
| 8 | Info | Resource limits | `MAX_RESPONSE_BYTES` is checked against `Content-Length` first. Without that header (chunked), `response.arrayBuffer()` buffers the whole body before the size check. **Scenario**: a misbehaving `data.riksdagen.se` streams an endless chunked body; memory grows until the 120 s timeout or a runner OOM, and the run fails. Nothing is written, and the live site keeps the last good data. The only host is hardcoded HTTPS (`redirect: "error"`), so this is availability-only. Current headroom is large: zips are 9–13 MB against the 128 MiB cap, and they unpack to 123–174 MiB against the 1 GiB cap. | `lib/riksdagen/client.ts:62-69` | Optional: read `response.body` with a running byte count and abort when it passes the cap. |
| 9 | Info | CI hygiene | No job sets `timeout-minutes`, so the default is 360 min. A stalled run of the data refresh (which has `concurrency: data-refresh`, no cancel) blocks the next scheduled runs for up to 6 h and uses runner minutes. | `.github/workflows/*.yml` | **Fixed in this task**: `timeout-minutes` on every job (CI 15, deploy build 20 / deploy 10, refresh 30, commit 10, keepalive 5). Original recommendation: add `timeout-minutes` (e.g. 30 for CI/deploy, 60 for `refresh`, 10 for `commit`/`keepalive`). |

## Checks

**XSS / unsafe rendering**
- No `dangerouslySetInnerHTML`, `innerHTML`, `eval`, `new Function`, `next/script` or raw `<script>` anywhere in `app/`, `components/` or `lib/` ✔
- All Riksdagen strings (names, party, constituency, status, beteckning) render as React text children or through Next `metadata` (escaped). The explorer payload goes to the client as RSC props, which Next serialises with HTML-safe JSON escaping ✔
- Every `href` is either a constant (`lib/site.ts`), a fixed internal path, or built from validated data:
  - `memberSourceUrl` / `voteSourceUrl` use a fixed `https://` host plus `encodeURIComponent` of an id that is digits-only or a GUID.
  - `rankingHref` uses `URLSearchParams` under `/?`.
  - `/ledamoter/${memberId}/` uses a digits-only id.
  - No `href` scheme comes from data. `imageUrl` and `sourceUrl` are never rendered; `bild_url_192` is also schema-restricted to `https://data.riksdagen.se` ✔
- No `target="_blank"` (so no reverse tabnabbing), no `<iframe>`, no `<img>` from external hosts ✔
- `app/error.tsx` does not display `error.message` or `digest` ✔

**Client-side query parameters / open redirect**
- `parseViewState` (`lib/ranking/explorer.ts:129`) uses each of `period`, `parti`, `valkrets` and `ordning` only on an exact match against a known allow-list, otherwise the default; it never throws ✔
- `useSearchState` (`lib/use-search-state.ts:32`) only calls `history.pushState` with the current `pathname` plus a query built by `toSearch` (`URLSearchParams`), so it stays same-origin and nothing navigates to a URL taken from input ✔
- Member pages are static with `dynamicParams = false`; `getMember` validates the id with `memberIdSchema` before building a file path ✔
- Live: `https://tinget.social//evil.com/` → 404 (no protocol-relative redirect); `/ledamoter` → 301 to the same-origin `/ledamoter/` ✔

**Pipeline: SSRF, path traversal, untrusted data**
- `RIKSDAGEN_BASE_URL` is a constant. `buildUrl` refuses any URL whose origin differs from it, the `fetch` call uses `redirect: "error"`, parameters are set via `searchParams` and pathnames are constants or GUID-validated vote ids ✔
- Every response goes through `zod`: strict UTF-8 decode, then the schemas. Ids are regex-checked (GUID / `\d{6,16}`), `rost`/`avser`/`votering` use strict enums, and the counts must match the vote index ✔
- File names built from data:
  - `votering/${id}.json` uses a GUID-validated id.
  - Riksmöte slugs come only from the hardcoded `RIKSMOTEN`.
  - `data/members/${memberId}.json` and `ranking/${periodId}.json` are validated by `memberIdSchema` (`^\d+$`) and `periodIdSchema` in `file()` before anything is written.
  - The complete file set is validated in memory before `data/` is swapped ✔
- Zip handling (`lib/riksdagen/votes.ts:142`): entries are never written to disk, so zip-slip does not apply. Names must end in `.json` (which also rules out `__proto__`). The total `originalSize` is capped at 1 GiB, and fflate allocates the output from `originalSize` and does not grow it (`inflt` with `st.i = 2` and a provided buffer), so the declared size bounds memory ✔
- Downloads are capped at 128 MiB, with a 120 s timeout, 2 retries and throttling to ≤ 5 requests/s ✔ (see #8)
- The cache under `.cache/riksdagen` is re-validated with `zod` on read; atomic writes use temp file + rename ✔

**GitHub Actions**
- Least privilege throughout:
  - `ci.yml`: `contents: read`.
  - `deploy.yml`: build job `contents: read`; only the `deploy` job, which runs no npm code, has `pages: write` and `id-token: write`.
  - `data-refresh.yml`: `permissions: {}` at top level; `refresh` read-only; `commit` is the only `contents: write` job, and it runs no npm packages or project scripts; `keepalive` has only `actions: write` ✔
- No `pull_request_target`, no `workflow_run`. PR CI runs with a read token and no secrets. Caches from PR refs are scoped to the PR and cannot be restored on `main` ✔
- No `${{ }}` expression interpolated into a `run:` script: `inputs.refresh` is used only in `if:`, and `github.token` and `github.repository` are passed via `env` ✔
- `lastVoteDate` is regex-checked before it is used in the commit message. The step summary only shows values that `data:check` has already validated ✔
- `persist-credentials: false` everywhere except `commit`, which needs it to push ✔
- The artifact is downloaded by name from the same run only ✔
- The deploy `ref` input is passed via `with:`, not a shell ✔
- All 8 actions are pinned to full SHAs, and each SHA was **verified** against its release tag with `git ls-remote`: checkout v7.0.1, setup-node v7.1.0, cache v6.1.0, upload-artifact v7.0.2, download-artifact v8.0.2, configure-pages v6.0.0, upload-pages-artifact v5.0.0, deploy-pages v5.0.1 ✔
- The `actions/cache` key includes `hashFiles('lib/riksdagen/**')`, so changed fetch code starts from an empty cache ✔

**Supply chain**
- All dependencies are pinned to exact versions. Every lockfile entry resolves from `registry.npmjs.org` with an `integrity` hash, except 6 bundled sub-dependencies of the optional `@tailwindcss/oxide-wasm32-wasi`, which ship inside that tarball ✔
- Install scripts come only from `esbuild`, `unrs-resolver` and `fsevents`, all expected ✔
- `npm audit --omit=dev`: 0 vulnerabilities ✔ (dev chain: #3)
- `next.config.ts`: `output: "export"`; the only `process.env` read is `PAGES_BASE_PATH`, which is set by the workflow. No `NEXT_PUBLIC_*` variables exist ✔

**Secrets**
- No `.env`, keys or tokens are tracked. `.gitignore` covers `.env*`, `.cache/`, `.next/` and `out/` ✔
- `git log -p --all` scan for `token|secret|password|api[_-]?key|ghp_|github_pat_|AKIA|BEGIN … PRIVATE` found only documentation text, `id-token: write` and `GH_TOKEN: ${{ github.token }}` ✔
- The only file deleted from history is `.vscode/settings.json`, which contained an editor auto-approve setting and no secret ✔
- The pipeline's `User-Agent` names the public repository only ✔

**Third parties, tracking, cookies**
- The built HTML loads only same-origin `/_next/static/*`, with no `<link>` to external origins. `globals.css` imports only Tailwind (no web fonts, no `next/font/google`) ✔
- External hosts in the build output are only link targets: `data.riksdagen.se`, `www.riksdagen.se` and `github.com` ✔
- No cookies, `localStorage`, analytics or third-party scripts ✔
- `public/` contains only `.nojekyll` ✔
- New SEO files (uncommitted at review time):
  - `sitemap.ts` and `robots.ts` use the constant `SITE_URL` and digits-only ids with `encodeURIComponent`.
  - The OG image is generated at build time from constant text only.
  - `icon.svg` contains no script or external references ✔

## RLS Status

No database (Version 1).

## GDPR Notes

- **Visitors**: no personal data is collected: no forms, cookies, storage, analytics or third-party requests. The footer (`components/site-footer.tsx:19`) states "Inga kakor och ingen spårning" and discloses that GitHub Pages may log IP addresses for security purposes. That is accurate and adequate for Version 1.
- **Members of parliament**: published data is limited to the public role: name, party, constituency, service status and voting attendance, all sourced from Riksdagen with attribution. Data minimisation holds: birth year, gender and photo URL are fetched into the private CI cache but **are not** written to `data/` or the site. Deceased members' status text is not shown (`status.startsWith("Avliden")` filter). The figures are public-role data published under Riksdagen's open-data terms, with fairness caveats shown in the UI. The legal basis is legitimate interest / journalistic-civic purpose.
- **Open**: the repository settings (Pages "Enforce HTTPS", verified domain, `github-pages` environment branch rule) could not be read from the review environment because the API is blocked by the proxy. Confirm them by hand, together with #2.
