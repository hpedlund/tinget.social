/**
 * Runs after `next build` (npm run build).
 *
 * Writes a Content-Security-Policy meta tag into every HTML file in out/,
 * with hashes of that page's inline scripts. Exit code 1 if any page cannot
 * be given a policy, so no page is published without one.
 */
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { addPolicy } from "@/lib/csp";

const OUT_DIR = path.join(process.cwd(), "out");

async function main() {
  const entries = await readdir(OUT_DIR, { recursive: true, withFileTypes: true });
  const pages = entries
    .filter((e) => e.isFile() && e.name.endsWith(".html"))
    .map((e) => path.join(e.parentPath, e.name));
  if (pages.length === 0) throw new Error(`No HTML files in ${OUT_DIR}; run next build first`);

  for (const page of pages) {
    try {
      await writeFile(page, addPolicy(await readFile(page, "utf8")));
    } catch (error) {
      throw new Error(`${path.relative(OUT_DIR, page)}: ${(error as Error).message}`);
    }
  }
  console.log(`Content-Security-Policy added to ${pages.length} pages`);
}

main().catch((error: unknown) => {
  console.error(`csp failed.\n${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
