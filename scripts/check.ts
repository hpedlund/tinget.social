/**
 * npm run data:check
 *
 * Reads every file in data/ through lib/data/ — exactly as the site build
 * does — and checks that the files agree with each other (including every
 * member's ballot strings against the vote files). Exit code 1 on
 * the first problem.
 */
import { readdir } from "node:fs/promises";
import path from "node:path";

import {
  DATA_DIR,
  getAllMemberIds,
  getDocuments,
  getParties,
  getPeriods,
  getRanking,
  getRiksmoten,
  getVotes,
} from "@/lib/data";
import { loadMemberProfile } from "@/lib/member/load";
import { loadPartyOverview } from "@/lib/party-overview/load";
import { getDocumentPageParams } from "@/lib/votes/load";

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

  await loadPartyOverview();

  // Building the profile also checks that every member file agrees with the rankings.
  for (const id of memberIds) {
    if (!(await loadMemberProfile(id))) throw new Error(`Member ${id} is in members.json but cannot be read`);
  }

  const files = (await readdir(path.join(DATA_DIR, "members"))).filter((f) => f.endsWith(".json"));
  const stray = files.filter((f) => !known.has(path.basename(f, ".json")));
  if (stray.length > 0) throw new Error(`members/ has files not in members.json: ${stray.join(", ")}`);

  // Every document is about votes in the data; also checks that URL slugs are unique.
  const pages = await getDocumentPageParams();
  let withoutDocument = 0;
  for (const riksmote of await getRiksmoten()) {
    const votes = await getVotes(riksmote);
    const voted = new Set(votes.map((v) => v.beteckning));
    const documents = await getDocuments(riksmote);
    for (const doc of documents) {
      if (!voted.has(doc.beteckning)) throw new Error(`documents/${riksmote}: ${doc.beteckning} has no votes`);
    }
    const known = new Set(documents.map((d) => d.beteckning));
    withoutDocument += votes.filter((v) => !known.has(v.beteckning)).length;
  }
  if (withoutDocument > 0) console.warn(`  ${withoutDocument} votes have no document (no topic shown)`);

  console.log(
    `data/ OK: ${periods.length} periods, ${memberIds.length} members, ${pages.length} document pages`,
  );
}

main().catch((error: unknown) => {
  console.error(`data:check failed.\n${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
