# Security Review: TASK-013 — Custom domain tinget.social

**Result**: PASS WITH NOTES
**Reviewed files**: `lib/site.ts`, `next.config.ts`, `.github/workflows/deploy.yml`, documentation

## Checks

- `https://tinget.social/` and every route checked (`/`, `/partier/`, `/sa-raknar-vi/`, a member page) return 200; an unknown path returns 404 ✔
- `https://www.tinget.social/` → 301 `https://tinget.social/` (no open redirect; fixed target) ✔
- The live HTML loads assets from `/_next/…` on the same origin; no `/tinget.social` sub-path or github.io host remains in the build or code ✔
- No `CNAME` file needed or added; the domain is held by the repository's Pages settings ✔
- No code paths, secrets or permissions changed ✔

## Notes

1. Certificate validity, the HTTP → HTTPS redirect and the `hpedlund.github.io/tinget.social/` redirect could not be verified from the review environment: outbound traffic there goes through a TLS-intercepting proxy that only allows HTTPS to approved hosts. Confirm in a browser that the padlock shows a Let's Encrypt certificate for `tinget.social` and that "Enforce HTTPS" is ticked in Settings → Pages.
2. **Domain takeover**: verify the domain for the GitHub account (Settings → Pages → Verified domains) so no other repository can claim `tinget.social` or its subdomains if Pages is ever switched off.
3. GitHub Pages sends no `Strict-Transport-Security` header; adding HSTS would need a different host or a CDN in front. Acceptable for a read-only site without logins or cookies.

## RLS Status

No database (Version 1).

## GDPR Notes

No change.
