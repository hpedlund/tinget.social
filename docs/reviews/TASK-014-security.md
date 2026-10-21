# Security Review: TASK-014 — Content-Security-Policy and CORS

**Result**: PASS WITH NOTES
**Reviewed files**: `lib/csp.ts`, `lib/csp.test.ts`, `scripts/csp.ts`, `package.json`, built `out/`

## Checks

- All 572 exported HTML pages carry exactly one CSP meta tag, directly after the charset declaration and before every `<script>` and `<link>` — the policy covers every resource on the page ✔
- `script-src` is `'self'` plus per-page SHA-256 hashes; no `'unsafe-inline'`, `'unsafe-eval'` or wildcard. The production bundle contains no `eval` / `new Function` ✔
- Browser check (Chromium via Playwright, served `out/`): zero CSP violations on `/`, `/partier/`, `/sa-raknar-vi/`, a member page and `404.html`; during client-side navigation between them; when filtering by party, changing sort order and opening a missed-votes group ✔
- Negative checks in the same browser: an injected inline `<script>` does not run; `fetch("https://example.com/")` is refused by `connect-src`; `eval` from a page script throws ✔
- `style-src-elem 'self'` blocks injected `<style>` elements; only `style` attributes (attendance bars) are allowed inline ✔
- `object-src 'none'`, `base-uri 'self'`, `form-action 'none'` set ✔
- Fail closed: a page without a charset meta tag or with an existing CSP aborts the build, so no page is published without a policy (unit-tested) ✔
- The post-build step reads only files produced by `next build`; no network, no new dependencies, no workflow or permission changes ✔

## Findings

| # | Severity | Category | Description | File | Recommendation |
|---|----------|----------|-------------|------|----------------|
| 1 | Info | Headers | `frame-ancestors`, `report-uri`/`report-to` and `sandbox` are ignored in a meta CSP, so framing cannot be prevented and violations are not reported. The site has no logins, forms or state-changing actions, so clickjacking gains nothing. | — | Accept. Revisit with a host or CDN that can send headers (also enables HSTS, TASK-013 note 3). |
| 2 | Info | Style injection | `style-src-attr 'unsafe-inline'` lets an injected `style` attribute restyle the page. It cannot load third-party resources (`img-src`/`font-src` are `'self'`), and no HTML injection sink exists (TASK-012 checks). | `lib/csp.ts` | Accept. Moving bar widths to CSS classes or custom properties set from JS would allow dropping it. |
| 3 | Info | CORS | GitHub Pages sends `Access-Control-Allow-Origin: *` on every response; it cannot be changed. All responses are public, identical for every visitor and carry no credentials (no cookies, sessions or auth), so cross-origin reads expose nothing that a direct request does not. The data is open data meant for reuse. | hosting | Accept. When the backend arrives, any endpoint using cookies or tokens must use an explicit origin allow-list, never `*` with credentials (recorded in PROJECT.md). |
| 4 | Info | Maintenance | A future script injected at runtime as inline code (e.g. an inline `next/script`) would be blocked in production but not in `next dev`. Inline scripts present in the HTML at build time are hashed automatically. | `docs/DEVELOPMENT.md` | Documented. Re-run the browser check when adding client-side features. |

## RLS Status

No database (Version 1).

## GDPR Notes

No change. The CSP also enforces the "no third-party scripts" rule: a third-party script or tracker added by mistake would be blocked.
