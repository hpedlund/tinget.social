import path from "node:path";

import { readCached, writeFileAtomic } from "./cache";
import { fetchJson, parseJson } from "./client";
import { compare } from "./compare";
import { CURRENT_RIKSMOTE, RAW_DIR, riksmoteSlug } from "./config";
import { cleanText, htmlToBlocks } from "./html-text";
import { NORMALIZED_SCHEMA_VERSION } from "./normalized";
import { dokumentlistaSchema, utskottsforslagSchema, voteringDocumentSchema } from "./schemas";
import type { RiksmoteDocuments, RiksmoteVotes, Vote, VoteDocument } from "./types";

/** `dokumentlista` returns at most this many documents per page. */
const PAGE_SIZE = 200;
const MAX_PAGES = 50;

/** Omröstningar (e.g. the vote on a prime minister) have a date-like beteckning. */
const OMROSTNING = /^\d{4}-\d+$/;

export interface DocumentsFetchResult {
  data: RiksmoteDocuments;
  /** Requests made for proposal points (not served from the cache). */
  fetched: number;
  /** Beteckningar with votes whose document could not be identified. */
  unresolved: string[];
}

/**
 * Finds what every vote of a riksmöte is about: the betänkande (title,
 * Riksdagen's "Beslut i korthet" summary and the heading of each proposal
 * point) or, for omröstningar, the vote document's title.
 *
 * Topics never affect the attendance figures, so a document that cannot be
 * identified is reported and left out instead of aborting the run.
 */
export async function fetchRiksmoteDocuments(votes: RiksmoteVotes): Promise<DocumentsFetchResult> {
  const { riksmote } = votes;
  const listed = await fetchBetankanden(riksmote);

  const byBeteckning = new Map<string, Vote[]>();
  for (const vote of votes.votes) {
    const group = byBeteckning.get(vote.beteckning);
    if (group) group.push(vote);
    else byBeteckning.set(vote.beteckning, [vote]);
  }

  const documents: VoteDocument[] = [];
  const unresolved: string[] = [];
  let fetched = 0;
  for (const [beteckning, group] of [...byBeteckning].sort(([a], [b]) => compare(a, b))) {
    const candidates = OMROSTNING.test(beteckning) ? [] : (listed.get(beteckning) ?? []);
    if (candidates.length > 1) {
      console.warn(`  ${beteckning}: ${candidates.length} betänkanden share the beteckning — topic left out`);
      unresolved.push(beteckning);
      continue;
    }

    const listedDoc = candidates[0];
    if (listedDoc) {
      const wanted = new Set(group.map((vote) => vote.punkt));
      const { punkter, fromNetwork } = await getPunkter(listedDoc.dok_id, riksmote, beteckning, wanted);
      if (fromNetwork) fetched++;
      documents.push({
        beteckning,
        kind: "betankande",
        dokId: listedDoc.dok_id,
        title: cleanText(listedDoc.titel) || beteckning,
        heading: cleanText(listedDoc.notisrubrik ?? "") || null,
        summary: htmlToBlocks(listedDoc.notis ?? ""),
        punkter,
      });
      continue;
    }

    // Omröstningar, and anything missing from the list: the vote document names it.
    const detail = await getVoteDocument(group[0]!.id, riksmote);
    if (!detail || detail.beteckning !== beteckning) {
      console.warn(`  ${beteckning}: no document found — topic left out`);
      unresolved.push(beteckning);
      continue;
    }
    documents.push({
      beteckning,
      kind: OMROSTNING.test(beteckning) ? "omrostning" : "betankande",
      dokId: detail.dok_id,
      title: cleanText(detail.titel).replace(/^Omröstning:\s*/, "") || beteckning,
      heading: null,
      summary: [],
      punkter: [],
    });
  }

  return {
    data: {
      schemaVersion: NORMALIZED_SCHEMA_VERSION,
      riksmote,
      fetchedAt: new Date().toISOString(),
      documents,
    },
    fetched,
    unresolved,
  };
}

type ListedDocument = ReturnType<typeof dokumentlistaSchema.parse>["dokumentlista"]["dokument"][number];

/** Every betänkande of the riksmöte, by beteckning. Small: re-fetched on every run. */
async function fetchBetankanden(riksmote: string): Promise<Map<string, ListedDocument[]>> {
  const byId = new Map<string, ListedDocument>();
  let expected = 0;
  for (let page = 1; page <= MAX_PAGES; page++) {
    const { data, raw } = await fetchJson(
      "/dokumentlista/",
      { doktyp: "bet", rm: riksmote, sz: String(PAGE_SIZE), p: String(page), sort: "datum", sortorder: "asc" },
      dokumentlistaSchema,
    );
    await writeFileAtomic(
      path.join(RAW_DIR, "dokumentlista", `bet-${riksmoteSlug(riksmote)}-${page}.json`),
      raw,
    );
    const list = data.dokumentlista;
    expected = list["@traffar"];
    for (const doc of list.dokument) {
      // Unknown query parameters are silently ignored by the API: check the filters held.
      if (doc.rm !== riksmote || doc.doktyp !== "bet") {
        throw new Error(`dokumentlista bet ${riksmote}: got ${doc.doktyp} ${doc.rm}:${doc.beteckning}`);
      }
      byId.set(doc.dok_id, doc);
    }
    if (page >= list["@sidor"]) break;
  }
  if (byId.size !== expected) {
    console.warn(`  dokumentlista bet ${riksmote}: ${byId.size} of ${expected} documents returned`);
  }

  const byBeteckning = new Map<string, ListedDocument[]>();
  for (const doc of byId.values()) {
    const group = byBeteckning.get(doc.beteckning);
    if (group) group.push(doc);
    else byBeteckning.set(doc.beteckning, [doc]);
  }
  return byBeteckning;
}

/**
 * Headings of a betänkande's proposal points, from `/utskottsforslag/{dok_id}`.
 * Cached on disk; in the current riksmöte fetched again when a voted point is
 * missing (the decision was not yet recorded when it was cached).
 */
async function getPunkter(
  dokId: string,
  riksmote: string,
  beteckning: string,
  wanted: ReadonlySet<number>,
): Promise<{ punkter: VoteDocument["punkter"]; fromNetwork: boolean }> {
  const cachePath = path.join(RAW_DIR, "utskottsforslag", `${dokId}.json`);
  const source = `/utskottsforslag/${dokId}.json`;

  const parse = (body: Uint8Array) => {
    const { utskottsforslag } = parseJson(body, utskottsforslagSchema, source);
    const doc = utskottsforslag.dokument;
    if (doc.rm !== riksmote || doc.beteckning !== beteckning) {
      throw new Error(`${source}: expected ${riksmote}:${beteckning}, got ${doc.rm}:${doc.beteckning}`);
    }
    const punkter = new Map<number, string>();
    for (const point of utskottsforslag.dokutskottsforslag?.utskottsforslag ?? []) {
      const rubrik = cleanText(point.rubrik ?? "");
      if (rubrik && !punkter.has(Number(point.punkt))) punkter.set(Number(point.punkt), rubrik);
    }
    return punkter;
  };

  const cached = await readCached(cachePath);
  let punkter = cached ? parse(cached) : null;
  let fromNetwork = false;
  const stale =
    riksmote === CURRENT_RIKSMOTE && punkter !== null && [...wanted].some((punkt) => !punkter!.has(punkt));
  if (!punkter || stale) {
    const { raw } = await fetchJson(source, {}, utskottsforslagSchema);
    await writeFileAtomic(cachePath, raw);
    punkter = parse(raw);
    fromNetwork = true;
  }

  return {
    punkter: [...punkter]
      .filter(([punkt]) => wanted.has(punkt))
      .sort(([a], [b]) => a - b)
      .map(([punkt, rubrik]) => ({ punkt, rubrik })),
    fromNetwork,
  };
}

/** The document of `/votering/{id}/json` (shared cache with the vote fetch). */
async function getVoteDocument(id: string, riksmote: string) {
  const cachePath = path.join(RAW_DIR, "votering", `${id}.json`);
  const cached = await readCached(cachePath);
  const detail = cached
    ? parseJson(cached, voteringDocumentSchema, cachePath)
    : await fetchJson(`/votering/${id}/json`, {}, voteringDocumentSchema).then(async ({ data, raw }) => {
        await writeFileAtomic(cachePath, raw);
        return data;
      });
  const doc = detail.votering.dokument;
  return doc.rm === riksmote ? doc : null;
}
