# Spec: TASK-014 — Content-Security-Policy and CORS

## Summary

GitHub Pages serves files as they are; the site cannot set response headers. The CSP is therefore delivered as a `<meta http-equiv="Content-Security-Policy">` tag, written into every exported HTML file by a post-build step (`scripts/csp.ts`, run by `npm run build` after `next build`). Each page gets SHA-256 hashes of its own inline scripts, so only the scripts Next.js generated for that page at build time can run inline.

## Policy

```
default-src 'self';
script-src 'self' 'sha256-…' …;
style-src 'self' 'unsafe-inline';
style-src-elem 'self';
style-src-attr 'unsafe-inline';
img-src 'self' data:;
font-src 'self';
connect-src 'self';
object-src 'none';
base-uri 'self';
form-action 'none';
upgrade-insecure-requests
```

| Directive | Why |
|-----------|-----|
| `script-src 'self'` + hashes | Next chunks are same-origin files; the inline RSC payload and chunk loader scripts are hashed per page. No `'unsafe-inline'`, no `'unsafe-eval'` (the production bundle uses neither `eval` nor `new Function`). |
| `style-src-elem 'self'` | Stylesheets are same-origin files; the export has no `<style>` elements. Blocks injected `<style>` (CSS data exfiltration). |
| `style-src-attr 'unsafe-inline'` | Attendance bars use `style="width:…"` attributes. Attribute styles cannot load resources beyond what `img-src`/`font-src` allow. `style-src` carries the same values as a fallback for browsers without the `-elem`/`-attr` directives. |
| `img-src 'self' data:` | Icon and images are same-origin; `data:` for small inline SVG/CSS images. |
| `connect-src 'self'` | Client navigation fetches the RSC `.txt` files from the same origin. Blocks exfiltration via `fetch`/beacons. |
| `object-src 'none'`, `base-uri 'self'`, `form-action 'none'` | No plugins; no `<base>` hijacking; the site has no forms. |
| `upgrade-insecure-requests` | Defence in depth; everything is already HTTPS. |

**Not possible in a meta tag** (ignored by browsers): `frame-ancestors`, `report-uri`/`report-to`, `sandbox`. Clickjacking protection would need a response header; the site has no logins or state-changing actions, so framing it gains an attacker nothing.

## Post-build step

`lib/csp.ts` (pure, unit-tested):

- `inlineScripts(html)` — contents of every `<script>` without a `src` attribute
- `scriptHash(source)` — `'sha256-<base64>'` of the UTF-8 bytes, exactly as the browser hashes them
- `buildPolicy(hashes)` — the policy string above; hashes de-duplicated and sorted for stable output
- `addPolicy(html)` — inserts the meta tag directly after `<meta charSet="utf-8"/>` (inside `<head>`, before every script and stylesheet; the charset declaration stays first). Throws if the page already has a CSP meta tag or has no charset meta.

`scripts/csp.ts` walks `out/` and rewrites every `.html` file. Any error fails the build — a page is never published without a policy.

`npm run dev` is unchanged: the step only runs after `next build`, and Next's dev server needs `eval`.

## CORS

GitHub Pages sends `Access-Control-Allow-Origin: *` on every response (verified on `https://tinget.social/`), and the header cannot be changed or removed without a different host or a CDN in front.

**Assessment: acceptable, no change.** CORS protects responses that depend on the visitor's credentials. Here every response is a public static file, the same for everyone, with no cookies, sessions or logins, so another origin reading it learns nothing it could not fetch directly. The data is Riksdagen open data meant for reuse. CORS also does not limit who can *link to* or *embed* the site — that is `frame-ancestors`, see above.

Revisit when the backend arrives (PROJECT.md → Supabase): any endpoint that uses cookies or tokens must set an explicit origin allow-list and never `*` with credentials.

## Verification

- Unit tests (`lib/csp.test.ts`)
- Build: every `out/**/*.html` has exactly one CSP meta tag, placed before the first `<script>`
- Browser (Playwright, Chromium) against the served `out/`: listen for `securitypolicyviolation` and console CSP errors on `/`, `/partier/`, `/sa-raknar-vi/`, a member page and the 404 page; client-side navigation between them; changing filters and sort on the ranking; opening a missed-votes group on a member page. Expect zero violations and working interaction.
- Negative check: an injected inline script and a third-party request are blocked.

## Files to Create/Modify

- `lib/csp.ts`, `lib/csp.test.ts` — new
- `scripts/csp.ts` — new
- `package.json` — `build` runs `next build && tsx scripts/csp.ts`
- `docs/DEVELOPMENT.md`, `PROJECT.md` — CSP and CORS notes
