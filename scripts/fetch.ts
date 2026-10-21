/**
 * npm run data:fetch [-- --refresh]
 *
 * Downloads members and every vote row for the configured riksmöten from
 * data.riksdagen.se, validates everything with zod and writes raw downloads
 * plus normalised files to .cache/riksdagen/, including what each vote is
 * about (betänkande titles, summaries and proposal-point headings). Completed riksmöten are served
 * from the cache unless --refresh is given. Any unexpected data aborts the
 * run with exit code 1.
 */
import {
  documentsPath,
  MANIFEST_PATH,
  MEMBERS_PATH,
  OBSERVED_PATH,
  readManifest,
  readRiksmoteVotes,
  votesPath,
  writeJson,
} from "@/lib/riksdagen/cache";
import { CACHE_DIR, CURRENT_RIKSMOTE, RIKSMOTEN } from "@/lib/riksdagen/config";
import { fetchRiksmoteDocuments } from "@/lib/riksdagen/documents";
import { fetchMembers } from "@/lib/riksdagen/members";
import type { Members, RiksmoteVotes } from "@/lib/riksdagen/types";
import { fetchRiksmoteVotes } from "@/lib/riksdagen/votes";

type Counts = Record<string, number>;

function tally(values: Iterable<string>): Counts {
  const counts: Counts = {};
  for (const value of values) counts[value] = (counts[value] ?? 0) + 1;
  return Object.fromEntries(Object.entries(counts).sort(([, a], [, b]) => b - a));
}

async function loadCompleted(riksmote: string, refresh: boolean): Promise<RiksmoteVotes | null> {
  if (refresh || riksmote === CURRENT_RIKSMOTE) return null;
  const manifest = await readManifest();
  if (!manifest.riksmoten[riksmote]?.complete) return null;
  try {
    return await readRiksmoteVotes(riksmote);
  } catch (error) {
    console.warn(`  cache for ${riksmote} unusable, re-fetching: ${String(error)}`);
    return null;
  }
}

function observeVotes(data: RiksmoteVotes, extra: Record<string, unknown>) {
  const ballots = data.votes.flatMap((vote) => vote.ballots);
  const perVote = data.votes.map((vote) => vote.ballots.length);
  const dates = data.votes.map((vote) => vote.date);
  return {
    source: data.source,
    votes: data.votes.length,
    ballots: ballots.length,
    ballotsPerVote: { min: Math.min(...perVote), max: Math.max(...perVote) },
    dateRange: { first: dates[0] ?? null, last: dates.at(-1) ?? null },
    members: new Set(ballots.map((ballot) => ballot.memberId)).size,
    rost: tally(ballots.map((ballot) => ballot.rost)),
    avser: tally(data.votes.map((vote) => vote.avser)),
    party: tally(ballots.map((ballot) => ballot.party)),
    ...extra,
  };
}

function observeMembers(data: Members) {
  const assignments = data.members.flatMap((member) => member.chamberAssignments);
  return {
    members: data.members.length,
    status: tally(data.members.map((member) => member.status)),
    gender: tally(data.members.map((member) => member.gender)),
    chamberRole: tally(assignments.map((assignment) => assignment.role)),
    chamberStatus: tally(assignments.map((assignment) => assignment.status)),
  };
}

async function main() {
  const refresh = process.argv.includes("--refresh");
  console.log(`Fetching Riksdagen data into ${CACHE_DIR}${refresh ? " (refresh)" : ""}`);

  const observed: Record<string, unknown> = {};
  const memberIds = new Set<string>();

  for (const riksmote of RIKSMOTEN) {
    console.log(`\n${riksmote}`);
    let data = await loadCompleted(riksmote, refresh);
    if (data) {
      console.log(`  using cache (${data.votes.length} votes)`);
      observed[riksmote] = observeVotes(data, { fromCache: true });
    } else {
      const result = await fetchRiksmoteVotes(riksmote);
      data = result.data;
      await writeJson(votesPath(riksmote), data);

      const manifest = await readManifest();
      manifest.riksmoten[riksmote] = {
        source: data.source,
        complete: riksmote !== CURRENT_RIKSMOTE,
        fetchedAt: data.fetchedAt,
        votes: data.votes.length,
        ballots: data.votes.reduce((sum, vote) => sum + vote.ballots.length, 0),
      };
      await writeJson(MANIFEST_PATH, manifest);

      console.log(
        `  ${data.votes.length} votes (${result.fromDataset} from dataset, ${result.fromApi} from API)`,
      );
      observed[riksmote] = observeVotes(data, {
        fromDataset: result.fromDataset,
        fromApi: result.fromApi,
        datesLookedUp: result.datesLookedUp,
        excluded: result.excluded,
      });
    }
    for (const vote of data.votes) {
      for (const ballot of vote.ballots) memberIds.add(ballot.memberId);
    }

    const documents = await fetchRiksmoteDocuments(data);
    await writeJson(documentsPath(riksmote), documents.data);
    const docs = documents.data.documents;
    console.log(
      `  ${docs.length} documents for ${new Set(data.votes.map((v) => v.beteckning)).size} beteckningar ` +
        `(${documents.fetched} fetched, ${docs.filter((d) => d.summary.length === 0).length} without summary)`,
    );
    (observed[riksmote] as Record<string, unknown>).documents = {
      documents: docs.length,
      kind: tally(docs.map((d) => d.kind)),
      withoutSummary: docs.filter((d) => d.summary.length === 0).map((d) => d.beteckning),
      unresolved: documents.unresolved,
    };
  }

  console.log("\nMembers");
  const members = await fetchMembers(memberIds);
  await writeJson(MEMBERS_PATH, members);
  console.log(`  ${members.members.length} members (everyone who voted in ${RIKSMOTEN.join(", ")})`);
  observed.members = observeMembers(members);

  await writeJson(OBSERVED_PATH, { generatedAt: new Date().toISOString(), ...observed });
  console.log(`\nDone. Observed values: ${OBSERVED_PATH}`);
}

main().catch((error: unknown) => {
  console.error(`\ndata:fetch failed — nothing further was written.\n${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
