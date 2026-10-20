/**
 * npm run data:check
 *
 * Reads every file in data/ through lib/data/ — exactly as the site build
 * does — and checks that the files agree with each other. Exit code 1 on
 * the first problem.
 */
import { readdir } from "node:fs/promises";
import path from "node:path";

import { DATA_DIR, getAllMemberIds, getMember, getParties, getPeriods, getRanking } from "@/lib/data";

async function main() {
  const periods = await getPeriods();
  const memberIds = await getAllMemberIds();
  const known = new Set(memberIds);

  for (const period of periods) {
    const ranking = await getRanking(period.id);
    await getParties(period.id);
    for (const row of [...ranking.ranked, ...ranking.belowThreshold]) {
      if (!known.has(row.memberId)) {
        throw new Error(`ranking/${period.id}.json lists ${row.memberId}, who has no member file`);
      }
    }
  }

  for (const id of memberIds) {
    if (!(await getMember(id))) throw new Error(`Member ${id} is in members.json but cannot be read`);
  }

  const files = (await readdir(path.join(DATA_DIR, "members"))).filter((f) => f.endsWith(".json"));
  const stray = files.filter((f) => !known.has(path.basename(f, ".json")));
  if (stray.length > 0) throw new Error(`members/ has files not in members.json: ${stray.join(", ")}`);

  console.log(`data/ OK: ${periods.length} periods, ${memberIds.length} members`);
}

main().catch((error: unknown) => {
  console.error(`data:check failed.\n${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
