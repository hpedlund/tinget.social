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
  memberFileSchema,
  memberIdSchema,
  membersIndexFileSchema,
  metaFileSchema,
  partiesFileSchema,
  rankingFileSchema,
  votesFileSchema,
} from "./schemas";
import type {
  MemberDetail,
  MemberIndexEntry,
  Meta,
  PartyEntry,
  Period,
  Ranking,
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

  async function getVoteIndex(): Promise<Map<string, VoteEntry & { riksmote: string }>> {
    const riksmoten = [...new Set((await getMeta()).periods.flatMap((p) => p.riksmoten))];
    const files = await Promise.all(
      riksmoten.map((rm) => load(`votes/${riksmoteSlug(rm)}.json`, votesFileSchema)),
    );
    return new Map(
      files.flatMap((f) => f.votes.map((vote) => [vote.id, { ...vote, riksmote: f.riksmote }] as const)),
    );
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

    /** `null` when the id is not in the member index. */
    async getMember(id: string): Promise<MemberDetail | null> {
      if (!memberIdSchema.safeParse(id).success) return null;
      if (!(await getMembers()).some((m) => m.id === id)) return null;

      const { missedVoteIds, ...member } = await load(`members/${id}.json`, memberFileSchema);
      if (member.id !== id) throw new Error(`data/members/${id}.json contains member ${member.id}`);

      const votes = await getVoteIndex();
      return {
        ...member,
        missedVotes: missedVoteIds.map((voteId) => {
          const vote = votes.get(voteId);
          if (!vote) throw new Error(`Member ${id} missed vote ${voteId}, which is not in data/votes/`);
          return vote;
        }),
      };
    },
  };
}

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
} = source;
