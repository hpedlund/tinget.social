import path from "node:path";

import { unzipSync } from "fflate";

import { readCached, writeFileAtomic } from "./cache";
import { fetchBinary, fetchJson, parseJson } from "./client";
import { compare } from "./compare";
import {
  MAX_UNZIPPED_BYTES,
  RAW_DIR,
  VOTERINGLISTA_ROW_CAP,
  riksmoteCompact,
  riksmoteSlug,
} from "./config";
import { NORMALIZED_SCHEMA_VERSION } from "./normalized";
import {
  datasetVoteFileSchema,
  voteringDetailSchema,
  voteringlistaByVoteSchema,
  voteringlistaSchema,
  type RawVoteRow,
} from "./schemas";
import type { Ballot, RiksmoteVotes, Rost, Vote } from "./types";

type RostCounts = Record<Rost, number>;

export interface ExcludedVote {
  id: string;
  beteckning: string;
  punkt: number;
  date: string;
  rost: RostCounts;
}

export interface VotesFetchResult {
  data: RiksmoteVotes;
  /** Votes taken from the bulk dataset. */
  fromDataset: number;
  /** Votes fetched one by one from the API (missing from the dataset, or no dataset). */
  fromApi: number;
  /** Votes whose date was missing in the source and looked up separately. */
  datesLookedUp: number;
  /** Dataset votes that are not in Riksdagen's vote index (voided or re-held votes). */
  excluded: ExcludedVote[];
}

/**
 * Downloads and validates every vote of one riksmöte.
 *
 * The vote index (`voteringlista?gruppering=votering_id`) decides which votes
 * exist. Rows come from the bulk dataset when Riksdagen publishes one, and
 * from the per-vote API for votes the dataset lacks (or when there is no
 * dataset yet). Every vote's counts must match the index.
 */
export async function fetchRiksmoteVotes(riksmote: string): Promise<VotesFetchResult> {
  const index = await fetchVoteIndex(riksmote);
  const dataset = await fetchDatasetVotes(riksmote);
  if (!dataset) console.log(`  no dataset for ${riksmote} yet — using the per-vote API`);

  const votes: Vote[] = [];
  let fromApi = 0;
  let datesLookedUp = 0;
  for (const [id, expected] of index) {
    let vote = dataset?.get(id);
    if (vote) {
      if (!countsMatch(vote.ballots, expected)) {
        throw new Error(
          `Vote ${id}: dataset counts ${JSON.stringify(tallyRost(vote.ballots))} ` +
            `differ from the vote index ${JSON.stringify(expected)}`,
        );
      }
    } else {
      vote = await fetchVoteFromApi(id, riksmote, expected);
      fromApi++;
    }
    if (vote.date === "") {
      // Omröstningar have `datum: null` in their rows; the vote document has the date.
      const detail = await getVoteDetail(id, riksmote);
      vote.date = toIsoDate(detail.votering.dokument.datum);
      datesLookedUp++;
    }
    votes.push(vote);
  }

  const excluded: ExcludedVote[] = [...(dataset?.values() ?? [])]
    .filter((vote) => !index.has(vote.id))
    .map((vote) => ({
      id: vote.id,
      beteckning: vote.beteckning,
      punkt: vote.punkt,
      date: vote.date,
      rost: tallyRost(vote.ballots),
    }));
  for (const vote of excluded) {
    console.log(`  excluded ${vote.beteckning} p${vote.punkt} ${vote.date}: not in the vote index`);
  }

  return {
    data: finish(riksmote, dataset ? "dataset" : "api", votes),
    fromDataset: votes.length - fromApi,
    fromApi,
    datesLookedUp,
    excluded,
  };
}

// ---------------------------------------------------------------------------
// Vote index

async function fetchVoteIndex(riksmote: string): Promise<Map<string, RostCounts>> {
  const { data, raw } = await fetchJson(
    "/voteringlista/",
    { rm: riksmote, gruppering: "votering_id", sz: String(VOTERINGLISTA_ROW_CAP) },
    voteringlistaByVoteSchema,
  );
  assertVoteringlista(data.voteringlista, [`rm=${riksmote}`], `vote index ${riksmote}`);
  await writeFileAtomic(
    path.join(RAW_DIR, "voteringlista", `${riksmoteSlug(riksmote)}-by-vote.json`),
    raw,
  );

  const index = new Map<string, RostCounts>();
  for (const row of data.voteringlista.votering) {
    const id = row.votering_id.toUpperCase();
    if (index.has(id)) throw new Error(`vote index ${riksmote}: ${id} appears twice`);
    index.set(id, { Ja: row.Ja, Nej: row.Nej, Avstår: row.Avstår, Frånvarande: row.Frånvarande });
  }
  return index;
}

// ---------------------------------------------------------------------------
// Bulk dataset

async function fetchDatasetVotes(riksmote: string): Promise<Map<string, Vote> | null> {
  const fileName = `votering-${riksmoteCompact(riksmote)}.json.zip`;
  const zip = await fetchBinary(`/dataset/votering/${fileName}`);
  if (zip === null) return null;
  await writeFileAtomic(path.join(RAW_DIR, "dataset", fileName), zip);
  console.log(`  downloaded ${fileName} (${(zip.byteLength / 1e6).toFixed(1)} MB)`);

  let unzippedBytes = 0;
  const files = unzipSync(zip, {
    filter: (entry) => {
      // Some names contain stray non-ASCII bytes; they are only used in error messages.
      if (!entry.name.endsWith(".json")) {
        throw new Error(`Unexpected entry ${JSON.stringify(entry.name)} in ${fileName}`);
      }
      unzippedBytes += entry.originalSize;
      if (unzippedBytes > MAX_UNZIPPED_BYTES) {
        throw new Error(`${fileName} unpacks to more than ${MAX_UNZIPPED_BYTES} bytes`);
      }
      return true;
    },
  });

  const votes = new Map<string, Vote>();
  for (const [name, bytes] of Object.entries(files)) {
    const source = `${fileName}/${JSON.stringify(name)}`;
    const { dokvotering } = parseJson(bytes, datasetVoteFileSchema, source);
    const vote = toVote(dokvotering.votering, riksmote, source);
    if (votes.has(vote.id)) throw new Error(`${fileName}: vote ${vote.id} appears twice`);
    votes.set(vote.id, vote);
  }
  if (votes.size === 0) throw new Error(`${fileName} contains no votes`);
  return votes;
}

// ---------------------------------------------------------------------------
// Per-vote API

async function fetchVoteFromApi(id: string, riksmote: string, expected: RostCounts): Promise<Vote> {
  // A cached response that no longer matches the index is fetched again once.
  for (const fresh of [false, true]) {
    const detail = await getVoteDetail(id, riksmote, fresh);
    const { dokument, dokvotering } = detail.votering;
    const vote =
      dokvotering && dokvotering.votering.length > 0
        ? toVote(dokvotering.votering, riksmote, `/votering/${id}`)
        : await fetchOmrostning(id, riksmote, dokument.beteckning, dokument.datum);
    if (countsMatch(vote.ballots, expected)) return vote;
    if (fresh) {
      throw new Error(
        `Vote ${id}: API counts ${JSON.stringify(tallyRost(vote.ballots))} ` +
          `differ from the vote index ${JSON.stringify(expected)}`,
      );
    }
  }
  throw new Error("unreachable");
}

/** `/votering/{id}/json`, cached on disk: a vote does not change once held. */
async function getVoteDetail(id: string, riksmote: string, fresh = false) {
  const cachePath = path.join(RAW_DIR, "votering", `${id}.json`);
  const cached = fresh ? null : await readCached(cachePath);
  const detail = cached
    ? parseJson(cached, voteringDetailSchema, cachePath)
    : await fetchJson(`/votering/${id}/json`, {}, voteringDetailSchema).then(async ({ data, raw }) => {
        await writeFileAtomic(cachePath, raw);
        return data;
      });
  if (detail.votering.dokument.rm !== riksmote) {
    throw new Error(`/votering/${id}: expected rm ${riksmote}, got ${detail.votering.dokument.rm}`);
  }
  return detail;
}

/** Omröstningar have no rows in `/votering/{id}` — read them from `voteringlista`. */
async function fetchOmrostning(
  id: string,
  riksmote: string,
  beteckning: string,
  datum: string,
): Promise<Vote> {
  const { data } = await fetchJson(
    "/voteringlista/",
    { rm: riksmote, bet: beteckning, sz: String(VOTERINGLISTA_ROW_CAP) },
    voteringlistaSchema,
  );
  assertVoteringlista(data.voteringlista, [`rm=${riksmote}`, `bet=${beteckning}`], `bet ${beteckning}`);
  const rows = data.voteringlista.votering
    .filter((row) => row.votering_id.toUpperCase() === id)
    .map((row): RawVoteRow => ({ ...row, datum }));
  if (rows.length === 0) throw new Error(`No voteringlista rows for vote ${id} (bet ${beteckning})`);
  return toVote(rows, riksmote, `voteringlista bet=${beteckning}`);
}

function assertVoteringlista(
  list: { "@villkor": string; "@antal": number; votering: unknown[] },
  expectedFilters: string[],
  what: string,
) {
  // Unknown or misspelled parameters are silently ignored by the API.
  for (const filter of expectedFilters) {
    if (!list["@villkor"].includes(filter)) {
      throw new Error(`${what}: filter "${filter}" not applied (villkor: "${list["@villkor"]}")`);
    }
  }
  if (list["@antal"] >= VOTERINGLISTA_ROW_CAP || list.votering.length >= VOTERINGLISTA_ROW_CAP) {
    throw new Error(`${what}: hit the ${VOTERINGLISTA_ROW_CAP}-row cap — result would be truncated`);
  }
  if (list.votering.length !== list["@antal"]) {
    throw new Error(`${what}: @antal is ${list["@antal"]} but ${list.votering.length} rows returned`);
  }
}

function tallyRost(ballots: Ballot[]): RostCounts {
  const counts: RostCounts = { Ja: 0, Nej: 0, Avstår: 0, Frånvarande: 0 };
  for (const ballot of ballots) counts[ballot.rost]++;
  return counts;
}

function countsMatch(ballots: Ballot[], expected: RostCounts): boolean {
  const actual = tallyRost(ballots);
  return (Object.keys(actual) as Rost[]).every((key) => actual[key] === expected[key]);
}

// ---------------------------------------------------------------------------
// Normalisation

/** Turns the rows of one votering into a Vote; `date` is "" when unknown. */
function toVote(rows: RawVoteRow[], riksmote: string, source: string): Vote {
  const first = rows[0];
  if (!first) throw new Error(`${source}: no rows`);
  const seen = new Set<string>();
  for (const row of rows) {
    for (const key of ["votering_id", "rm", "beteckning", "punkt", "avser", "datum"] as const) {
      if (row[key] !== first[key]) {
        throw new Error(`${source}: rows disagree on ${key} ("${first[key]}" vs "${row[key]}")`);
      }
    }
    if (seen.has(row.intressent_id)) {
      throw new Error(`${source}: member ${row.intressent_id} appears twice`);
    }
    seen.add(row.intressent_id);
  }
  if (first.rm !== riksmote) throw new Error(`${source}: expected rm ${riksmote}, got ${first.rm}`);

  return {
    id: first.votering_id.toUpperCase(),
    riksmote,
    beteckning: first.beteckning,
    punkt: Number(first.punkt),
    avser: first.avser,
    date: first.datum ? toIsoDate(first.datum) : "",
    ballots: rows
      .map((row) => ({
        memberId: row.intressent_id,
        name: row.namn,
        party: row.parti,
        constituency: row.valkrets,
        rost: row.rost,
      }))
      .sort((a, b) => compare(a.memberId, b.memberId)),
  };
}

function finish(riksmote: string, source: "dataset" | "api", votes: Vote[]): RiksmoteVotes {
  if (votes.length === 0) throw new Error(`${riksmote}: no votes`);
  for (const vote of votes) {
    if (vote.date === "") throw new Error(`${riksmote}: vote ${vote.id} has no date`);
  }
  votes.sort(
    (a, b) =>
      compare(a.date, b.date) ||
      compare(a.beteckning, b.beteckning) ||
      a.punkt - b.punkt ||
      compare(a.id, b.id),
  );
  return {
    schemaVersion: NORMALIZED_SCHEMA_VERSION,
    riksmote,
    source,
    fetchedAt: new Date().toISOString(),
    votes,
  };
}

function toIsoDate(value: string): string {
  return value.slice(0, 10);
}
