import { createHash } from "node:crypto";

/**
 * Content-Security-Policy for the static export. GitHub Pages cannot send
 * headers, so the policy is a meta tag written into each page after
 * `next build` (scripts/csp.ts), with hashes of that page's inline scripts.
 * See docs/specs/TASK-014.md for why each directive is set.
 */

const CHARSET_META = '<meta charSet="utf-8"/>';

const SCRIPT_RE = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;

/** Contents of every inline `<script>` (one without a `src` attribute). */
export function inlineScripts(html: string): string[] {
  const scripts: string[] = [];
  for (const [, attributes = "", source = ""] of html.matchAll(SCRIPT_RE)) {
    if (!/\ssrc\s*=/i.test(attributes)) scripts.push(source);
  }
  return scripts;
}

/** CSP hash source for a script, over its UTF-8 bytes as the browser hashes them. */
export function scriptHash(source: string): string {
  return `'sha256-${createHash("sha256").update(source, "utf8").digest("base64")}'`;
}

export function buildPolicy(scriptHashes: Iterable<string>): string {
  const hashes = [...new Set(scriptHashes)].sort();
  return [
    "default-src 'self'",
    ["script-src 'self'", ...hashes].join(" "),
    "style-src 'self' 'unsafe-inline'",
    "style-src-elem 'self'",
    "style-src-attr 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self'",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'none'",
    "upgrade-insecure-requests",
  ].join("; ");
}

/** The page with its CSP meta tag inserted right after the charset declaration. */
export function addPolicy(html: string): string {
  if (/<meta\s+http-equiv="Content-Security-Policy"/i.test(html)) {
    throw new Error("Page already has a Content-Security-Policy meta tag");
  }
  const at = html.indexOf(CHARSET_META);
  if (at === -1) throw new Error(`Page has no ${CHARSET_META} to place the policy after`);

  const policy = buildPolicy(inlineScripts(html).map(scriptHash));
  const meta = `<meta http-equiv="Content-Security-Policy" content="${policy}"/>`;
  const end = at + CHARSET_META.length;
  return html.slice(0, end) + meta + html.slice(end);
}
