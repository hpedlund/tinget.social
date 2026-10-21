/**
 * Data access layer — the only way pages read data. Version 1 reads the
 * generated JSON in data/ at build time and validates every file with zod,
 * so a missing or invalid file fails `next build`. Later this module can be
 * re-implemented against Supabase without changing its signatures.
 *
 * Server-only (node:fs): call from Server Components and generateStaticParams.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";

import type { z } from "zod";

import { riksmoteSlug } from "@/lib/riksdagen/config";
import { formatZodError } from "@/lib/riksdagen/errors";

import {
  beteckningSchema,
  documentsFileSchema,
  memberFileSchema,
  memberIdSchema,
  membersIndexFileSchema,
  metaFileSchema,
  partiesFileSchema,
  rankingFileSchema,
  votesFileSchema,
} from "./schemas";
import type {
  DocumentEntry,
  MemberDetail,
  MemberIndexEntry,
  Meta,
  PartyEntry,
  Period,
  Ranking,
  VoteCounts,
  VoteEntry,
} from "./types";

export type * from "./types";

export const DATA_DIR = path.join(process.cwd(), "data");

export function createDataSource(dir: string) {
  const memo = new Map<string, Promise<unknown>>();

  /** Reads and validates one file, once per process. */
  function load<T>(relativePath: string, schema: z.ZodType<T>): Promise<T> {
    let pending = memo.get(relativePath) as Promise<T> | undefined;
    if (!pending) {
      pending = readValidated(path.join(dir, relativePath), schema);
      memo.set(relativePath, pending);
    }
    return pending;
  }

  const getMeta = (): Promise<Meta> => load("meta.json", metaFileSchema);

  async function getPeriod(periodId: string): Promise<Period> {
    const period = (await getMeta()).periods.find((p) => p.id === periodId);
    if (!period) throw new Error(`Unknown period: ${periodId}`);
    return period;
  }

  async function getMembers(): Promise<MemberIndexEntry[]> {
    return (await load("members.json", membersIndexFileSchema)).members;
  }

  async function getRiksmoten(): Promise<string[]> {
    return [...new Set((await getMeta()).periods.flatMap((p) => p.riksmoten))].sort();
  }

  async function assertRiksmote(riksmote: string): Promise<void> {
    if (!(await getRiksmoten()).includes(riksmote)) throw new Error(`Unknown riksmöte: ${riksmote}`);
  }

  /** Votes of a riksmöte by date — the order of the members' ballot strings. */
  async function getVotes(riksmote: string): Promise<VoteEntry[]> {
    await assertRiksmote(riksmote);
    return (await load(`votes/${riksmoteSlug(riksmote)}.json`, votesFileSchema)).votes;
  }

  /** What the votes of a riksmöte are about, by beteckning. */
  async function getDocuments(riksmote: string): Promise<DocumentEntry[]> {
    await assertRiksmote(riksmote);
    const file = await load(`documents/${riksmoteSlug(riksmote)}.json`, documentsFileSchema);
    if (file.riksmote !== riksmote) throw new Error(`documents for ${riksmote} contain ${file.riksmote}`);
    return file.documents;
  }

  return {
    getMeta,

    /** The full term first, then each riksmöte, oldest first. */
    getPeriods: async (): Promise<Period[]> => (await getMeta()).periods,

    getDefaultPeriod: async (): Promise<Period> => getPeriod((await getMeta()).defaultPeriodId),

    /** Throws for an unknown period. */
    async getRanking(periodId: string): Promise<Ranking> {
      await getPeriod(periodId);
      return load(`ranking/${periodId}.json`, rankingFileSchema);
    },

    /** Pooled attendance per party, best first. Throws for an unknown period. */
    async getParties(periodId: string): Promise<PartyEntry[]> {
      await getPeriod(periodId);
      const entry = (await load("parties.json", partiesFileSchema)).periods.find(
        (p) => p.periodId === periodId,
      );
      if (!entry) throw new Error(`parties.json has no entry for period ${periodId}`);
      return entry.parties;
    },

    getMembers,

    getAllMemberIds: async (): Promise<string[]> => (await getMembers()).map((m) => m.id),

    /** Every riksmöte in the data, oldest first. */
    getRiksmoten,

    getVotes,

    getDocuments,

    /** `null` for an unknown riksmöte or beteckning. */
    async getDocument(
      riksmote: string,
      beteckning: string,
    ): Promise<{ document: DocumentEntry; votes: VoteEntry[] } | null> {
      if (!(await getRiksmoten()).includes(riksmote) || !beteckningSchema.safeParse(beteckning).success) {
        return null;
      }
      const document = (await getDocuments(riksmote)).find((d) => d.beteckning === beteckning);
      if (!document) return null;
      const votes = (await getVotes(riksmote)).filter((v) => v.beteckning === beteckning);
      return { document, votes };
    },

    /** `null` when the id is not in the member index. */
    async getMember(id: string): Promise<MemberDetail | null> {
      if (!memberIdSchema.safeParse(id).success) return null;
      if (!(await getMembers()).some((m) => m.id === id)) return null;

      const member = await load(`members/${id}.json`, memberFileSchema);
      if (member.id !== id) throw new Error(`data/members/${id}.json contains member ${member.id}`);

      // The ballot strings must line up with the vote files and add up to the member's figures.
      for (const { riksmote, votes: codes } of member.ballots) {
        const votes = await getVotes(riksmote);
        if (codes.length !== votes.length) {
          throw new Error(`Member ${id}: ${codes.length} ballots for ${riksmote}, which has ${votes.length} votes`);
        }
        const expected = member.byRiksmote.find((r) => r.riksmote === riksmote)?.counts;
        if (!expected || !sameCounts(tallyBallots(codes), expected)) {
          throw new Error(`Member ${id}: ballots for ${riksmote} disagree with byRiksmote`);
        }
      }
      if (member.ballots.length !== member.byRiksmote.length) {
        throw new Error(`Member ${id}: ballots and byRiksmote list different riksmöten`);
      }
      return member;
    },
  };
}

export function tallyBallots(codes: string): VoteCounts {
  const counts: VoteCounts = { ja: 0, nej: 0, avstar: 0, franvarande: 0 };
  for (const code of codes) {
    if (code === "J") counts.ja++;
    else if (code === "N") counts.nej++;
    else if (code === "A") counts.avstar++;
    else if (code === "F") counts.franvarande++;
  }
  return counts;
}

const sameCounts = (a: VoteCounts, b: VoteCounts) =>
  a.ja === b.ja && a.nej === b.nej && a.avstar === b.avstar && a.franvarande === b.franvarande;

async function readValidated<T>(filePath: string, schema: z.ZodType<T>): Promise<T> {
  let json: unknown;
  try {
    json = JSON.parse(await readFile(filePath, "utf-8"));
  } catch (error) {
    throw new Error(
      `Invalid data file ${filePath}: ${error instanceof Error ? error.message : String(error)}. ` +
        "Run `npm run data:fetch && npm run data:compute`.",
    );
  }
  const result = schema.safeParse(json);
  if (!result.success) {
    throw new Error(`Invalid data file ${filePath}:\n${formatZodError(result.error)}`);
  }
  return result.data;
}

const source = createDataSource(DATA_DIR);

export const {
  getMeta,
  getPeriods,
  getDefaultPeriod,
  getRanking,
  getParties,
  getMembers,
  getAllMemberIds,
  getMember,
  getRiksmoten,
  getVotes,
  getDocuments,
  getDocument,
} = source;
