/**
 * npm run data:compute
 *
 * Reads the validated cache written by `npm run data:fetch`, calculates
 * attendance per period and writes the data contract, including the upcoming
 * decisions, to data/ (documented in data/README.md). Output is deterministic. Every file is validated before
 * data/ is touched; on any error nothing is written and the exit code is 1.
 */
import { mkdir, rename, rm } from "node:fs/promises";
import path from "node:path";

import { DATA_DIR } from "@/lib/data";
import { buildAgendaFile } from "@/lib/pipeline/agenda";
import { buildDataFiles } from "@/lib/pipeline/build";
import { DEFAULT_PERIOD_ID, PERIODS } from "@/lib/pipeline/periods";
import { readAgenda, readMembers, readRiksmoteVotes, writeFileAtomic } from "@/lib/riksdagen/cache";
import { CACHE_DIR, RIKSMOTEN } from "@/lib/riksdagen/config";

/** Everything in data/ the pipeline owns; anything else (README.md) is left alone. */
const MANAGED = ["agenda.json", "meta.json", "parties.json", "members.json", "ranking", "members", "votes"];

async function main() {
  console.log(`Computing data/ from ${CACHE_DIR}`);

  const votes = await Promise.all(RIKSMOTEN.map((rm) => readRiksmoteVotes(rm)));
  const members = await readMembers();
  const files = [
    ...buildDataFiles({
      votes,
      members,
      periods: PERIODS,
      defaultPeriodId: DEFAULT_PERIOD_ID,
    }),
    buildAgendaFile(await readAgenda()),
  ];

  const staging = path.join(CACHE_DIR, "..", "compute");
  await rm(staging, { recursive: true, force: true });
  for (const { path: relative, content } of files) {
    await writeFileAtomic(path.join(staging, relative), content);
  }
  // Directories exist even when empty, so the swap below never half-completes.
  for (const dir of ["ranking", "members", "votes"]) {
    await mkdir(path.join(staging, dir), { recursive: true });
  }

  await mkdir(DATA_DIR, { recursive: true });
  for (const entry of MANAGED) {
    await rm(path.join(DATA_DIR, entry), { recursive: true, force: true });
    await rename(path.join(staging, entry), path.join(DATA_DIR, entry));
  }
  await rm(staging, { recursive: true, force: true });

  const bytes = files.reduce((sum, f) => sum + Buffer.byteLength(f.content), 0);
  console.log(`Wrote ${files.length} files (${(bytes / 1024 / 1024).toFixed(1)} MB) to ${DATA_DIR}`);
}

main().catch((error: unknown) => {
  console.error(
    `\ndata:compute failed — data/ was not changed.\n${error instanceof Error ? error.message : String(error)}`,
  );
  process.exit(1);
});
