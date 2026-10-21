import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";

import { addPolicy, buildPolicy, inlineScripts, scriptHash } from "./csp";

const page = (body: string) =>
  `<!DOCTYPE html><html lang="sv"><head><meta charSet="utf-8"/><script src="/_next/a.js" async=""></script></head><body>${body}</body></html>`;

describe("inlineScripts", () => {
  it("returns inline scripts and skips external ones", () => {
    const html = page('<script>self.__next_f.push([1])</script><script id="_R_">a()</script>');
    expect(inlineScripts(html)).toEqual(["self.__next_f.push([1])", "a()"]);
  });

  it("keeps whitespace and multi-line content exactly", () => {
    expect(inlineScripts("<script>\n  x = 1;\n</script>")).toEqual(["\n  x = 1;\n"]);
  });
});

describe("scriptHash", () => {
  it("hashes the UTF-8 bytes", () => {
    const source = 'push("Närvaro — åäö")';
    const expected = createHash("sha256").update(Buffer.from(source, "utf8")).digest("base64");
    expect(scriptHash(source)).toBe(`'sha256-${expected}'`);
  });

  it("matches a known value", () => {
    expect(scriptHash("")).toBe("'sha256-47DEQpj8HBSa+/TImW+5JCeuQeRkm5NMpJWZG3hSuFU='");
  });
});

describe("buildPolicy", () => {
  it("allows scripts only from self and the given hashes, de-duplicated and sorted", () => {
    const policy = buildPolicy(["'sha256-b'", "'sha256-a'", "'sha256-b'"]);
    expect(policy).toContain("script-src 'self' 'sha256-a' 'sha256-b';");
    expect(policy).not.toMatch(/script-src[^;]*unsafe/);
  });

  it("locks down everything else to the site's own origin", () => {
    const policy = buildPolicy([]);
    for (const directive of [
      "default-src 'self'",
      "style-src-elem 'self'",
      "connect-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'none'",
    ]) {
      expect(policy).toContain(directive);
    }
  });
});

describe("addPolicy", () => {
  it("inserts the meta tag after the charset, before any script", () => {
    const html = addPolicy(page("<script>a()</script>"));
    const meta = html.indexOf('<meta http-equiv="Content-Security-Policy"');
    expect(meta).toBe(html.indexOf('<meta charSet="utf-8"/>') + '<meta charSet="utf-8"/>'.length);
    expect(meta).toBeLessThan(html.indexOf("<script"));
    expect(html).toContain(scriptHash("a()"));
  });

  it("refuses a page without a charset meta tag", () => {
    expect(() => addPolicy("<html><head></head></html>")).toThrow(/charSet/);
  });

  it("refuses to add a second policy", () => {
    expect(() => addPolicy(addPolicy(page("")))).toThrow(/already/);
  });
});
